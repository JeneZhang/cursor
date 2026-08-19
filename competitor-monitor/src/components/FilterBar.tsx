import { COMPETITORS } from '../data/competitors'
import { KIND_LABEL } from '../lib/format'
import { allowedCompetitorIds, type FeedQuery } from '../lib/filters'
import type { Impact, Priority, UpdateKind } from '../types'

interface Props {
  query: FeedQuery
  onChange: (next: FeedQuery) => void
}

export function FilterBar({ query, onChange }: Props) {
  const competitors = COMPETITORS.filter((item) => allowedCompetitorIds(query.priority).has(item.id))

  return (
    <div className="filters">
      <select
        value={query.priority}
        onChange={(event) =>
          onChange({ ...query, priority: event.target.value as Priority | 'all', competitorId: 'all' })
        }
      >
        <option value="P1">只看 P1</option>
        <option value="all">P1 + P2</option>
      </select>
      <select
        value={query.competitorId}
        onChange={(event) => onChange({ ...query, competitorId: event.target.value })}
      >
        <option value="all">全部竞品</option>
        {competitors.map((item) => (
          <option key={item.id} value={item.id}>
            {item.name}
          </option>
        ))}
      </select>
      <select
        value={query.kind}
        onChange={(event) => onChange({ ...query, kind: event.target.value as UpdateKind | 'all' })}
      >
        <option value="all">全部类型</option>
        {Object.entries(KIND_LABEL).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
      <select
        value={query.impact}
        onChange={(event) => onChange({ ...query, impact: event.target.value as Impact | 'all' })}
      >
        <option value="all">全部影响</option>
        <option value="high">高</option>
        <option value="medium">中</option>
        <option value="low">低</option>
      </select>
      <select
        value={query.days}
        onChange={(event) =>
          onChange({
            ...query,
            days: event.target.value === 'all' ? 'all' : Number(event.target.value)
          })
        }
      >
        <option value={7}>近 7 天</option>
        <option value={30}>近 30 天</option>
        <option value="all">全部时间</option>
      </select>
      <input
        value={query.q}
        placeholder="搜索标题 / 摘要 / 影响"
        onChange={(event) => onChange({ ...query, q: event.target.value })}
      />
    </div>
  )
}
