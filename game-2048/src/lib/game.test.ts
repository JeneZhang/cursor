import { describe, expect, it } from 'vitest'
import {
  continueAfterWin,
  createGame,
  fromValues,
  hasAvailableMoves,
  highestValue,
  move,
  toValues,
  WIN_VALUE,
  type Rng
} from './game'

/** Spawns a 2 in the last empty cell so assertions stay away from the spawn. */
const spawnLast: Rng = () => 0.99

function rngFrom(values: number[]): Rng {
  let index = 0
  return () => {
    const value = values[index % values.length]
    index += 1
    return value
  }
}

function emptyRows(count: number, size: number): number[][] {
  return Array.from({ length: count }, () => Array.from({ length: size }, () => 0))
}

describe('createGame', () => {
  it('starts with two tiles, no score and a playable board', () => {
    const game = createGame({ rng: rngFrom([0.99, 0.9, 0, 0.9]) })
    expect(game.tiles).toHaveLength(2)
    expect(game.score).toBe(0)
    expect(game.moves).toBe(0)
    expect(game.status).toBe('playing')
    expect(game.size).toBe(4)
    expect(new Set(game.tiles.map((tile) => tile.id)).size).toBe(2)
    for (const tile of game.tiles) {
      expect([2, 4]).toContain(tile.value)
    }
  })

  it('honours a custom board size', () => {
    const game = createGame({ size: 6, rng: spawnLast })
    expect(game.size).toBe(6)
    expect(toValues(game)).toHaveLength(6)
    expect(toValues(game)[0]).toHaveLength(6)
  })

  it('spawns a 4 only when the roll is below the 10% threshold', () => {
    const fours = createGame({ rng: rngFrom([0, 0.05]) })
    expect(fours.tiles.every((tile) => tile.value === 4)).toBe(true)

    const twos = createGame({ rng: rngFrom([0, 0.5]) })
    expect(twos.tiles.every((tile) => tile.value === 2)).toBe(true)
  })
})

describe('move', () => {
  it('slides tiles to the wall without merging different values', () => {
    const state = fromValues([[0, 0, 2, 4], ...emptyRows(3, 4)])
    const result = move(state, 'left', spawnLast)
    expect(result.moved).toBe(true)
    expect(result.gained).toBe(0)
    expect(toValues(result.state)[0]).toEqual([2, 4, 0, 0])
  })

  it('merges an equal pair and adds the merged value to the score', () => {
    const state = fromValues([[2, 2, 0, 0], ...emptyRows(3, 4)])
    const result = move(state, 'left', spawnLast)
    expect(result.gained).toBe(4)
    expect(result.state.score).toBe(4)
    expect(toValues(result.state)[0]).toEqual([4, 0, 0, 0])
  })

  it('never merges the same tile twice in one move', () => {
    const state = fromValues([[4, 4, 4, 4], ...emptyRows(3, 4)])
    const result = move(state, 'left', spawnLast)
    expect(toValues(result.state)[0]).toEqual([8, 8, 0, 0])
    expect(result.gained).toBe(16)
  })

  it('merges the pair closest to the direction of travel', () => {
    const board = [[2, 2, 2, 0], ...emptyRows(3, 4)]

    expect(toValues(move(fromValues(board), 'left', spawnLast).state)[0]).toEqual([4, 2, 0, 0])
    expect(toValues(move(fromValues(board), 'right', spawnLast).state)[0]).toEqual([0, 0, 2, 4])
  })

  it('moves and merges vertically', () => {
    const state = fromValues([
      [2, 0, 0, 0],
      [2, 0, 0, 0],
      [4, 0, 0, 0],
      [0, 0, 0, 0]
    ])

    const up = move(state, 'up', spawnLast)
    expect(toValues(up.state).map((row) => row[0])).toEqual([4, 4, 0, 0])

    const down = move(state, 'down', spawnLast)
    expect(toValues(down.state).map((row) => row[0])).toEqual([0, 0, 4, 4])
  })

  it('is a no-op when nothing can shift in that direction', () => {
    const state = fromValues([[2, 4, 0, 0], ...emptyRows(3, 4)])
    const result = move(state, 'left', spawnLast)
    expect(result.moved).toBe(false)
    expect(result.gained).toBe(0)
    expect(result.state).toBe(state)
  })

  it('spawns exactly one new tile per successful move', () => {
    const state = fromValues([[2, 2, 0, 0], ...emptyRows(3, 4)])
    const result = move(state, 'left', spawnLast)
    const spawned = result.state.tiles.filter((tile) => tile.isNew)
    expect(result.state.tiles).toHaveLength(2)
    expect(spawned).toHaveLength(1)
    expect(spawned[0]).toMatchObject({ row: 3, col: 3, value: 2 })
    expect(result.state.moves).toBe(1)
  })

  it('records both source tiles of a merge at the destination cell', () => {
    const state = fromValues([[2, 2, 0, 0], ...emptyRows(3, 4)])
    const sourceIds = state.tiles.map((tile) => tile.id)
    const merged = move(state, 'left', spawnLast).state.tiles.find((tile) => tile.mergedFrom)

    expect(merged).toBeDefined()
    expect(merged?.value).toBe(4)
    expect(merged?.mergedFrom).toHaveLength(2)
    expect(merged?.mergedFrom?.map((tile) => tile.id).sort()).toEqual([...sourceIds].sort())
    for (const source of merged?.mergedFrom ?? []) {
      expect(source).toMatchObject({ row: 0, col: 0, mergedFrom: null })
    }
  })

  it('clears new/merged flags carried over from the previous move', () => {
    const first = move(fromValues([[2, 2, 0, 0], ...emptyRows(3, 4)]), 'left', spawnLast)
    const second = move(first.state, 'down', spawnLast)
    const carried = second.state.tiles.filter((tile) => tile.mergedFrom && tile.value === 4)
    expect(carried).toHaveLength(0)
    expect(second.state.tiles.filter((tile) => tile.isNew)).toHaveLength(1)
  })

  it('accumulates the score across moves', () => {
    const state = fromValues([[2, 2, 0, 0], [4, 4, 0, 0], ...emptyRows(2, 4)])
    const first = move(state, 'left', spawnLast)
    const second = move(first.state, 'up', spawnLast)
    expect(first.state.score).toBe(12)
    expect(second.state.score).toBe(12)
    expect(second.gained).toBe(0)
  })

  it('works on non-default board sizes', () => {
    const state = fromValues([
      [2, 2, 2],
      [0, 0, 0],
      [0, 0, 0]
    ])
    const result = move(state, 'right', spawnLast)
    expect(result.state.size).toBe(3)
    expect(toValues(result.state)[0]).toEqual([0, 2, 4])
  })
})

describe('game over', () => {
  const gridlocked = [
    [2, 4, 2, 4],
    [4, 2, 4, 2],
    [2, 4, 2, 4],
    [4, 2, 4, 2]
  ]

  it('detects a board with no empty cell and no equal neighbours', () => {
    const state = fromValues(gridlocked)
    expect(hasAvailableMoves(state.tiles, state.size)).toBe(false)
    expect(state.status).toBe('over')
  })

  it('refuses further moves once the game is over', () => {
    const state = fromValues(gridlocked)
    const result = move(state, 'left', spawnLast)
    expect(result.moved).toBe(false)
    expect(result.state).toBe(state)
  })

  it('stays playable while an equal pair remains', () => {
    const state = fromValues([
      [2, 2, 2, 4],
      [4, 2, 4, 2],
      [2, 4, 2, 4],
      [4, 2, 4, 2]
    ])
    expect(hasAvailableMoves(state.tiles, state.size)).toBe(true)
    expect(state.status).toBe('playing')
  })

  it('ends the game when the last spawn fills the board without pairs', () => {
    const state = fromValues([
      [0, 2, 4, 2],
      [4, 2, 4, 2],
      [2, 4, 2, 4],
      [4, 2, 4, 2]
    ])
    expect(state.status).toBe('playing')
    // The top row slides left and the spawned 4 takes the last free cell.
    const result = move(state, 'left', rngFrom([0, 0.05]))
    expect(result.moved).toBe(true)
    expect(toValues(result.state)[0]).toEqual([2, 4, 2, 4])
    expect(result.state.status).toBe('over')
  })
})

describe('winning', () => {
  const nearWin = fromValues([[1024, 1024, 0, 0], ...emptyRows(3, 4)])

  it('flags the win when a 2048 tile appears', () => {
    const result = move(nearWin, 'left', spawnLast)
    expect(result.state.status).toBe('won')
    expect(highestValue(result.state.tiles)).toBe(WIN_VALUE)
  })

  it('keeps playing after the player dismisses the win', () => {
    const won = move(nearWin, 'left', spawnLast).state
    const resumed = continueAfterWin(won)
    expect(resumed.status).toBe('playing')
    expect(resumed.keepPlaying).toBe(true)

    const next = move(resumed, 'down', spawnLast)
    expect(next.state.status).toBe('playing')
    expect(next.state.keepPlaying).toBe(true)
  })

  it('does nothing when the game was not won', () => {
    const playing = fromValues([[2, 0, 0, 0], ...emptyRows(3, 4)])
    expect(continueAfterWin(playing)).toBe(playing)
  })
})

describe('board helpers', () => {
  it('round-trips values through fromValues and toValues', () => {
    const values = [
      [2, 0, 8, 0],
      [0, 4, 0, 0],
      [0, 0, 0, 16],
      [32, 0, 0, 0]
    ]
    expect(toValues(fromValues(values))).toEqual(values)
  })

  it('reports the highest tile value', () => {
    const state = fromValues([
      [2, 64, 8],
      [0, 0, 0],
      [0, 0, 0]
    ])
    expect(highestValue(state.tiles)).toBe(64)
    expect(highestValue([])).toBe(0)
  })
})
