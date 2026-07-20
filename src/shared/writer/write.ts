import type { Todo } from '../types'

function formatHeading(todo: Todo): string {
  const parts = [`id: ${todo.id}`]
  if (todo.priority !== 'medium') {
    parts.push(`priority: ${todo.priority}`)
  }
  if (todo.tags.length > 0) {
    parts.push(`tags: ${todo.tags.join(', ')}`)
  }
  return `## [${todo.status}] ${todo.title} (${parts.join(', ')})`
}

function formatTodo(todo: Todo): string {
  const lines = [
    formatHeading(todo),
    `Created: ${todo.createdAt}`,
    `Updated: ${todo.updatedAt}`
  ]
  if (todo.status === 'done' && todo.completedAt) {
    lines.push(`Completed: ${todo.completedAt}`)
  }
  lines.push('')
  if (todo.description) {
    lines.push(todo.description)
    lines.push('')
  }
  return lines.join('\n').replace(/\n+$/, '\n')
}

export function writeTodosMarkdown(todos: Todo[]): string {
  const header = `# Todos\n\n<!-- todo-app-format: v1 -->\n`
  if (todos.length === 0) {
    return header
  }
  const body = todos.map(formatTodo).join('\n---\n\n')
  return `${header}\n${body}\n---\n`
}
