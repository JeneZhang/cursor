import { Link } from 'react-router-dom'
import { SOURCES } from '../data/sources'
import { useCatalog } from '../lib/catalog-context'

export function SourcesPage() {
  const { byId } = useCatalog()
  return (
    <>
      <div className="filters">
        <span className="muted">只跟官方 changelog、博客和 GitHub Releases</span>
      </div>
      <div className="panel fill">
        <div className="source-list">
          {SOURCES.map((source) => {
            const competitor = byId[source.competitorId]
            return (
              <div className="source-row" key={source.id}>
                <div>
                  {competitor ? <Link to={`/competitors/${competitor.id}`}>{competitor.name}</Link> : source.competitorId}
                </div>
                <div>
                  {source.label}
                  <div className="muted">{source.cadence}</div>
                </div>
                <a href={source.url} target="_blank" rel="noreferrer">
                  打开
                </a>
              </div>
            )
          })}
        </div>
      </div>
    </>
  )
}
