import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { TodoService } from '../src/main/todoService'
import {
  createTodo,
  filterTodos,
  markDone,
  removeTodo,
  replaceTodo,
  searchTodos,
  updateTodo
} from '../src/shared/todoLogic'

const tempDirs: string[] = []

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })))
})

async function makeTempDir(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'markdown-todo-'))
  tempDirs.push(dir)
  return dir
}

describe('todoLogic', () => {
  it('creates, updates, filters, searches, and deletes', () => {
    const a = createTodo({
      title: 'Buy groceries',
      priority: 'high',
      tags: ['Errands', 'Home base'],
      description: 'Milk and eggs'
    })
    expect(a.tags).toEqual(['errands', 'home-base'])
    expect(a.status).toBe('open')

    const b = createTodo({ title: 'Write report', tags: ['work'] })
    const updated = updateTodo(b, { title: 'Write final report', priority: 'low' })
    expect(updated.title).toBe('Write final report')
    expect(updated.priority).toBe('low')
    expect(updated.updatedAt >= b.updatedAt).toBe(true)

    const list = [a, updated]
    expect(filterTodos(list, { status: 'open', priority: 'high' })).toHaveLength(1)
    expect(filterTodos(list, { tag: 'work' })[0].id).toBe(updated.id)
    expect(searchTodos(list, 'GROCERIES')[0].id).toBe(a.id)
    expect(searchTodos(list, 'milk')[0].id).toBe(a.id)
    expect(searchTodos(list, 'work')[0].id).toBe(updated.id)

    const replaced = replaceTodo(list, markDone(a))
    expect(replaced.find((t) => t.id === a.id)?.status).toBe('done')
    expect(removeTodo(replaced, a.id)).toHaveLength(1)
  })

  it('rejects empty titles', () => {
    expect(() => createTodo({ title: '   ' })).toThrow(/Title cannot be empty/)
  })
})

describe('TodoService', () => {
  it('persists add/list/update/done/delete/search against a file', async () => {
    const dir = await makeTempDir()
    const filePath = join(dir, 'todos.md')
    const service = new TodoService()

    await service.create(filePath)
    expect(service.list()).toEqual([])

    const created = await service.add({
      title: 'Task A',
      priority: 'high',
      tags: ['test'],
      description: 'Alpha'
    })
    await service.add({ title: 'Task B', description: 'Second task' })

    expect(service.list({ status: 'open' })).toHaveLength(2)
    expect(service.list({ priority: 'high' })).toHaveLength(1)
    expect(service.search('second')).toHaveLength(1)

    await service.update(created.id, { title: 'Task A updated' })
    expect(service.get(created.id).title).toBe('Task A updated')

    await service.done(created.id)
    expect(service.list({ status: 'done' })).toHaveLength(1)
    expect(service.get(created.id).completedAt).toBeTruthy()

    await service.undone(created.id)
    expect(service.get(created.id).status).toBe('open')
    expect(service.get(created.id).completedAt).toBeNull()

    await service.delete(created.id)
    expect(service.list()).toHaveLength(1)

    const disk = await readFile(filePath, 'utf8')
    expect(disk).toContain('# Todos')
    expect(disk).toContain('Task B')
    expect(disk).not.toContain('Task A updated')
  })

  it('opens hand-edited files', async () => {
    const dir = await makeTempDir()
    await mkdir(dir, { recursive: true })
    const filePath = join(dir, 'todos.md')
    const sample = await readFile(join(__dirname, 'fixtures/sample.todos.md'), 'utf8')
    await writeFile(filePath, sample, 'utf8')
    const service = new TodoService()
    const todos = await service.open(filePath)
    expect(todos).toHaveLength(2)
    expect(service.search('spec')[0].title).toBe('Write spec')
  })
})
