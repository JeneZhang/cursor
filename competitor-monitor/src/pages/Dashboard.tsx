import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { COMPETITORS } from '../data/competitors'
import { UPDATES } from '../data/updates'
import { DEFAULT_QUERY, dashboardStats, filterUpdates } from '../lib/filters'
import { UpdateCard } from '../components/UpdateCard'

export function DashboardPage() {
  const stats = useMemo(() => dashboardStats(), [])
  const [liveNote, setLiveNote] = useState<string | null>(null)
  const highWeek = useMemo(
    () =>
      filterUpdates(UPDATES, {
        ...DEFAULT_QUERY,
        days: 7,
        impact: 'high'
      }),
    []
  )
  const p1 = COMPETITORS.filter((item) => item.priority === 'P1')

  return (
    <div>
      <div className="stat-strip">
        <div className="stat">
          <div className="label">P1 竞品</div>
          <div className="value">{stats.p1Count}</div>
        </div>
        <div className="stat">
          <div className="label">近 7 天动态</div>
          <div className="value">{stats.weekCount}</div>
        </div>
        <div className="stat">
          <div className="label">高影响</div>
          <div className="value">{stats.highCount}</div>
        </div>
        <div className="stat">
          <div className="label">本周有更新的竞品</div>
          <div className="value">{stats.activeCompetitors}</div>
        </div>
      </div>

      <div className="grid-2">
        <section>
          <div className="section-head">
            <h2>本周必须看</h2>
            <Link to="/feed">全部动态 →</Link>
          </div>
          {liveNote ? <div className="notice">{liveNote}</div> : null}
          <div className="feed">
            {highWeek.length === 0 ? (
              <div className="empty">近 7 天没有标记为高影响的 P1 动态。</div>
            ) : (
              highWeek.map((item) => <UpdateCard key={item.id} item={item} />)
            )}
          </div>
        </section>
        <aside>
          <div className="section-head">
            <h2>P1 台账</h2>
            <Link to="/competitors">完整列表 →</Link>
          </div>
          <div className="panel">
            {p1.map((item) => (
              <p key={item.id}>
                <Link to={`/competitors/${item.id}`}>{item.name}</Link>
                <br />
                <span className="muted">
                  {item.vendor} · {item.posture}
                </span>
              </p>
            ))}
            <button type="button" className="btn ghost" onClick={() => setLiveNote('请到「动态」页同步 OpenClaw GitHub Releases。')}>
              如何同步公开源
            </button>
          </div>
        </aside>
      </div>
    </div>
  )
}
