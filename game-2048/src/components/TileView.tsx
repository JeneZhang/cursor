import type { Tile } from '../lib/game'

interface Props {
  tile: Tile
  /** Source tiles of a merge slide into place and are dropped on the next move. */
  variant: 'tile' | 'source'
}

const SUPER_VALUE = 4096

export function TileView({ tile, variant }: Props): React.JSX.Element {
  const classNames = ['tile']
  if (tile.isNew) classNames.push('new')
  if (tile.mergedFrom) classNames.push('merged')
  if (variant === 'source') classNames.push('source')

  return (
    <div
      className={classNames.join(' ')}
      style={{ '--row': String(tile.row), '--col': String(tile.col) } as React.CSSProperties}
      data-value={tile.value}
      data-super={tile.value >= SUPER_VALUE ? 'true' : undefined}
      data-length={String(tile.value).length}
      aria-hidden={variant === 'source'}
    >
      <div className="tile-inner">{tile.value}</div>
    </div>
  )
}
