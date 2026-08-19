import { Link } from 'react-router-dom'
import { competitorById } from '../data/competitors'
import { IMPACT_LABEL, KIND_LABEL, formatDate } from '../lib/format'
import type { UpdateItem } from '../types'

export function UpdateCard({ item }: { item: UpdateItem }) {
  const competitor = competitorById[item.competitorId]
  return (
    <article className="update-card">
      <div className="when">{formatDate(item.publishedAt)}</div>
      <div>
        <div className="meta-row">
          {competitor ? (
            <Link className="chip" to={`/competitors/${competitor.id}`}>
              {competitor.name}
            </Link>
          ) : null}
          <span className="chip">{KIND_LABEL[item.kind]}</span>
          <span className={`chip ${item.impact}`}>影响 {IMPACT_LABEL[item.impact]}</span>
        </div>
        <h3>
          <a href={item.sourceUrl} target="_blank" rel="noreferrer">
            {item.title}
          </a>
        </h3>
        <p>{item.summary}</p>
        <p className="why">
          <strong>为何要紧</strong>
          {item.whyItMatters}
        </p>
        <p className="muted">
          来源：{item.sourceLabel} ·{' '}
          <a href={item.sourceUrl} target="_blank" rel="noreferrer">
            打开原文
          </a>
        </p>
      </div>
    </article>
  )
}
