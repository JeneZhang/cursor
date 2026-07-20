export type Status = 'open' | 'done'
export type Priority = 'low' | 'medium' | 'high'

export interface Todo {
  id: string
  title: string
  description: string
  status: Status
  priority: Priority
  tags: string[]
  createdAt: string
  updatedAt: string
  completedAt: string | null
}

export interface TodoFilters {
  status?: Status
  tag?: string
  priority?: Priority
}

export interface CreateTodoInput {
  title: string
  description?: string
  priority?: Priority
  tags?: string[]
}

export interface UpdateTodoInput {
  title?: string
  description?: string
  priority?: Priority
  tags?: string[]
}

export interface TodoListItem {
  id: string
  status: Status
  priority: Priority
  title: string
  tags: string[]
}

export type AppErrorCode =
  | 'VALIDATION'
  | 'NOT_FOUND'
  | 'PARSE'
  | 'DUPLICATE_ID'
  | 'NO_FILE'
  | 'CANCELLED'
  | 'UNKNOWN'

export interface AppErrorPayload {
  code: AppErrorCode
  message: string
  line?: number
}
