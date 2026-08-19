import { describe, expect, it } from 'vitest'
import { DEFAULT_QUERY, filterUpdates } from './filters'
import type { UpdateItem } from '../types'

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
    summary: '不应出现在默认 P1 列表',
    whyItMatters: '降噪',
    sourceLabel: 'test',
    sourceUrl: 'https://example.com'
  }
]

describe('filterUpdates', () => {
  it('defaults to P1 competitors only', () => {
    const result = filterUpdates(sample, { ...DEFAULT_QUERY, days: 'all' })
    expect(result.map((item) => item.id)).toEqual(['a'])
  })

  it('can include P2 when priority is all', () => {
    const result = filterUpdates(sample, { ...DEFAULT_QUERY, priority: 'all', days: 'all' })
    expect(result.map((item) => item.id)).toEqual(['a', 'b'])
  })

  it('filters by search text', () => {
    const result = filterUpdates(sample, { ...DEFAULT_QUERY, days: 'all', q: '浏览器' })
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('a')
  })
})
