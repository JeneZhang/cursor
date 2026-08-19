import { Link, useParams } from 'react-router-dom'
import { CompetitorMark } from '../components/CompetitorMark'
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
        没有这个竞品。
        <div>
          <Link to="/competitors">返回台账</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="layout-detail">
      <aside className="panel">
        <p className="muted">
          {competitor.priority} · {competitor.region === 'cn' ? '国内' : '国际'} · {competitor.vendor}
        </p>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', margin: '8px 0 12px' }}>
          <CompetitorMark id={competitor.id} />
          <h2 style={{ fontFamily: 'var(--serif)', margin: 0 }}>{competitor.name}</h2>
        </div>
        <p>{competitor.summary}</p>
        <p>
          <strong>威胁判断</strong>
          <br />
          {competitor.threatNotes}
        </p>
        <p>
          <a href={competitor.website} target="_blank" rel="noreferrer">
            官网
          </a>
          {' · '}
          <a href={competitor.watchUrl} target="_blank" rel="noreferrer">
            {competitor.watchLabel}
          </a>
        </p>
        <Link to="/competitors">← 全部竞品</Link>
      </aside>
      <section>
        <div className="section-head">
          <h2>相关动态</h2>
          <span className="muted">{updates.length} 条</span>
        </div>
        <div className="feed">
          {updates.length === 0 ? (
            <div className="empty">P1 周期内还没有收录该竞品的公开更新。</div>
          ) : (
            updates.map((item) => <UpdateCard key={item.id} item={item} />)
          )}
        </div>
      </section>
    </div>
  )
}
