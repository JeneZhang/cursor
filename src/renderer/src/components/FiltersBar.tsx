import type { Priority, Status, TodoFilters } from '@shared/types'

interface Props {
  query: string
  filters: TodoFilters
  onQueryChange: (query: string) => void
  onFiltersChange: (filters: TodoFilters) => void
}

export function FiltersBar({ query, filters, onQueryChange, onFiltersChange }: Props): React.JSX.Element {
  return (
    <div className="filters">
      <input
        type="search"
        placeholder="Search title, description, tags…"
        value={query}
        onChange={(event) => onQueryChange(event.target.value)}
        aria-label="Search"
        style={{ minWidth: 240, flex: 1 }}
      />
      <select
        value={filters.status ?? ''}
        onChange={(event) => {
          const value = event.target.value
          onFiltersChange({
            ...filters,
            status: value ? (value as Status) : undefined
          })
        }}
        aria-label="Filter by status"
        disabled={query.trim().length > 0}
      >
        <option value="">All statuses</option>
        <option value="open">Open</option>
        <option value="done">Done</option>
      </select>
      <select
        value={filters.priority ?? ''}
        onChange={(event) => {
          const value = event.target.value
          onFiltersChange({
            ...filters,
            priority: value ? (value as Priority) : undefined
          })
        }}
        aria-label="Filter by priority"
        disabled={query.trim().length > 0}
      >
        <option value="">All priorities</option>
        <option value="high">High</option>
        <option value="medium">Medium</option>
        <option value="low">Low</option>
      </select>
      <input
        type="text"
        placeholder="Filter tag"
        value={filters.tag ?? ''}
        onChange={(event) =>
          onFiltersChange({
            ...filters,
            tag: event.target.value || undefined
          })
        }
        aria-label="Filter by tag"
        disabled={query.trim().length > 0}
      />
    </div>
  )
}
