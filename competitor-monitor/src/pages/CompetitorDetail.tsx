import { Link, useParams } from 'react-router-dom'
import { competitorById } from '../data/competitors'
import { UPDATES } from '../data/updates'
import { UpdateCard } from '../components/UpdateCard'

export function CompetitorDetailPage() {
  const { id = '' } = useParams()
  const competitor = competitorById[id]
  const updates = UPDATES.filter((item) => item.competitorId === id)

  if (!competitor) {
    return (
      <div className="empty">
        <h1>没有这个竞品</h1>
        <p>
          <Link to="/competitors">返回列表</Link>
        </p>
      </div>
    )
  }

  return (
    <div className="main">
      <aside className="panel">
        <div className="detail">
          <div className="meta-row">
            <span className={`badge ${competitor.priority.toLowerCase()}`}>{competitor.priority}</span>
            <span className="badge">{competitor.region === 'cn' ? '国内' : '国际'}</span>
            <span className="muted">{competitor.vendor}</span>
          </div>
          <h2>{competitor.name}</h2>
          <p>{competitor.summary}</p>
          <p className="muted">{competitor.threatNotes}</p>
          <div className="detail-actions">
            <a className="nav-link" href={competitor.website} target="_blank" rel="noreferrer">
              官网
            </a>
            <a className="nav-link" href={competitor.watchUrl} target="_blank" rel="noreferrer">
              {competitor.watchLabel}
            </a>
            <Link className="nav-link" to="/competitors">
              返回列表
            </Link>
          </div>
        </div>
      </aside>
      <section className="panel">
        <div className="panel-head">
          <h2>相关动态</h2>
          <span className="muted">{updates.length} 条</span>
        </div>
        {updates.length === 0 ? (
          <div className="empty">还没有收录该竞品的公开更新。</div>
        ) : (
          <div className="update-list">
            {updates.map((item) => (
              <UpdateCard key={item.id} item={item} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
