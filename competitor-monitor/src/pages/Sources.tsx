import { Link } from 'react-router-dom'
import { competitorById } from '../data/competitors'
import { SOURCES } from '../data/sources'

export function SourcesPage() {
  return (
    <div>
      <div className="section-head">
        <h2>监控源</h2>
        <span className="muted">P1 先跟官方 changelog / 博客 / GitHub，不跟二手营销文</span>
      </div>
      <div className="source-list">
        {SOURCES.map((source) => {
          const competitor = competitorById[source.competitorId]
          return (
            <div className="source-row" key={source.id}>
              <div>{competitor ? <Link to={`/competitors/${competitor.id}`}>{competitor.name}</Link> : source.competitorId}</div>
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
  )
}
