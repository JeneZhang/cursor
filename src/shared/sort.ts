import type { Priority, Status, Todo } from './types'

const PRIORITY_ORDER: Record<Priority, number> = {
  high: 0,
  medium: 1,
  low: 2
}

const STATUS_ORDER: Record<Status, number> = {
  open: 0,
  done: 1
}

export function sortTodos(todos: Todo[]): Todo[] {
  return [...todos].sort((a, b) => {
    const statusDiff = STATUS_ORDER[a.status] - STATUS_ORDER[b.status]
    if (statusDiff !== 0) return statusDiff
    const priorityDiff = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]
    if (priorityDiff !== 0) return priorityDiff
    return a.createdAt.localeCompare(b.createdAt)
  })
}
