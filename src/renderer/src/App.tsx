import { useCallback, useEffect, useMemo, useState } from 'react'
import type { AppErrorPayload, CreateTodoInput, Priority, Status, Todo, TodoFilters } from '@shared/types'
import { TodoForm } from './components/TodoForm'
import { TodoDetail } from './components/TodoDetail'
import { TodoList } from './components/TodoList'
import { FiltersBar } from './components/FiltersBar'

function shortError(error: AppErrorPayload): string {
  return error.line ? `${error.message} (line ${error.line})` : error.message
}

export default function App(): React.JSX.Element {
  const [path, setPath] = useState<string | null>(null)
  const [todos, setTodos] = useState<Todo[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [filters, setFilters] = useState<TodoFilters>({})
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [booting, setBooting] = useState(true)

  const clearMessages = useCallback(() => {
    setError(null)
    setInfo(null)
  }, [])

  const applyTodos = useCallback((next: Todo[], nextPath?: string) => {
    if (nextPath !== undefined) {
      setPath(nextPath)
    }
    setTodos(next)
    setSelectedId((current) => {
      if (current && next.some((todo) => todo.id === current)) {
        return current
      }
      return next[0]?.id ?? null
    })
  }, [])

  const refreshVisible = useCallback(
    async (activePath: string | null, activeQuery: string, activeFilters: TodoFilters) => {
      if (!activePath) {
        setTodos([])
        return
      }
      const result =
        activeQuery.trim().length > 0
          ? await window.todoApi.search(activeQuery)
          : await window.todoApi.list(activeFilters)
      if (!result.ok) {
        setError(shortError(result.error))
        return
      }
      applyTodos(result.data)
    },
    [applyTodos]
  )

  useEffect(() => {
    void (async () => {
      clearMessages()
      const last = await window.todoApi.getLastPath()
      if (!last.ok) {
        setError(shortError(last.error))
        setBooting(false)
        return
      }
      if (last.data) {
        const opened = await window.todoApi.openPath(last.data)
        if (opened.ok) {
          applyTodos(opened.data.todos, opened.data.path)
        } else if (opened.error.code !== 'CANCELLED') {
          setInfo(`Could not reopen last file: ${shortError(opened.error)}`)
        }
      }
      setBooting(false)
    })()
  }, [applyTodos, clearMessages])

  useEffect(() => {
    if (booting || !path) return
    void refreshVisible(path, query, filters)
  }, [booting, path, query, filters, refreshVisible])

  const selected = useMemo(
    () => todos.find((todo) => todo.id === selectedId) ?? null,
    [todos, selectedId]
  )

  async function handleCreateFile(): Promise<void> {
    clearMessages()
    const result = await window.todoApi.createFile()
    if (!result.ok) {
      if (result.error.code !== 'CANCELLED') setError(shortError(result.error))
      return
    }
    applyTodos(result.data.todos, result.data.path)
  }

  async function handleOpenFile(): Promise<void> {
    clearMessages()
    const result = await window.todoApi.openFile()
    if (!result.ok) {
      if (result.error.code !== 'CANCELLED') setError(shortError(result.error))
      return
    }
    applyTodos(result.data.todos, result.data.path)
  }

  async function handleReload(): Promise<void> {
    clearMessages()
    const result = await window.todoApi.reload()
    if (!result.ok) {
      setError(shortError(result.error))
      return
    }
    applyTodos(result.data)
    setInfo('Reloaded from disk')
  }

  async function handleAdd(input: CreateTodoInput): Promise<void> {
    clearMessages()
    const result = await window.todoApi.add(input)
    if (!result.ok) {
      setError(shortError(result.error))
      return
    }
    await refreshVisible(path, query, filters)
    setSelectedId(result.data.id)
  }

  async function handleSave(id: string, input: CreateTodoInput): Promise<void> {
    clearMessages()
    const result = await window.todoApi.update(id, input)
    if (!result.ok) {
      setError(shortError(result.error))
      return
    }
    await refreshVisible(path, query, filters)
  }

  async function handleDone(id: string): Promise<void> {
    clearMessages()
    const result = await window.todoApi.done(id)
    if (!result.ok) {
      setError(shortError(result.error))
      return
    }
    await refreshVisible(path, query, filters)
  }

  async function handleUndone(id: string): Promise<void> {
    clearMessages()
    const result = await window.todoApi.undone(id)
    if (!result.ok) {
      setError(shortError(result.error))
      return
    }
    await refreshVisible(path, query, filters)
  }

  async function handleDelete(id: string): Promise<void> {
    clearMessages()
    const result = await window.todoApi.delete(id)
    if (!result.ok) {
      if (result.error.code !== 'CANCELLED') setError(shortError(result.error))
      return
    }
    await refreshVisible(path, query, filters)
  }

  if (booting) {
    return (
      <div className="app">
        <div className="empty">
          <p>Loading…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="app">
      <header className="toolbar">
        <button type="button" className="primary" onClick={() => void handleCreateFile()}>
          New file
        </button>
        <button type="button" onClick={() => void handleOpenFile()}>
          Open…
        </button>
        <button type="button" onClick={() => void handleReload()} disabled={!path}>
          Reload
        </button>
        <div className="path" title={path ?? undefined}>
          {path ?? 'No file open'}
        </div>
      </header>

      {error ? <div className="banner error">{error}</div> : null}
      {info ? <div className="banner warn">{info}</div> : null}

      {!path ? (
        <div className="empty">
          <h1>Markdown Todo</h1>
          <p>Create or open a todos.md file to get started.</p>
          <div className="empty-actions">
            <button type="button" className="primary" onClick={() => void handleCreateFile()}>
              Create todos.md
            </button>
            <button type="button" onClick={() => void handleOpenFile()}>
              Open existing
            </button>
          </div>
        </div>
      ) : (
        <>
          <FiltersBar
            query={query}
            filters={filters}
            onQueryChange={setQuery}
            onFiltersChange={(next) => setFilters(next)}
          />
          <div className="main">
            <section className="panel">
              <TodoForm onSubmit={(input) => void handleAdd(input)} />
              <TodoList todos={todos} selectedId={selectedId} onSelect={setSelectedId} />
            </section>
            <section className="panel">
              <TodoDetail
                todo={selected}
                onSave={(input) => {
                  if (selected) void handleSave(selected.id, input)
                }}
                onDone={() => {
                  if (selected) void handleDone(selected.id)
                }}
                onUndone={() => {
                  if (selected) void handleUndone(selected.id)
                }}
                onDelete={() => {
                  if (selected) void handleDelete(selected.id)
                }}
              />
            </section>
          </div>
        </>
      )}
    </div>
  )
}

export type { Priority, Status }
