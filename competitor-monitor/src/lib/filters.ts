import { COMPETITORS } from '../data/competitors'
import { UPDATES } from '../data/updates'
import { inLastDays } from './format'
import type { Competitor, Impact, PriorityFilter, UpdateItem, UpdateKind } from '../types'

export interface FeedQuery {
  priority: PriorityFilter
  competitorId: string | 'all'
  kind: UpdateKind | 'all'
  impact: Impact | 'all'
  days: number | 'all'
  q: string
}

export const DEFAULT_QUERY: FeedQuery = {
  priority: 'focus',
  competitorId: 'all',
  kind: 'all',
  impact: 'all',
  days: 30,
  q: ''
}

export function matchesPriority(item: Competitor, priority: PriorityFilter): boolean {
  if (priority === 'all') return true
  if (priority === 'focus') return item.priority === 'P0' || item.priority === 'P1'
  return item.priority === priority
}

export function allowedCompetitorIds(competitors: Competitor[], priority: PriorityFilter): Set<string> {
  return new Set(competitors.filter((item) => matchesPriority(item, priority)).map((item) => item.id))
}

export function filterUpdates(
  items: UpdateItem[],
  query: FeedQuery,
  competitors: Competitor[] = COMPETITORS
): UpdateItem[] {
  const allowed = allowedCompetitorIds(competitors, query.priority)
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

export function dashboardStats(
  competitors: Competitor[] = COMPETITORS,
  updates: UpdateItem[] = UPDATES,
  now = new Date()
) {
  const focusIds = allowedCompetitorIds(competitors, 'focus')
  const focusUpdates = updates.filter((item) => focusIds.has(item.competitorId))
  const week = focusUpdates.filter((item) => inLastDays(item.publishedAt, 7, now))
  const high = week.filter((item) => item.impact === 'high')
  const active = new Set(week.map((item) => item.competitorId)).size

  return {
    p0Count: competitors.filter((item) => item.priority === 'P0').length,
    p1Count: competitors.filter((item) => item.priority === 'P1').length,
    p2Count: competitors.filter((item) => item.priority === 'P2').length,
    weekCount: week.length,
    highCount: high.length,
    activeCompetitors: active
  }
}
