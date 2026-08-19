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
      setStatus(`已同步 OpenClaw GitHub ${live.length} 条。其它竞品仍使用人工核对过的条目。`)
    } catch (error) {
      setStatus(error instanceof Error ? error.message : '同步失败')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <div className="section-head">
        <h2>动态流</h2>
        <button type="button" className="btn" onClick={() => void syncGithub()} disabled={busy}>
          {busy ? '同步中…' : '同步 OpenClaw GitHub'}
        </button>
      </div>
      {status ? <div className="notice">{status}</div> : null}
      <FilterBar query={query} onChange={setQuery} />
      <p className="muted">
        {visible.length} 条结果
        {query.priority === 'P1' ? ' · 已隐藏 P2' : ''}
      </p>
      <div className="feed">
        {visible.length === 0 ? (
          <div className="empty">没有匹配的动态。试试放宽时间或竞品筛选。</div>
        ) : (
          visible.map((item) => <UpdateCard key={item.id} item={item} />)
        )}
      </div>
    </div>
  )
}
