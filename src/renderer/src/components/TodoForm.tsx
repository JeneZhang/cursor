import { useState } from 'react'
import type { CreateTodoInput, Priority } from '@shared/types'

interface Props {
  onSubmit: (input: CreateTodoInput) => void
}

export function TodoForm({ onSubmit }: Props): React.JSX.Element {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState<Priority>('medium')
  const [tags, setTags] = useState('')

  function submit(event: React.FormEvent): void {
    event.preventDefault()
    onSubmit({
      title,
      description,
      priority,
      tags: tags
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean)
    })
    setTitle('')
    setDescription('')
    setPriority('medium')
    setTags('')
  }

  return (
    <form className="form" onSubmit={submit}>
      <strong>Add todo</strong>
      <label>
        Title
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Buy groceries"
          required
        />
      </label>
      <label>
        Description
        <textarea
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Optional markdown"
        />
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
        <input
          value={tags}
          onChange={(event) => setTags(event.target.value)}
          placeholder="errands, home"
        />
      </label>
      <div className="form-actions">
        <button type="submit" className="primary">
          Add
        </button>
      </div>
    </form>
  )
}
