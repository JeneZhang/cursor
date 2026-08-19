import { describe, expect, it } from 'vitest'
import { DEFAULT_QUERY, filterUpdates } from './filters'
import type { Competitor, UpdateItem } from '../types'

function competitor(id: string, priority: Competitor['priority']): Competitor {
  return {
    id,
    name: id,
    vendor: '',
    priority,
    region: 'global',
    posture: '',
    summary: '',
    website: '',
    watchUrl: '',
    watchLabel: '',
    threatNotes: ''
  }
}

const catalog = [competitor('kimi-work', 'P1'), competitor('manus', 'P2'), competitor('hot', 'P0')]

const sample: UpdateItem[] = [
  {
    id: 'a',
    competitorId: 'kimi-work',
    publishedAt: '2026-08-19',
    kind: 'feature',
    impact: 'high',
    title: '内置浏览器',
    summary: 'Agent 可操作浏览器',
    whyItMatters: '对齐浏览器控制',
    sourceLabel: 'test',
    sourceUrl: 'https://example.com'
  },
  {
    id: 'b',
    competitorId: 'manus',
    publishedAt: '2026-08-18',
    kind: 'product',
    impact: 'low',
    title: 'P2 产品更新',
    summary: '不应出现在默认 P0/P1 列表',
    whyItMatters: '降噪',
    sourceLabel: 'test',
    sourceUrl: 'https://example.com'
  },
  {
    id: 'c',
    competitorId: 'hot',
    publishedAt: '2026-08-18',
    kind: 'product',
    impact: 'high',
    title: 'P0 必盯更新',
    summary: '最高优先级',
    whyItMatters: '立刻看',
    sourceLabel: 'test',
    sourceUrl: 'https://example.com'
  }
]

describe('filterUpdates', () => {
  it('defaults to P0 and P1 competitors', () => {
    const result = filterUpdates(sample, { ...DEFAULT_QUERY, days: 'all' }, catalog)
    expect(result.map((item) => item.id)).toEqual(['a', 'c'])
  })

  it('can include P2 when priority is all', () => {
    const result = filterUpdates(sample, { ...DEFAULT_QUERY, priority: 'all', days: 'all' }, catalog)
    expect(result.map((item) => item.id)).toEqual(['a', 'c', 'b'])
  })

  it('can filter to P0 only', () => {
    const result = filterUpdates(sample, { ...DEFAULT_QUERY, priority: 'P0', days: 'all' }, catalog)
    expect(result.map((item) => item.id)).toEqual(['c'])
  })

  it('filters by search text', () => {
    const result = filterUpdates(sample, { ...DEFAULT_QUERY, days: 'all', q: '浏览器' }, catalog)
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('a')
  })
})
