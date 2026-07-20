import { DuplicateIdError, ParseError } from '../errors'
import type { Priority, Status, Todo } from '../types'
import { normalizeTags, parsePriority, parseStatus } from '../validation'

const FORMAT_MARKER = '<!-- todo-app-format: v1 -->'
const HEADING_RE =
  /^## \[(open|done)\] (.+?) \(id: ([^,)]+)(?:, priority: (low|medium|high))?(?:, tags: ([^)]+))?\)$/

function lineNumberAt(markdown: string, index: number): number {
  return markdown.slice(0, index).split('\n').length
}

function parseMetadata(
  lines: string[],
  blockStartLine: number
): {
  createdAt: string
  updatedAt: string
  completedAt: string | null
  bodyStart: number
} {
  let createdAt: string | undefined
  let updatedAt: string | undefined
  let completedAt: string | null = null
  let i = 0

  while (i < lines.length) {
    const line = lines[i]
    if (!line) {
      i += 1
      continue
    }
    if (line.startsWith('Created: ')) {
      createdAt = line.slice('Created: '.length).trim()
      i += 1
      continue
    }
    if (line.startsWith('Updated: ')) {
      updatedAt = line.slice('Updated: '.length).trim()
      i += 1
      continue
    }
    if (line.startsWith('Completed: ')) {
      completedAt = line.slice('Completed: '.length).trim()
      i += 1
      continue
    }
    break
  }

  if (!createdAt) {
    throw new ParseError(`Missing Created metadata`, blockStartLine + 1)
  }
  if (!updatedAt) {
    throw new ParseError(`Missing Updated metadata`, blockStartLine + 1)
  }

  return { createdAt, updatedAt, completedAt, bodyStart: i }
}

function parseBlock(block: string, absoluteStartIndex: number, fullMarkdown: string): Todo | null {
  const trimmed = block.trim()
  if (!trimmed) {
    return null
  }

  const lines = trimmed.split('\n')
  const heading = lines[0]
  if (!heading) {
    return null
  }

  const headingLine = lineNumberAt(fullMarkdown, absoluteStartIndex + block.indexOf(heading))
  const match = HEADING_RE.exec(heading)
  if (!match) {
    throw new ParseError(`Malformed todo heading: ${heading}`, headingLine)
  }

  const status = parseStatus(match[1]) as Status
  const title = match[2].trim()
  const id = match[3].trim()
  const priority = parsePriority(match[4], 'medium') as Priority
  const tags = normalizeTags(match[5])

  if (!title) {
    throw new ParseError('Todo title cannot be empty', headingLine)
  }
  if (!id) {
    throw new ParseError('Todo id cannot be empty', headingLine)
  }

  const meta = parseMetadata(lines.slice(1), headingLine)
  if (status === 'done' && !meta.completedAt) {
    throw new ParseError('Completed metadata required for done todos', headingLine + 1)
  }
  if (status === 'open') {
    meta.completedAt = null
  }

  const description = lines
    .slice(1 + meta.bodyStart)
    .join('\n')
    .replace(/^\n+/, '')
    .replace(/\n+$/, '')

  return {
    id,
    title,
    description,
    status,
    priority,
    tags,
    createdAt: meta.createdAt,
    updatedAt: meta.updatedAt,
    completedAt: meta.completedAt
  }
}

export function parseTodosMarkdown(markdown: string): Todo[] {
  const normalized = markdown.replace(/\r\n/g, '\n')
  const lines = normalized.split('\n')

  if (lines[0]?.trim() !== '# Todos') {
    throw new ParseError('File must start with "# Todos"', 1)
  }

  const markerIndex = lines.findIndex((line) => line.trim() === FORMAT_MARKER)
  if (markerIndex === -1) {
    throw new ParseError(`Missing format marker ${FORMAT_MARKER}`, 2)
  }

  const bodyStartOffset = lines.slice(0, markerIndex + 1).join('\n').length + 1
  const body = normalized.slice(bodyStartOffset)
  const rawBlocks = body.split(/\n---\n?/)

  const todos: Todo[] = []
  const seen = new Map<string, number>()
  let cursor = bodyStartOffset

  for (const rawBlock of rawBlocks) {
    const blockStart = cursor
    const todo = parseBlock(rawBlock, blockStart, normalized)
    cursor += rawBlock.length + '\n---\n'.length

    if (!todo) {
      continue
    }

    const existingLine = seen.get(todo.id)
    if (existingLine !== undefined) {
      throw new DuplicateIdError(todo.id, lineNumberAt(normalized, blockStart))
    }
    seen.set(todo.id, lineNumberAt(normalized, blockStart))
    todos.push(todo)
  }

  return todos
}

export function emptyTodosTemplate(): string {
  return `# Todos\n\n${FORMAT_MARKER}\n`
}
