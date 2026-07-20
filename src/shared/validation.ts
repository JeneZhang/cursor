import { ValidationError } from './errors'
import type { Priority, Status } from './types'

const PRIORITIES: readonly Priority[] = ['low', 'medium', 'high']
const STATUSES: readonly Status[] = ['open', 'done']

export function normalizeTitle(title: string): string {
  const trimmed = title.trim()
  if (!trimmed) {
    throw new ValidationError('Title cannot be empty')
  }
  if (trimmed.length > 200) {
    throw new ValidationError('Title must be at most 200 characters')
  }
  return trimmed
}

export function parsePriority(value: string | undefined, fallback: Priority = 'medium'): Priority {
  if (value === undefined || value === '') {
    return fallback
  }
  if (!PRIORITIES.includes(value as Priority)) {
    throw new ValidationError(`Invalid priority: ${value}. Expected low, medium, or high.`)
  }
  return value as Priority
}

export function parseStatus(value: string | undefined, fallback: Status = 'open'): Status {
  if (value === undefined || value === '') {
    return fallback
  }
  if (!STATUSES.includes(value as Status)) {
    throw new ValidationError(`Invalid status: ${value}. Expected open or done.`)
  }
  return value as Status
}

export function normalizeTag(tag: string): string {
  return tag.trim().toLowerCase().replace(/\s+/g, '-')
}

export function normalizeTags(input: string[] | string | undefined): string[] {
  if (input === undefined || input === '') {
    return []
  }
  const raw = Array.isArray(input) ? input : input.split(',')
  const tags = raw.map(normalizeTag).filter((tag) => tag.length > 0)
  return [...new Set(tags)]
}

export function isPriority(value: string): value is Priority {
  return PRIORITIES.includes(value as Priority)
}

export function isStatus(value: string): value is Status {
  return STATUSES.includes(value as Status)
}
