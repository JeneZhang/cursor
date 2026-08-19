import type { Competitor, CompetitorDraft, Priority, Region } from '../types'

export const STORAGE_KEY = 'competitor-monitor.competitors.v1'

export const PRIORITY_ORDER: Record<Priority, number> = {
  P0: 0,
  P1: 1,
  P2: 2
}

const EMPTY_DRAFT: CompetitorDraft = {
  name: '',
  vendor: '',
  priority: 'P1',
  region: 'cn',
  posture: '',
  summary: '',
  website: '',
  watchUrl: '',
  watchLabel: '',
  threatNotes: ''
}

export function emptyDraft(): CompetitorDraft {
  return { ...EMPTY_DRAFT }
}

export function isPriority(value: string): value is Priority {
  return value === 'P0' || value === 'P1' || value === 'P2'
}

export function isRegion(value: string): value is Region {
  return value === 'cn' || value === 'global'
}

export function slugify(name: string): string {
  const ascii = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return ascii
}

export function uniqueId(name: string, existing: string[]): string {
  const base = slugify(name) || `c-${Date.now().toString(36)}`
  if (!existing.includes(base)) return base
  let suffix = 2
  while (existing.includes(`${base}-${suffix}`)) {
    suffix += 1
  }
  return `${base}-${suffix}`
}

export function sortCompetitors(items: Competitor[]): Competitor[] {
  return items.slice().sort((a, b) => {
    const byPriority = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]
    if (byPriority !== 0) return byPriority
    return a.name.localeCompare(b.name, 'zh')
  })
}

export function parseCompetitor(value: unknown): Competitor | null {
  if (!value || typeof value !== 'object') return null
  const item = value as Record<string, unknown>
  if (typeof item.id !== 'string' || item.id.trim().length === 0) return null
  if (typeof item.name !== 'string' || item.name.trim().length === 0) return null
  if (typeof item.priority !== 'string' || !isPriority(item.priority)) return null
  const region = typeof item.region === 'string' && isRegion(item.region) ? item.region : 'global'
  return {
    id: item.id.trim(),
    name: item.name.trim(),
    vendor: typeof item.vendor === 'string' ? item.vendor : '',
    priority: item.priority,
    region,
    posture: typeof item.posture === 'string' ? item.posture : '',
    summary: typeof item.summary === 'string' ? item.summary : '',
    website: typeof item.website === 'string' ? item.website : '',
    watchUrl: typeof item.watchUrl === 'string' ? item.watchUrl : '',
    watchLabel: typeof item.watchLabel === 'string' ? item.watchLabel : '',
    threatNotes: typeof item.threatNotes === 'string' ? item.threatNotes : ''
  }
}

export function parseCompetitors(raw: unknown, fallback: Competitor[]): Competitor[] {
  if (!Array.isArray(raw)) return fallback
  const items: Competitor[] = []
  const seen = new Set<string>()
  for (const entry of raw) {
    const item = parseCompetitor(entry)
    if (!item || seen.has(item.id)) continue
    seen.add(item.id)
    items.push(item)
  }
  return items.length > 0 ? sortCompetitors(items) : fallback
}

export function loadCompetitors(seed: Competitor[]): Competitor[] {
  if (typeof localStorage === 'undefined') return sortCompetitors(seed)
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return sortCompetitors(seed)
    return parseCompetitors(JSON.parse(raw) as unknown, seed)
  } catch {
    return sortCompetitors(seed)
  }
}

export function saveCompetitors(items: Competitor[]): void {
  if (typeof localStorage === 'undefined') return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
}

export function validateDraft(draft: CompetitorDraft): string | null {
  if (draft.name.trim().length === 0) return '名称必填'
  if (!isPriority(draft.priority)) return '优先级必须是 P0、P1 或 P2'
  return null
}

export function applyDraft(
  current: Competitor[],
  id: string | null,
  draft: CompetitorDraft
): { items: Competitor[]; id: string } {
  const error = validateDraft(draft)
  if (error) throw new Error(error)
  const cleaned: CompetitorDraft = {
    ...draft,
    name: draft.name.trim(),
    vendor: draft.vendor.trim(),
    posture: draft.posture.trim(),
    summary: draft.summary.trim(),
    website: draft.website.trim(),
    watchUrl: draft.watchUrl.trim(),
    watchLabel: draft.watchLabel.trim(),
    threatNotes: draft.threatNotes.trim()
  }
  if (id) {
    if (!current.some((item) => item.id === id)) throw new Error('没有这个竞品')
    return {
      id,
      items: sortCompetitors(current.map((item) => (item.id === id ? { ...item, ...cleaned, id } : item)))
    }
  }
  const nextId = uniqueId(cleaned.name, current.map((item) => item.id))
  return {
    id: nextId,
    items: sortCompetitors([...current, { ...cleaned, id: nextId }])
  }
}
