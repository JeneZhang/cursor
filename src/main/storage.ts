import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { app } from 'electron'
import { AppError } from '../shared/errors'
import { emptyTodosTemplate, parseTodosMarkdown } from '../shared/parser/parse'
import type { Todo } from '../shared/types'
import { writeTodosMarkdown } from '../shared/writer/write'

const PREFS_FILE = 'prefs.json'

interface Prefs {
  lastPath: string | null
}

async function prefsPath(): Promise<string> {
  const dir = app.getPath('userData')
  await mkdir(dir, { recursive: true })
  return join(dir, PREFS_FILE)
}

export async function loadPrefs(): Promise<Prefs> {
  try {
    const raw = await readFile(await prefsPath(), 'utf8')
    const parsed = JSON.parse(raw) as Prefs
    return { lastPath: parsed.lastPath ?? null }
  } catch {
    return { lastPath: null }
  }
}

export async function savePrefs(prefs: Prefs): Promise<void> {
  await writeFile(await prefsPath(), JSON.stringify(prefs, null, 2), 'utf8')
}

export async function loadTodos(filePath: string): Promise<Todo[]> {
  let markdown: string
  try {
    markdown = await readFile(filePath, 'utf8')
  } catch (error) {
    throw new AppError(
      'UNKNOWN',
      `Unable to read file: ${filePath}${error instanceof Error ? ` (${error.message})` : ''}`
    )
  }
  return parseTodosMarkdown(markdown)
}

export async function saveTodos(filePath: string, todos: Todo[]): Promise<void> {
  const markdown = writeTodosMarkdown(todos)
  const dir = dirname(filePath)
  await mkdir(dir, { recursive: true })
  const tempPath = `${filePath}.${process.pid}.${Date.now()}.tmp`
  await writeFile(tempPath, markdown, 'utf8')
  await rename(tempPath, filePath)
}

export async function createEmptyTodosFile(filePath: string): Promise<void> {
  const dir = dirname(filePath)
  await mkdir(dir, { recursive: true })
  const tempPath = `${filePath}.${process.pid}.${Date.now()}.tmp`
  await writeFile(tempPath, emptyTodosTemplate(), 'utf8')
  await rename(tempPath, filePath)
}
