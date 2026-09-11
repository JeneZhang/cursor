export type Direction = 'up' | 'down' | 'left' | 'right'

export type GameStatus = 'playing' | 'won' | 'over'

export type Rng = () => number

export interface Tile {
  id: number
  value: number
  row: number
  col: number
  /** Spawned by the move that produced this state; drives the appear animation. */
  isNew: boolean
  /**
   * The two tiles this tile was merged from, already moved to the merge cell so
   * the renderer can slide them in before they are dropped on the next frame.
   */
  mergedFrom: Tile[] | null
}

export interface GameState {
  size: number
  tiles: Tile[]
  score: number
  status: GameStatus
  /** Set when the player dismisses the win overlay and plays past 2048. */
  keepPlaying: boolean
  moves: number
  nextTileId: number
}

export interface MoveResult {
  state: GameState
  moved: boolean
  gained: number
}

interface Vector {
  row: number
  col: number
}

interface Cell {
  row: number
  col: number
}

export const WIN_VALUE = 2048
export const DEFAULT_SIZE = 4
export const BOARD_SIZES = [3, 4, 5, 6] as const

const VECTORS: Record<Direction, Vector> = {
  up: { row: -1, col: 0 },
  down: { row: 1, col: 0 },
  left: { row: 0, col: -1 },
  right: { row: 0, col: 1 }
}

const FOUR_PROBABILITY = 0.1

function range(size: number): number[] {
  return Array.from({ length: size }, (_, index) => index)
}

function buildGrid(tiles: Tile[], size: number): (Tile | null)[][] {
  const grid: (Tile | null)[][] = range(size).map(() => range(size).map(() => null))
  for (const tile of tiles) {
    grid[tile.row][tile.col] = tile
  }
  return grid
}

function flattenGrid(grid: (Tile | null)[][]): Tile[] {
  const tiles: Tile[] = []
  for (const row of grid) {
    for (const tile of row) {
      if (tile) tiles.push(tile)
    }
  }
  return tiles
}

function emptyCells(grid: (Tile | null)[][]): Cell[] {
  const cells: Cell[] = []
  grid.forEach((row, rowIndex) => {
    row.forEach((tile, colIndex) => {
      if (!tile) cells.push({ row: rowIndex, col: colIndex })
    })
  })
  return cells
}

function withinBounds(cell: Cell, size: number): boolean {
  return cell.row >= 0 && cell.row < size && cell.col >= 0 && cell.col < size
}

/** Traversal order must start from the edge the tiles are moving toward. */
function traversals(direction: Direction, size: number): { rows: number[]; cols: number[] } {
  const vector = VECTORS[direction]
  const rows = range(size)
  const cols = range(size)
  return {
    rows: vector.row > 0 ? [...rows].reverse() : rows,
    cols: vector.col > 0 ? [...cols].reverse() : cols
  }
}

function findFarthestCell(
  grid: (Tile | null)[][],
  from: Cell,
  vector: Vector,
  size: number
): { farthest: Cell; next: Cell | null } {
  let previous = from
  let candidate: Cell = { row: from.row + vector.row, col: from.col + vector.col }
  while (withinBounds(candidate, size) && !grid[candidate.row][candidate.col]) {
    previous = candidate
    candidate = { row: candidate.row + vector.row, col: candidate.col + vector.col }
  }
  return {
    farthest: previous,
    next: withinBounds(candidate, size) ? candidate : null
  }
}

function spawnTile(
  grid: (Tile | null)[][],
  nextTileId: number,
  rng: Rng
): { tile: Tile | null; nextTileId: number } {
  const cells = emptyCells(grid)
  if (cells.length === 0) return { tile: null, nextTileId }
  const cell = cells[Math.min(cells.length - 1, Math.floor(rng() * cells.length))]
  const tile: Tile = {
    id: nextTileId,
    value: rng() < FOUR_PROBABILITY ? 4 : 2,
    row: cell.row,
    col: cell.col,
    isNew: true,
    mergedFrom: null
  }
  grid[cell.row][cell.col] = tile
  return { tile, nextTileId: nextTileId + 1 }
}

export function highestValue(tiles: Tile[]): number {
  return tiles.reduce((max, tile) => Math.max(max, tile.value), 0)
}

/** True while the board still has an empty cell or an adjacent equal pair. */
export function hasAvailableMoves(tiles: Tile[], size: number): boolean {
  if (tiles.length < size * size) return true
  const grid = buildGrid(tiles, size)
  for (let row = 0; row < size; row += 1) {
    for (let col = 0; col < size; col += 1) {
      const tile = grid[row][col]
      if (!tile) return true
      const right = col + 1 < size ? grid[row][col + 1] : null
      const down = row + 1 < size ? grid[row + 1][col] : null
      if (right && right.value === tile.value) return true
      if (down && down.value === tile.value) return true
    }
  }
  return false
}

function resolveStatus(state: Omit<GameState, 'status'>): GameStatus {
  if (!state.keepPlaying && highestValue(state.tiles) >= WIN_VALUE) return 'won'
  if (!hasAvailableMoves(state.tiles, state.size)) return 'over'
  return 'playing'
}

export function createGame(options: { size?: number; rng?: Rng } = {}): GameState {
  const size = options.size ?? DEFAULT_SIZE
  const rng = options.rng ?? Math.random
  const grid = buildGrid([], size)
  let nextTileId = 1
  for (let i = 0; i < 2; i += 1) {
    const spawned = spawnTile(grid, nextTileId, rng)
    nextTileId = spawned.nextTileId
  }
  return {
    size,
    tiles: flattenGrid(grid),
    score: 0,
    status: 'playing',
    keepPlaying: false,
    moves: 0,
    nextTileId
  }
}

export function move(state: GameState, direction: Direction, rng: Rng = Math.random): MoveResult {
  if (state.status === 'over') {
    return { state, moved: false, gained: 0 }
  }

  const size = state.size
  const cleared = state.tiles.map((tile) => ({ ...tile, isNew: false, mergedFrom: null }))
  const grid = buildGrid(cleared, size)
  const vector = VECTORS[direction]
  const { rows, cols } = traversals(direction, size)
  const mergedIds = new Set<number>()
  let nextTileId = state.nextTileId
  let gained = 0
  let moved = false

  for (const row of rows) {
    for (const col of cols) {
      const tile = grid[row][col]
      if (!tile) continue

      const { farthest, next } = findFarthestCell(grid, { row, col }, vector, size)
      const neighbour = next ? grid[next.row][next.col] : null

      if (next && neighbour && neighbour.value === tile.value && !mergedIds.has(neighbour.id)) {
        const merged: Tile = {
          id: nextTileId,
          value: tile.value * 2,
          row: next.row,
          col: next.col,
          isNew: false,
          mergedFrom: [
            { ...neighbour, row: next.row, col: next.col },
            { ...tile, row: next.row, col: next.col }
          ]
        }
        nextTileId += 1
        grid[next.row][next.col] = merged
        grid[row][col] = null
        mergedIds.add(merged.id)
        gained += merged.value
        moved = true
        continue
      }

      if (farthest.row !== row || farthest.col !== col) {
        grid[row][col] = null
        grid[farthest.row][farthest.col] = { ...tile, row: farthest.row, col: farthest.col }
        moved = true
      }
    }
  }

  if (!moved) {
    return { state, moved: false, gained: 0 }
  }

  const spawned = spawnTile(grid, nextTileId, rng)
  nextTileId = spawned.nextTileId

  const next: Omit<GameState, 'status'> = {
    size,
    tiles: flattenGrid(grid),
    score: state.score + gained,
    keepPlaying: state.keepPlaying,
    moves: state.moves + 1,
    nextTileId
  }

  return {
    state: { ...next, status: resolveStatus(next) },
    moved: true,
    gained
  }
}

export function continueAfterWin(state: GameState): GameState {
  if (state.status !== 'won') return state
  const next = { ...state, keepPlaying: true }
  return { ...next, status: resolveStatus(next) }
}

/** Board values row by row, with 0 for empty cells. Used by the tests. */
export function toValues(state: GameState): number[][] {
  return buildGrid(state.tiles, state.size).map((row) => row.map((tile) => (tile ? tile.value : 0)))
}

/** Builds a deterministic state from a value matrix so tests can set up boards. */
export function fromValues(values: number[][], overrides: Partial<GameState> = {}): GameState {
  const size = values.length
  const tiles: Tile[] = []
  let nextTileId = 1
  values.forEach((row, rowIndex) => {
    row.forEach((value, colIndex) => {
      if (value <= 0) return
      tiles.push({
        id: nextTileId,
        value,
        row: rowIndex,
        col: colIndex,
        isNew: false,
        mergedFrom: null
      })
      nextTileId += 1
    })
  })
  const base: Omit<GameState, 'status'> = {
    size,
    tiles,
    score: 0,
    keepPlaying: false,
    moves: 0,
    nextTileId,
    ...overrides
  }
  return { ...base, status: overrides.status ?? resolveStatus(base) }
}
