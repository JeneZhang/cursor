import { describe, expect, it } from 'vitest'
import { applyDraft, parseCompetitors, uniqueId, validateDraft } from './catalog'
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
})
