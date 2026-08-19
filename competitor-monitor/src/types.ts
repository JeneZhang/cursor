export type Priority = 'P1' | 'P2'
export type Region = 'cn' | 'global'
export type Impact = 'high' | 'medium' | 'low'

export type UpdateKind =
  | 'product'
  | 'feature'
  | 'model'
  | 'channel'
  | 'ecosystem'
  | 'pricing'
  | 'enterprise'
  | 'security'

export interface Competitor {
  id: string
  name: string
  vendor: string
  priority: Priority
  region: Region
  posture: string
  summary: string
  website: string
  watchUrl: string
  watchLabel: string
  threatNotes: string
}

export interface UpdateItem {
  id: string
  competitorId: string
  publishedAt: string
  kind: UpdateKind
  impact: Impact
  title: string
  summary: string
  whyItMatters: string
  sourceLabel: string
  sourceUrl: string
}

export interface WatchSource {
  id: string
  competitorId: string
  label: string
  url: string
  cadence: string
}
