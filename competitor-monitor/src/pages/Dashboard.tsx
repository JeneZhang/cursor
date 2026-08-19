import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { UPDATES } from '../data/updates'
import { DEFAULT_QUERY, dashboardStats, filterUpdates } from '../lib/filters'
import { useCatalog } from '../lib/catalog-context'
import { UpdateCard } from '../components/UpdateCard'

export function DashboardPage() {
  const { competitors } = useCatalog()
  const stats = useMemo(() => dashboardStats(competitors, UPDATES), [competitors])
  const highWeek = useMemo(
    () =>
      filterUpdates(
        UPDATES,
        {
          ...DEFAULT_QUERY,
          days: 7,
          impact: 'high'
        },
        competitors
      ),
    [competitors]
  )
  const focus = competitors.filter((item) => item.priority === 'P0' || item.priority === 'P1')

  return (
    <>
      <div className="page-pad" style={{ paddingBottom: 0 }}>
        <div className="stats">
          <div className="stat">
            <div className="label">P0</div>
            <div className="value">{stats.p0Count}</div>
          </div>
          <div className="stat">
            <div className="label">P1</div>
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
        </div>
      </div>
      <div className="main">
        <section className="panel">
          <div className="panel-head">
            <h2>本周高影响</h2>
            <Link to="/feed">全部动态</Link>
          </div>
          {highWeek.length === 0 ? (
            <div className="empty">近 7 天没有高影响的 P0/P1 动态。</div>
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
            <h2>P0 / P1 竞品</h2>
            <Link to="/competitors">编辑列表</Link>
          </div>
          <div className="competitor-list">
            {focus.map((item) => (
              <div className="competitor-row" key={item.id}>
                <div className="meta-row">
                  <Link to={`/competitors/${item.id}`}>{item.name}</Link>
                  <span className={`badge ${item.priority.toLowerCase()}`}>{item.priority}</span>
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
