import { useEffect, useState } from 'react'
import type { CreateTodoInput, Priority, Todo } from '@shared/types'

interface Props {
  todo: Todo | null
  onSave: (input: CreateTodoInput) => void
  onDone: () => void
  onUndone: () => void
  onDelete: () => void
}

export function TodoDetail({ todo, onSave, onDone, onUndone, onDelete }: Props): React.JSX.Element {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState<Priority>('medium')
  const [tags, setTags] = useState('')

  useEffect(() => {
    if (!todo) {
      setTitle('')
      setDescription('')
      setPriority('medium')
      setTags('')
      return
    }
    setTitle(todo.title)
    setDescription(todo.description)
    setPriority(todo.priority)
    setTags(todo.tags.join(', '))
  }, [todo])

  if (!todo) {
    return <div className="empty">Select a todo to view details.</div>
  }

  function submit(event: React.FormEvent): void {
    event.preventDefault()
    onSave({
      title,
      description,
      priority,
      tags: tags
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean)
    })
  }

  return (
    <form className="detail" onSubmit={submit}>
      <strong>Details</strong>
      <label>
        Title
        <input value={title} onChange={(event) => setTitle(event.target.value)} required />
      </label>
      <label>
        Description
        <textarea value={description} onChange={(event) => setDescription(event.target.value)} />
      </label>
      <label>
        Priority
        <select
          value={priority}
          onChange={(event) => setPriority(event.target.value as Priority)}
        >
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
      </label>
      <label>
        Tags
        <input value={tags} onChange={(event) => setTags(event.target.value)} />
      </label>

      <div className="meta">
        <div>ID: {todo.id}</div>
        <div>Status: {todo.status}</div>
        <div>Created: {todo.createdAt}</div>
        <div>Updated: {todo.updatedAt}</div>
        <div>Completed: {todo.completedAt ?? '—'}</div>
      </div>

      {todo.tags.length > 0 ? (
        <div className="tags">
          {todo.tags.map((tag) => (
            <span className="tag" key={tag}>
              {tag}
            </span>
          ))}
        </div>
      ) : null}

      <div className="detail-actions">
        <button type="submit" className="primary">
          Save
        </button>
        {todo.status === 'open' ? (
          <button type="button" onClick={onDone}>
            Mark done
          </button>
        ) : (
          <button type="button" onClick={onUndone}>
            Mark open
          </button>
        )}
        <button type="button" className="danger" onClick={onDelete}>
          Delete
        </button>
      </div>
    </form>
  )
}
