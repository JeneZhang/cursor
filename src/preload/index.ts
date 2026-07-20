import { contextBridge, ipcRenderer } from 'electron'
import type {
  AppErrorPayload,
  CreateTodoInput,
  Todo,
  TodoFilters,
  UpdateTodoInput
} from '../shared/types'

type Result<T> = { ok: true; data: T } | { ok: false; error: AppErrorPayload }

const api = {
  getPath: (): Promise<Result<string | null>> => ipcRenderer.invoke('todos:getPath'),
  createFile: (): Promise<Result<{ path: string; todos: Todo[] }>> =>
    ipcRenderer.invoke('todos:create'),
  openFile: (): Promise<Result<{ path: string; todos: Todo[] }>> => ipcRenderer.invoke('todos:open'),
  openPath: (filePath: string): Promise<Result<{ path: string; todos: Todo[] }>> =>
    ipcRenderer.invoke('todos:openPath', filePath),
  list: (filters?: TodoFilters): Promise<Result<Todo[]>> =>
    ipcRenderer.invoke('todos:list', filters ?? {}),
  get: (id: string): Promise<Result<Todo>> => ipcRenderer.invoke('todos:get', id),
  add: (input: CreateTodoInput): Promise<Result<Todo>> => ipcRenderer.invoke('todos:add', input),
  update: (id: string, input: UpdateTodoInput): Promise<Result<Todo>> =>
    ipcRenderer.invoke('todos:update', id, input),
  done: (id: string): Promise<Result<Todo>> => ipcRenderer.invoke('todos:done', id),
  undone: (id: string): Promise<Result<Todo>> => ipcRenderer.invoke('todos:undone', id),
  delete: (id: string): Promise<Result<void>> => ipcRenderer.invoke('todos:delete', id),
  search: (query: string): Promise<Result<Todo[]>> => ipcRenderer.invoke('todos:search', query),
  reload: (): Promise<Result<Todo[]>> => ipcRenderer.invoke('todos:reload'),
  getLastPath: (): Promise<Result<string | null>> => ipcRenderer.invoke('prefs:getLastPath')
}

export type TodoApi = typeof api

contextBridge.exposeInMainWorld('todoApi', api)
