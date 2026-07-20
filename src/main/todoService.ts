import { AppError } from '../shared/errors'
import {
  createTodo,
  filterTodos,
  markDone,
  markUndone,
  removeTodo,
  replaceTodo,
  requireTodo,
  searchTodos,
  updateTodo
} from '../shared/todoLogic'
import type { CreateTodoInput, Todo, TodoFilters, UpdateTodoInput } from '../shared/types'
import { createEmptyTodosFile, loadTodos, saveTodos } from './storage'

export class TodoService {
  private filePath: string | null = null
  private todos: Todo[] = []

  getPath(): string | null {
    return this.filePath
  }

  getTodos(): Todo[] {
    return this.todos
  }

  async open(filePath: string): Promise<Todo[]> {
    this.todos = await loadTodos(filePath)
    this.filePath = filePath
    return this.todos
  }

  async create(filePath: string): Promise<Todo[]> {
    await createEmptyTodosFile(filePath)
    this.todos = []
    this.filePath = filePath
    return this.todos
  }

  private ensureFile(): string {
    if (!this.filePath) {
      throw new AppError('NO_FILE', 'No todos file is open')
    }
    return this.filePath
  }

  private async persist(): Promise<void> {
    await saveTodos(this.ensureFile(), this.todos)
  }

  list(filters: TodoFilters = {}): Todo[] {
    this.ensureFile()
    return filterTodos(this.todos, filters)
  }

  get(id: string): Todo {
    this.ensureFile()
    return requireTodo(this.todos, id)
  }

  async add(input: CreateTodoInput): Promise<Todo> {
    this.ensureFile()
    const todo = createTodo(input)
    this.todos = [...this.todos, todo]
    await this.persist()
    return todo
  }

  async update(id: string, input: UpdateTodoInput): Promise<Todo> {
    this.ensureFile()
    const current = requireTodo(this.todos, id)
    const next = updateTodo(current, input)
    this.todos = replaceTodo(this.todos, next)
    await this.persist()
    return next
  }

  async done(id: string): Promise<Todo> {
    this.ensureFile()
    const next = markDone(requireTodo(this.todos, id))
    this.todos = replaceTodo(this.todos, next)
    await this.persist()
    return next
  }

  async undone(id: string): Promise<Todo> {
    this.ensureFile()
    const next = markUndone(requireTodo(this.todos, id))
    this.todos = replaceTodo(this.todos, next)
    await this.persist()
    return next
  }

  async delete(id: string): Promise<void> {
    this.ensureFile()
    this.todos = removeTodo(this.todos, id)
    await this.persist()
  }

  search(query: string): Todo[] {
    this.ensureFile()
    return searchTodos(this.todos, query)
  }

  async reload(): Promise<Todo[]> {
    const path = this.ensureFile()
    this.todos = await loadTodos(path)
    return this.todos
  }
}
