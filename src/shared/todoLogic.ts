import { randomUUID } from 'node:crypto'
import { NotFoundError } from '../shared/errors'
import { sortTodos } from '../shared/sort'
import type {
  CreateTodoInput,
  Priority,
  Status,
  Todo,
  TodoFilters,
  UpdateTodoInput
} from '../shared/types'
import { normalizeTags, normalizeTitle, parsePriority } from '../shared/validation'

function nowIso(): string {
  return new Date().toISOString()
}

export function createTodo(input: CreateTodoInput): Todo {
  const timestamp = nowIso()
  return {
    id: randomUUID(),
    title: normalizeTitle(input.title),
    description: input.description?.trim() ?? '',
    status: 'open',
    priority: parsePriority(input.priority, 'medium'),
    tags: normalizeTags(input.tags),
    createdAt: timestamp,
    updatedAt: timestamp,
    completedAt: null
  }
}

export function updateTodo(todo: Todo, input: UpdateTodoInput): Todo {
  const next: Todo = {
    ...todo,
    title: input.title !== undefined ? normalizeTitle(input.title) : todo.title,
    description: input.description !== undefined ? input.description : todo.description,
    priority: input.priority !== undefined ? parsePriority(input.priority) : todo.priority,
    tags: input.tags !== undefined ? normalizeTags(input.tags) : todo.tags,
    updatedAt: nowIso()
  }
  return next
}

export function markDone(todo: Todo): Todo {
  if (todo.status === 'done' && todo.completedAt) {
    return todo
  }
  const timestamp = nowIso()
  return {
    ...todo,
    status: 'done',
    completedAt: timestamp,
    updatedAt: timestamp
  }
}

export function markUndone(todo: Todo): Todo {
  if (todo.status === 'open' && todo.completedAt === null) {
    return todo
  }
  return {
    ...todo,
    status: 'open',
    completedAt: null,
    updatedAt: nowIso()
  }
}

export function filterTodos(todos: Todo[], filters: TodoFilters = {}): Todo[] {
  return sortTodos(
    todos.filter((todo) => {
      if (filters.status && todo.status !== filters.status) return false
      if (filters.priority && todo.priority !== filters.priority) return false
      if (filters.tag) {
        const tag = filters.tag.trim().toLowerCase().replace(/\s+/g, '-')
        if (!todo.tags.includes(tag)) return false
      }
      return true
    })
  )
}

export function searchTodos(todos: Todo[], query: string): Todo[] {
  const q = query.trim().toLowerCase()
  if (!q) {
    return sortTodos(todos)
  }
  return sortTodos(
    todos.filter((todo) => {
      if (todo.title.toLowerCase().includes(q)) return true
      if (todo.description.toLowerCase().includes(q)) return true
      if (todo.tags.some((tag) => tag.includes(q))) return true
      return false
    })
  )
}

export function requireTodo(todos: Todo[], id: string): Todo {
  const found = todos.find((todo) => todo.id === id)
  if (!found) {
    throw new NotFoundError(id)
  }
  return found
}

export function replaceTodo(todos: Todo[], next: Todo): Todo[] {
  const index = todos.findIndex((todo) => todo.id === next.id)
  if (index === -1) {
    throw new NotFoundError(next.id)
  }
  const copy = [...todos]
  copy[index] = next
  return copy
}

export function removeTodo(todos: Todo[], id: string): Todo[] {
  const next = todos.filter((todo) => todo.id !== id)
  if (next.length === todos.length) {
    throw new NotFoundError(id)
  }
  return next
}

export type { Priority, Status }
