import { COMPETITORS } from '../data/competitors'
import { UPDATES } from '../data/updates'
import { inLastDays } from './format'
import type { Impact, Priority, UpdateItem, UpdateKind } from '../types'

export interface FeedQuery {
  priority: Priority | 'all'
  competitorId: string | 'all'
  kind: UpdateKind | 'all'
  impact: Impact | 'all'
  days: number | 'all'
  q: string
}

export const DEFAULT_QUERY: FeedQuery = {
  priority: 'P1',
  competitorId: 'all',
  kind: 'all',
  impact: 'all',
  days: 30,
  q: ''
}

export function allowedCompetitorIds(priority: Priority | 'all'): Set<string> {
  if (priority === 'all') return new Set(COMPETITORS.map((item) => item.id))
  return new Set(COMPETITORS.filter((item) => item.priority === priority).map((item) => item.id))
}

export function filterUpdates(items: UpdateItem[], query: FeedQuery): UpdateItem[] {
  const allowed = allowedCompetitorIds(query.priority)
  const needle = query.q.trim().toLowerCase()

  return items
    .filter((item) => allowed.has(item.competitorId))
    .filter((item) => query.competitorId === 'all' || item.competitorId === query.competitorId)
    .filter((item) => query.kind === 'all' || item.kind === query.kind)
    .filter((item) => query.impact === 'all' || item.impact === query.impact)
    .filter((item) => query.days === 'all' || inLastDays(item.publishedAt, query.days))
    .filter((item) => {
      if (!needle) return true
      return [item.title, item.summary, item.whyItMatters].join('\n').toLowerCase().includes(needle)
    })
    .slice()
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt) || a.title.localeCompare(b.title, 'zh'))
}

export function dashboardStats(now = new Date()) {
  const p1Ids = allowedCompetitorIds('P1')
  const p1Updates = UPDATES.filter((item) => p1Ids.has(item.competitorId))
  const week = p1Updates.filter((item) => inLastDays(item.publishedAt, 7, now))
  const high = week.filter((item) => item.impact === 'high')
  const active = new Set(week.map((item) => item.competitorId)).size

  return {
    p1Count: p1Ids.size,
    weekCount: week.length,
    highCount: high.length,
    activeCompetitors: active
  }
}
