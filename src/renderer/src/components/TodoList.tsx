import type { Todo } from '@shared/types'

interface Props {
  todos: Todo[]
  selectedId: string | null
  onSelect: (id: string) => void
}

function shortId(id: string): string {
  return id.slice(0, 8)
}

export function TodoList({ todos, selectedId, onSelect }: Props): React.JSX.Element {
  if (todos.length === 0) {
    return <div className="empty">No todos match the current view.</div>
  }

  return (
    <ul className="todo-list">
      {todos.map((todo) => (
        <li key={todo.id}>
          <button
            type="button"
            className={`todo-row${selectedId === todo.id ? ' selected' : ''}`}
            onClick={() => onSelect(todo.id)}
          >
            <span className="id" title={todo.id}>
              {shortId(todo.id)}
            </span>
            <span className={`badge ${todo.status}`}>{todo.status}</span>
            <span className={`badge ${todo.priority}`}>{todo.priority}</span>
            <span>{todo.title}</span>
          </button>
        </li>
      ))}
    </ul>
  )
}
