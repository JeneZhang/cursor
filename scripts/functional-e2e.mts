/**
 * Cloud/headless functional smoke test mirroring SPEC manual checklist.
 * Exercises TodoService the same way the UI/IPC layer does.
 */
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { TodoService } from '../src/main/todoService'
import { parseTodosMarkdown } from '../src/shared/parser/parse'

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(`FAIL: ${message}`)
  }
}

async function main(): Promise<void> {
  const dir = await mkdtemp(join(tmpdir(), 'todo-e2e-'))
  const filePath = join(dir, 'todos.md')
  const service = new TodoService()
  const steps: string[] = []

  try {
    steps.push('1. Create new todos.md')
    await service.create(filePath)
    assert(service.list().length === 0, 'new file should be empty')
    assert((await readFile(filePath, 'utf8')).includes('todo-app-format: v1'), 'format marker')

    steps.push('2. Add two todos')
    const a = await service.add({
      title: 'Buy groceries',
      priority: 'high',
      tags: ['errands'],
      description: 'Milk and eggs'
    })
    const b = await service.add({
      title: 'Write report',
      tags: ['work'],
      description: 'Q3 summary'
    })
    assert(service.list().length === 2, 'two todos after add')
    assert(a.id && b.id && a.id !== b.id, 'unique ids')

    steps.push('3. List / filters')
    assert(service.list({ status: 'open' }).length === 2, 'both open')
    assert(service.list({ priority: 'high' }).length === 1, 'high filter')
    assert(service.list({ tag: 'work' })[0]?.id === b.id, 'tag filter')
    assert(
      service.list({ status: 'open', priority: 'high', tag: 'errands' }).length === 1,
      'AND filters'
    )

    steps.push('4. Search')
    assert(service.search('REPORT').length === 1, 'case-insensitive title search')
    assert(service.search('milk').length === 1, 'description search')
    assert(service.search('errands').length === 1, 'tag search')

    steps.push('5. Show / update')
    const shown = service.get(a.id)
    assert(shown.title === 'Buy groceries', 'get by id')
    const updated = await service.update(a.id, { title: 'Buy groceries updated' })
    assert(updated.title === 'Buy groceries updated', 'title updated')
    assert(updated.updatedAt >= a.updatedAt, 'updatedAt bumped')

    steps.push('6. Done / undone')
    const done = await service.done(a.id)
    assert(done.status === 'done' && !!done.completedAt, 'marked done')
    assert(service.list({ status: 'done' }).length === 1, 'done filter')
    const openAgain = await service.undone(a.id)
    assert(openAgain.status === 'open' && openAgain.completedAt === null, 'undone clears completedAt')

    steps.push('7. Delete')
    await service.delete(a.id)
    assert(service.list().length === 1, 'one todo left')
    assert(service.list()[0]?.id === b.id, 'remaining is report')

    steps.push('8. Hand-edit file then reload')
    const hand = `# Todos

<!-- todo-app-format: v1 -->

## [open] Hand edited (id: hand1, priority: low, tags: manual)
Created: 2026-07-20T12:00:00.000Z
Updated: 2026-07-20T12:00:00.000Z

Edited outside the app.

---
`
    await writeFile(filePath, hand, 'utf8')
    const reloaded = await service.reload()
    assert(reloaded.length === 1, 'reload sees hand edit')
    assert(reloaded[0]?.title === 'Hand edited', 'hand-edited title')

    steps.push('9. Invalid input / malformed file')
    let threw = false
    try {
      await service.add({ title: '   ' })
    } catch {
      threw = true
    }
    assert(threw, 'empty title rejected')

    const badPath = join(dir, 'bad.md')
    await writeFile(badPath, '# Not Todos\n', 'utf8')
    const badService = new TodoService()
    let parseThrew = false
    try {
      await badService.open(badPath)
    } catch (error) {
      parseThrew = true
      assert(error instanceof Error, 'parse error is Error')
    }
    assert(parseThrew, 'malformed file rejected')

    steps.push('10. Round-trip disk format')
    await service.create(join(dir, 'round.md'))
    await service.add({ title: 'Round', priority: 'high', tags: ['x', 'y'], description: 'Body' })
    await service.done(service.list()[0]!.id)
    const disk = await readFile(service.getPath()!, 'utf8')
    const parsed = parseTodosMarkdown(disk)
    assert(parsed[0]?.status === 'done', 'disk has done')
    assert(parsed[0]?.priority === 'high', 'disk has priority')
    assert(disk.includes('Completed:'), 'disk has Completed line')

    console.log('Functional E2E: ALL PASSED')
    for (const step of steps) {
      console.log(`  ✓ ${step}`)
    }
    console.log(`File under test: ${filePath}`)
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
