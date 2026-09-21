import type { Tile } from '../lib/game'
import type { SwipeHandlers } from '../hooks/useSwipeControls'
import { TileView } from './TileView'

interface Props {
  size: number
  tiles: Tile[]
  swipe: SwipeHandlers
}

interface RenderedTile {
  tile: Tile
  variant: 'tile' | 'source'
}

/**
 * A merged tile is drawn on top of the two tiles it came from, so those keep
 * their identity for one frame and slide into the merge cell before vanishing.
 */
function renderOrder(tiles: Tile[]): RenderedTile[] {
  const rendered: RenderedTile[] = []
  for (const tile of tiles) {
    for (const source of tile.mergedFrom ?? []) {
      rendered.push({ tile: source, variant: 'source' })
    }
    rendered.push({ tile, variant: 'tile' })
  }
  return rendered.sort((a, b) => a.tile.id - b.tile.id)
}

export function Board({ size, tiles, swipe }: Props): React.JSX.Element {
  const cells = Array.from({ length: size * size }, (_, index) => index)

  return (
    <div
      className="board"
      style={{ '--size': String(size) } as React.CSSProperties}
      onPointerDown={swipe.onPointerDown}
      onPointerUp={swipe.onPointerUp}
      onPointerCancel={swipe.onPointerCancel}
      onLostPointerCapture={swipe.onLostPointerCapture}
      role="grid"
      aria-label={`${size} x ${size} 棋盘`}
    >
      <div className="board-grid" aria-hidden="true">
        {cells.map((index) => (
          <div className="cell" key={index} />
        ))}
      </div>
      <div className="tile-layer">
        {renderOrder(tiles).map(({ tile, variant }) => (
          <TileView key={tile.id} tile={tile} variant={variant} />
        ))}
      </div>
    </div>
  )
}
