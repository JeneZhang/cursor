import { Link } from 'react-router-dom'
import { competitorById } from '../data/competitors'
import { IMPACT_LABEL, KIND_LABEL, formatDate } from '../lib/format'
import { useCatalog } from '../lib/catalog-context'
import type { UpdateItem } from '../types'

export function UpdateCard({ item }: { item: UpdateItem }) {
  const { byId } = useCatalog()
  const competitor = byId[item.competitorId] ?? competitorById[item.competitorId]
  return (
    <article className="update-row">
      <div className="meta-row">
        <span className="when">{formatDate(item.publishedAt)}</span>
        {competitor ? (
          <Link className="badge" to={`/competitors/${competitor.id}`}>
            {competitor.name}
          </Link>
        ) : null}
        <span className="badge">{KIND_LABEL[item.kind]}</span>
        <span className={`badge ${item.impact}`}>影响 {IMPACT_LABEL[item.impact]}</span>
      </div>
      <h3>
        <a href={item.sourceUrl} target="_blank" rel="noreferrer">
          {item.title}
        </a>
      </h3>
      <p>{item.summary}</p>
      <p>
        为何要紧：{item.whyItMatters}{' '}
        <a href={item.sourceUrl} target="_blank" rel="noreferrer">
          原文
        </a>
      </p>
    </article>
  )
}
