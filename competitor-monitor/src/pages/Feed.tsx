import { useMemo, useState } from 'react'
import { UPDATES } from '../data/updates'
import { FilterBar } from '../components/FilterBar'
import { UpdateCard } from '../components/UpdateCard'
import { DEFAULT_QUERY, filterUpdates, type FeedQuery } from '../lib/filters'
import { fetchOpenClawUpdates, mergeLiveUpdates } from '../lib/live'
import type { UpdateItem } from '../types'

export function FeedPage() {
  const [query, setQuery] = useState<FeedQuery>(DEFAULT_QUERY)
  const [items, setItems] = useState<UpdateItem[]>(UPDATES)
  const [status, setStatus] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const visible = useMemo(() => filterUpdates(items, query), [items, query])

  async function syncGithub() {
    setBusy(true)
    setStatus(null)
    try {
      const live = await fetchOpenClawUpdates()
      setItems(mergeLiveUpdates(UPDATES, live))
      setStatus(`已同步 OpenClaw GitHub ${live.length} 条。其它竞品仍使用已核对条目。`)
    } catch (error) {
      setStatus(error instanceof Error ? error.message : '同步失败')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <FilterBar
        query={query}
        onChange={setQuery}
        action={
          <button type="button" className="primary" onClick={() => void syncGithub()} disabled={busy}>
            {busy ? '同步中…' : '同步 OpenClaw GitHub'}
          </button>
        }
      />
      {status ? <div className="banner warn">{status}</div> : null}
      <div className="panel fill">
        {visible.length === 0 ? (
          <div className="empty">
            <p>没有匹配的动态。试试放宽筛选。</p>
          </div>
        ) : (
          <div className="update-list">
            {visible.map((item) => (
              <UpdateCard key={item.id} item={item} />
            ))}
          </div>
        )}
      </div>
    </>
  )
}
