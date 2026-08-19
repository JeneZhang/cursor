import { competitorById } from '../data/competitors'

export function CompetitorMark({ id }: { id: string }) {
  const name = competitorById[id]?.name ?? '?'
  return <span className="mark">{name.slice(0, 1)}</span>
}
