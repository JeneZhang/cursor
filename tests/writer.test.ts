import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { parseTodosMarkdown } from '../src/shared/parser/parse'
import { createTodo, markDone, markUndone } from '../src/shared/todoLogic'
import type { Todo } from '../src/shared/types'
import { writeTodosMarkdown } from '../src/shared/writer/write'

const sampleMarkdown = readFileSync(join(__dirname, 'fixtures/sample.todos.md'), 'utf8')

describe('writer', () => {
  it('round-trips model to markdown and back', () => {
    const original = parseTodosMarkdown(sampleMarkdown)
    const written = writeTodosMarkdown(original)
    const again = parseTodosMarkdown(written)
    expect(again).toEqual(original)
  })

  it('omits medium priority and empty tags', () => {
    const todo: Todo = {
      id: 'x',
      title: 'Plain',
      description: '',
      status: 'open',
      priority: 'medium',
      tags: [],
      createdAt: '2026-07-20T10:00:00.000Z',
      updatedAt: '2026-07-20T10:00:00.000Z',
      completedAt: null
    }
    const md = writeTodosMarkdown([todo])
    expect(md).toContain('## [open] Plain (id: x)')
    expect(md).not.toContain('priority:')
    expect(md).not.toContain('tags:')
  })

  it('updates completedAt for done and undone', () => {
    const open = createTodo({ title: 'Task' })
    const done = markDone(open)
    expect(done.status).toBe('done')
    expect(done.completedAt).toBeTruthy()
    const undone = markUndone(done)
    expect(undone.status).toBe('open')
    expect(undone.completedAt).toBeNull()
    expect(writeTodosMarkdown([done])).toContain('Completed:')
    expect(writeTodosMarkdown([undone])).not.toContain('Completed:')
  })
})
