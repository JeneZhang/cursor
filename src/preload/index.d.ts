import type { TodoApi } from './index'

declare global {
  interface Window {
    todoApi: TodoApi
  }
}

export {}
