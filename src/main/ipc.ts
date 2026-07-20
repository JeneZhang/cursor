import { BrowserWindow, dialog, ipcMain } from 'electron'
import { AppError, toAppErrorPayload } from '../shared/errors'
import type {
  AppErrorPayload,
  CreateTodoInput,
  Todo,
  TodoFilters,
  UpdateTodoInput
} from '../shared/types'
import { loadPrefs, savePrefs } from './storage'
import { TodoService } from './todoService'

type Result<T> = { ok: true; data: T } | { ok: false; error: AppErrorPayload }

function ok<T>(data: T): Result<T> {
  return { ok: true, data }
}

function fail(error: unknown): Result<never> {
  return { ok: false, error: toAppErrorPayload(error) }
}

export function registerIpc(service: TodoService): void {
  ipcMain.handle('todos:getPath', async (): Promise<Result<string | null>> => {
    try {
      return ok(service.getPath())
    } catch (error) {
      return fail(error)
    }
  })

  ipcMain.handle('todos:create', async (event): Promise<Result<{ path: string; todos: Todo[] }>> => {
    try {
      const win = BrowserWindow.fromWebContents(event.sender)
      const result = await dialog.showSaveDialog(win ?? undefined, {
        title: 'Create todos.md',
        defaultPath: 'todos.md',
        filters: [{ name: 'Markdown', extensions: ['md'] }]
      })
      if (result.canceled || !result.filePath) {
        throw new AppError('CANCELLED', 'Create cancelled')
      }
      const path = result.filePath.endsWith('.md') ? result.filePath : `${result.filePath}.md`
      const todos = await service.create(path)
      await savePrefs({ lastPath: path })
      return ok({ path, todos })
    } catch (error) {
      return fail(error)
    }
  })

  ipcMain.handle('todos:open', async (event): Promise<Result<{ path: string; todos: Todo[] }>> => {
    try {
      const win = BrowserWindow.fromWebContents(event.sender)
      const result = await dialog.showOpenDialog(win ?? undefined, {
        title: 'Open todos.md',
        properties: ['openFile'],
        filters: [{ name: 'Markdown', extensions: ['md'] }]
      })
      if (result.canceled || result.filePaths.length === 0) {
        throw new AppError('CANCELLED', 'Open cancelled')
      }
      const path = result.filePaths[0]
      const todos = await service.open(path)
      await savePrefs({ lastPath: path })
      return ok({ path, todos })
    } catch (error) {
      return fail(error)
    }
  })

  ipcMain.handle(
    'todos:openPath',
    async (_event, filePath: string): Promise<Result<{ path: string; todos: Todo[] }>> => {
      try {
        const todos = await service.open(filePath)
        await savePrefs({ lastPath: filePath })
        return ok({ path: filePath, todos })
      } catch (error) {
        return fail(error)
      }
    }
  )

  ipcMain.handle('todos:list', async (_event, filters: TodoFilters = {}): Promise<Result<Todo[]>> => {
    try {
      return ok(service.list(filters))
    } catch (error) {
      return fail(error)
    }
  })

  ipcMain.handle('todos:get', async (_event, id: string): Promise<Result<Todo>> => {
    try {
      return ok(service.get(id))
    } catch (error) {
      return fail(error)
    }
  })

  ipcMain.handle('todos:add', async (_event, input: CreateTodoInput): Promise<Result<Todo>> => {
    try {
      return ok(await service.add(input))
    } catch (error) {
      return fail(error)
    }
  })

  ipcMain.handle(
    'todos:update',
    async (_event, id: string, input: UpdateTodoInput): Promise<Result<Todo>> => {
      try {
        return ok(await service.update(id, input))
      } catch (error) {
        return fail(error)
      }
    }
  )

  ipcMain.handle('todos:done', async (_event, id: string): Promise<Result<Todo>> => {
    try {
      return ok(await service.done(id))
    } catch (error) {
      return fail(error)
    }
  })

  ipcMain.handle('todos:undone', async (_event, id: string): Promise<Result<Todo>> => {
    try {
      return ok(await service.undone(id))
    } catch (error) {
      return fail(error)
    }
  })

  ipcMain.handle('todos:delete', async (event, id: string): Promise<Result<void>> => {
    try {
      const win = BrowserWindow.fromWebContents(event.sender)
      const result = await dialog.showMessageBox(win ?? undefined, {
        type: 'warning',
        buttons: ['Cancel', 'Delete'],
        defaultId: 0,
        cancelId: 0,
        title: 'Delete todo',
        message: 'Delete this todo? This cannot be undone.'
      })
      if (result.response !== 1) {
        throw new AppError('CANCELLED', 'Delete cancelled')
      }
      await service.delete(id)
      return ok(undefined)
    } catch (error) {
      return fail(error)
    }
  })

  ipcMain.handle('todos:search', async (_event, query: string): Promise<Result<Todo[]>> => {
    try {
      return ok(service.search(query))
    } catch (error) {
      return fail(error)
    }
  })

  ipcMain.handle('todos:reload', async (): Promise<Result<Todo[]>> => {
    try {
      return ok(await service.reload())
    } catch (error) {
      return fail(error)
    }
  })

  ipcMain.handle('prefs:getLastPath', async (): Promise<Result<string | null>> => {
    try {
      const prefs = await loadPrefs()
      return ok(prefs.lastPath)
    } catch (error) {
      return fail(error)
    }
  })
}
