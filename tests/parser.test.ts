import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { DuplicateIdError, ParseError } from '../src/shared/errors'
import { parseTodosMarkdown } from '../src/shared/parser/parse'

const sampleMarkdown = readFileSync(join(__dirname, 'fixtures/sample.todos.md'), 'utf8')

describe('parser', () => {
  it('parses multiple todos with optional fields', () => {
    const todos = parseTodosMarkdown(sampleMarkdown)
    expect(todos).toHaveLength(2)
    expect(todos[0]).toMatchObject({
      id: 'abc123',
      title: 'Buy groceries',
      status: 'open',
      priority: 'high',
      tags: ['errands', 'home'],
      completedAt: null
    })
    expect(todos[1]).toMatchObject({
      id: 'def456',
      title: 'Write spec',
      status: 'done',
      priority: 'medium',
      tags: ['work'],
      completedAt: '2026-07-20T08:30:00.000Z'
    })
    expect(todos[0].description).toContain('Milk')
  })

  it('handles empty template', () => {
    const todos = parseTodosMarkdown('# Todos\n\n<!-- todo-app-format: v1 -->\n')
    expect(todos).toEqual([])
  })

  it('fails on malformed heading', () => {
    const bad = `# Todos

<!-- todo-app-format: v1 -->

## Broken heading
Created: 2026-07-20T10:00:00.000Z
Updated: 2026-07-20T10:00:00.000Z

---`
    expect(() => parseTodosMarkdown(bad)).toThrow(ParseError)
  })

  it('fails on missing metadata', () => {
    const bad = `# Todos

<!-- todo-app-format: v1 -->

## [open] Task (id: x1)
Updated: 2026-07-20T10:00:00.000Z

---`
    expect(() => parseTodosMarkdown(bad)).toThrow(ParseError)
  })

  it('detects duplicate ids', () => {
    const bad = `# Todos

<!-- todo-app-format: v1 -->

## [open] One (id: same)
Created: 2026-07-20T10:00:00.000Z
Updated: 2026-07-20T10:00:00.000Z

---

## [open] Two (id: same)
Created: 2026-07-20T11:00:00.000Z
Updated: 2026-07-20T11:00:00.000Z

---`
    expect(() => parseTodosMarkdown(bad)).toThrow(DuplicateIdError)
  })
})
