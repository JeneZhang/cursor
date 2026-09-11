import { describe, expect, it } from 'vitest'
import { fromValues, toValues, type Rng } from './game'
import { bestFor, createSession, MAX_HISTORY, sessionReducer, type Session } from './session'

const spawnLast: Rng = () => 0.99

function sessionWith(values: number[][], overrides: Partial<Session> = {}): Session {
  return {
    game: fromValues(values),
    past: [],
    bests: {},
    lastGain: null,
    ...overrides
  }
}

const twoPairs = [
  [2, 2, 0, 0],
  [4, 4, 0, 0],
  [0, 0, 0, 0],
  [0, 0, 0, 0]
]

describe('createSession', () => {
  it('starts a fresh 4x4 game with no history', () => {
    const session = createSession({ rng: spawnLast })
    expect(session.game.size).toBe(4)
    expect(session.past).toEqual([])
    expect(bestFor(session)).toBe(0)
  })

  it('carries stored best scores in', () => {
    const session = createSession({ size: 5, bests: { 4: 900, 5: 120 }, rng: spawnLast })
    expect(bestFor(session)).toBe(120)
    expect(bestFor(session, 4)).toBe(900)
  })
})

describe('move action', () => {
  it('records the previous board for undo and updates the best score', () => {
    const session = sessionWith(twoPairs)
    const next = sessionReducer(session, { type: 'move', direction: 'left' }, spawnLast)

    expect(next.game.score).toBe(12)
    expect(bestFor(next)).toBe(12)
    expect(next.past).toHaveLength(1)
    expect(next.past[0]).toBe(session.game)
    expect(next.lastGain).toEqual({ amount: 12, seq: 1 })
  })

  it('ignores a move that changes nothing', () => {
    const session = sessionWith([
      [2, 4, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0]
    ])
    const next = sessionReducer(session, { type: 'move', direction: 'left' }, spawnLast)
    expect(next).toBe(session)
    expect(next.past).toHaveLength(0)
  })

  it('keeps a higher stored best when the current score is lower', () => {
    const session = sessionWith(twoPairs, { bests: { 4: 5000 } })
    const next = sessionReducer(session, { type: 'move', direction: 'left' }, spawnLast)
    expect(bestFor(next)).toBe(5000)
  })

  it('bumps the gain sequence so repeated equal gains still animate', () => {
    let session = sessionWith([
      [2, 2, 0, 0],
      [2, 2, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0]
    ])
    session = sessionReducer(session, { type: 'move', direction: 'left' }, spawnLast)
    session = sessionReducer(session, { type: 'move', direction: 'up' }, spawnLast)
    expect(session.lastGain?.seq).toBe(2)
  })

  it('clears the gain when a move merges nothing', () => {
    let session = sessionWith(twoPairs)
    session = sessionReducer(session, { type: 'move', direction: 'left' }, spawnLast)
    session = sessionReducer(session, { type: 'move', direction: 'right' }, spawnLast)
    expect(session.lastGain).toBeNull()
  })

  it('caps the undo history and drops the oldest snapshot', () => {
    const filler = Array.from({ length: MAX_HISTORY }, (_, index) =>
      fromValues(twoPairs, { moves: index })
    )
    const session = sessionWith(twoPairs, { past: filler })
    const next = sessionReducer(session, { type: 'move', direction: 'left' }, spawnLast)

    expect(next.past).toHaveLength(MAX_HISTORY)
    expect(next.past[0].moves).toBe(1)
    expect(next.past[MAX_HISTORY - 1]).toBe(session.game)
  })
})

describe('undo action', () => {
  it('restores the board and score of the previous move', () => {
    const session = sessionWith(twoPairs)
    const moved = sessionReducer(session, { type: 'move', direction: 'left' }, spawnLast)
    const undone = sessionReducer(moved, { type: 'undo' }, spawnLast)

    expect(toValues(undone.game)).toEqual(twoPairs)
    expect(undone.game.score).toBe(0)
    expect(undone.past).toHaveLength(0)
    expect(undone.lastGain).toBeNull()
  })

  it('keeps the best score already earned', () => {
    const session = sessionWith(twoPairs)
    const moved = sessionReducer(session, { type: 'move', direction: 'left' }, spawnLast)
    const undone = sessionReducer(moved, { type: 'undo' }, spawnLast)
    expect(bestFor(undone)).toBe(12)
  })

  it('does nothing without history', () => {
    const session = sessionWith(twoPairs)
    expect(sessionReducer(session, { type: 'undo' }, spawnLast)).toBe(session)
  })

  it('can undo a game-over board back to a playable one', () => {
    const session = sessionWith([
      [0, 2, 4, 2],
      [4, 2, 4, 2],
      [2, 4, 2, 4],
      [4, 2, 4, 2]
    ])
    const lost = sessionReducer(session, { type: 'move', direction: 'left' }, () => 0.05)
    expect(lost.game.status).toBe('over')
    expect(sessionReducer(lost, { type: 'undo' }, spawnLast).game.status).toBe('playing')
  })
})

describe('restart and resize', () => {
  it('restart clears score and history but keeps best scores', () => {
    const session = sessionWith(twoPairs)
    const moved = sessionReducer(session, { type: 'move', direction: 'left' }, spawnLast)
    const restarted = sessionReducer(moved, { type: 'restart' }, spawnLast)

    expect(restarted.game.score).toBe(0)
    expect(restarted.game.tiles).toHaveLength(2)
    expect(restarted.game.size).toBe(4)
    expect(restarted.past).toEqual([])
    expect(bestFor(restarted)).toBe(12)
  })

  it('resize starts a new board and keeps a separate best per size', () => {
    const session = sessionWith(twoPairs)
    const moved = sessionReducer(session, { type: 'move', direction: 'left' }, spawnLast)
    const resized = sessionReducer(moved, { type: 'resize', size: 5 }, spawnLast)

    expect(resized.game.size).toBe(5)
    expect(resized.game.tiles).toHaveLength(2)
    expect(bestFor(resized)).toBe(0)
    expect(bestFor(resized, 4)).toBe(12)
  })

  it('resize to the current size is a no-op', () => {
    const session = sessionWith(twoPairs)
    expect(sessionReducer(session, { type: 'resize', size: 4 }, spawnLast)).toBe(session)
  })
})

describe('continue action', () => {
  it('dismisses the win overlay and keeps the board', () => {
    const session = sessionWith([
      [1024, 1024, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0]
    ])
    const won = sessionReducer(session, { type: 'move', direction: 'left' }, spawnLast)
    expect(won.game.status).toBe('won')

    const resumed = sessionReducer(won, { type: 'continue' }, spawnLast)
    expect(resumed.game.status).toBe('playing')
    expect(resumed.game.keepPlaying).toBe(true)
    expect(toValues(resumed.game)).toEqual(toValues(won.game))
  })
})
