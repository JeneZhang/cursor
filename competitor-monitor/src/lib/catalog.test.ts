import { describe, expect, it } from 'vitest'
import { applyDraft, parseCompetitors, uniqueId, validateDraft, mergeStoredWithSeed } from './catalog'
import type { Competitor, CompetitorDraft } from '../types'

const seed: Competitor[] = [
  {
    id: 'kimi-work',
    name: 'Kimi Work',
    vendor: 'Moonshot',
    priority: 'P1',
    region: 'cn',
    posture: 'desktop',
    summary: '',
    website: '',
    watchUrl: '',
    watchLabel: '',
    threatNotes: ''
  }
]

const draft: CompetitorDraft = {
  name: 'New Agent',
  vendor: 'Acme',
  priority: 'P0',
  region: 'global',
  posture: 'cloud',
  summary: 'summary',
  website: 'https://example.com',
  watchUrl: 'https://example.com/blog',
  watchLabel: 'Blog',
  threatNotes: 'watch closely'
}

describe('catalog', () => {
  it('requires a name', () => {
    expect(validateDraft({ ...draft, name: '  ' })).toBe('名称必填')
  })

  it('adds a competitor with a unique id and P0 priority', () => {
    const result = applyDraft(seed, null, draft)
    expect(result.id).toBe('new-agent')
    expect(result.items[0]).toMatchObject({ name: 'New Agent', priority: 'P0' })
  })

  it('edits an existing competitor including priority', () => {
    const result = applyDraft(seed, 'kimi-work', { ...draft, name: 'Kimi Work', priority: 'P2' })
    expect(result.id).toBe('kimi-work')
    expect(result.items[0].priority).toBe('P2')
    expect(result.items[0].vendor).toBe('Acme')
  })

  it('avoids colliding ids', () => {
    expect(uniqueId('Kimi Work', ['kimi-work'])).toBe('kimi-work-2')
  })

  it('drops invalid stored rows and keeps P0', () => {
    const parsed = parseCompetitors(
      [{ id: 'x', name: 'X', priority: 'P0' }, { name: 'no-id', priority: 'P1' }, { id: 'y', name: 'Y', priority: 'P9' }],
      seed
    )
    expect(parsed).toHaveLength(1)
    expect(parsed[0].priority).toBe('P0')
  })

  it('fills empty ChatGPT fields from seed without duplicating', () => {
    const chatgptSeed: Competitor = {
      ...seed[0],
      id: 'chatgpt',
      name: 'ChatGPT 桌面客户端',
      vendor: 'OpenAI',
      posture: 'Chat + Work + Codex',
      summary: 'unified desktop app',
      website: 'https://chatgpt.com/download',
      watchUrl: 'https://help.openai.com/en/articles/6825453-release-notes',
      watchLabel: 'ChatGPT Release Notes',
      threatNotes: 'default entry'
    }
    const stored: Competitor = {
      ...chatgptSeed,
      id: 'chatgpt',
      name: 'chatgpt桌面客户端',
      vendor: '',
      posture: '',
      summary: '',
      website: '',
      watchUrl: '',
      watchLabel: '',
      threatNotes: ''
    }
    const merged = mergeStoredWithSeed([stored], [chatgptSeed, seed[0]])
    const chatgpt = merged.find((item) => item.id === 'chatgpt')
    expect(chatgpt?.vendor).toBe('OpenAI')
    expect(chatgpt?.name).toBe('chatgpt桌面客户端')
    expect(merged.filter((item) => item.id === 'chatgpt')).toHaveLength(1)
  })
})
