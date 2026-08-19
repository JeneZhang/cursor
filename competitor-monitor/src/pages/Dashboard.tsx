import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { COMPETITORS } from '../data/competitors'
import { UPDATES } from '../data/updates'
import { DEFAULT_QUERY, dashboardStats, filterUpdates } from '../lib/filters'
import { UpdateCard } from '../components/UpdateCard'

export function DashboardPage() {
  const stats = useMemo(() => dashboardStats(), [])
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
    <>
      <div className="page-pad" style={{ paddingBottom: 0 }}>
        <div className="stats">
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
            <div className="label">本周有更新</div>
            <div className="value">{stats.activeCompetitors}</div>
          </div>
        </div>
      </div>
      <div className="main">
        <section className="panel">
          <div className="panel-head">
            <h2>本周高影响</h2>
            <Link to="/feed">全部动态</Link>
          </div>
          {highWeek.length === 0 ? (
            <div className="empty">近 7 天没有高影响的 P1 动态。</div>
          ) : (
            <div className="update-list">
              {highWeek.map((item) => (
                <UpdateCard key={item.id} item={item} />
              ))}
            </div>
          )}
        </section>
        <section className="panel">
          <div className="panel-head">
            <h2>P1 竞品</h2>
            <Link to="/competitors">完整列表</Link>
          </div>
          <div className="competitor-list">
            {p1.map((item) => (
              <div className="competitor-row" key={item.id}>
                <div className="meta-row">
                  <Link to={`/competitors/${item.id}`}>{item.name}</Link>
                  <span className="badge p1">{item.priority}</span>
                </div>
                <p className="muted">
                  {item.vendor} · {item.posture}
                </p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </>
  )
}
