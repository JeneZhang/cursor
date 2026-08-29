import {
  continueAfterWin,
  createGame,
  DEFAULT_SIZE,
  move,
  type Direction,
  type GameState,
  type Rng
} from './game'

export interface Session {
  game: GameState
  /** Snapshots for undo, oldest first, capped at MAX_HISTORY. */
  past: GameState[]
  /** Best score per board size, so a 4x4 record is not compared with a 6x6 one. */
  bests: Record<number, number>
  /** Score delta of the last move; `seq` retriggers the floating "+N" animation. */
  lastGain: { amount: number; seq: number } | null
}

export type SessionAction =
  | { type: 'move'; direction: Direction }
  | { type: 'undo' }
  | { type: 'restart' }
  | { type: 'continue' }
  | { type: 'resize'; size: number }

export const MAX_HISTORY = 12

export function createSession(
  options: { size?: number; bests?: Record<number, number>; rng?: Rng } = {}
): Session {
  const size = options.size ?? DEFAULT_SIZE
  return {
    game: createGame({ size, rng: options.rng }),
    past: [],
    bests: options.bests ?? {},
    lastGain: null
  }
}

export function bestFor(session: Session, size: number = session.game.size): number {
  return session.bests[size] ?? 0
}

function pushHistory(past: GameState[], state: GameState): GameState[] {
  const next = [...past, state]
  return next.length > MAX_HISTORY ? next.slice(next.length - MAX_HISTORY) : next
}

export function sessionReducer(
  session: Session,
  action: SessionAction,
  rng: Rng = Math.random
): Session {
  switch (action.type) {
    case 'move': {
      const result = move(session.game, action.direction, rng)
      if (!result.moved) return session
      const size = result.state.size
      const best = Math.max(bestFor(session, size), result.state.score)
      return {
        game: result.state,
        past: pushHistory(session.past, session.game),
        bests: { ...session.bests, [size]: best },
        lastGain:
          result.gained > 0
            ? { amount: result.gained, seq: (session.lastGain?.seq ?? 0) + 1 }
            : null
      }
    }
    case 'undo': {
      if (session.past.length === 0) return session
      const previous = session.past[session.past.length - 1]
      return {
        game: previous,
        past: session.past.slice(0, -1),
        bests: session.bests,
        lastGain: null
      }
    }
    case 'restart': {
      return {
        game: createGame({ size: session.game.size, rng }),
        past: [],
        bests: session.bests,
        lastGain: null
      }
    }
    case 'continue': {
      return { ...session, game: continueAfterWin(session.game) }
    }
    case 'resize': {
      if (action.size === session.game.size) return session
      return {
        game: createGame({ size: action.size, rng }),
        past: [],
        bests: session.bests,
        lastGain: null
      }
    }
  }
}
