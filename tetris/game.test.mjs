import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { describe, it } from 'node:test'

const require = createRequire(import.meta.url)
const {
  COLS,
  ROWS,
  PIECE_TYPES,
  COLORS,
  ROTATIONS,
  SPAWN,
  HIGH_SCORE_KEY,
  emptyBoard,
  pieceCells,
  collides,
  rotatePiece,
  clearLines,
  scoreForLines,
  levelForLines,
  dropInterval,
  drawBag,
  ghostDropY,
  previewCells,
  createScoreStore,
  createGame
} = require('./game.js')

function columnGapBoard(gapX, fromRow) {
  const board = emptyBoard()
  for (let y = fromRow; y < ROWS; y += 1) {
    for (let x = 0; x < COLS; x += 1) {
      if (x !== gapX) board[y][x] = 'T'
    }
  }
  return board
}

describe('pieces', () => {
  it('defines seven distinct colors and four rotations of four cells', () => {
    assert.equal(PIECE_TYPES.length, 7)
    assert.equal(new Set(PIECE_TYPES).size, 7)
    const colors = new Set(PIECE_TYPES.map((type) => COLORS[type]))
    assert.equal(colors.size, 7)
    for (const type of PIECE_TYPES) {
      assert.equal(ROTATIONS[type].length, 4)
      for (const shape of ROTATIONS[type]) {
        assert.equal(shape.length, 4)
      }
      const spawned = pieceCells(type, 0, SPAWN[type].x, SPAWN[type].y)
      assert.equal(collides(emptyBoard(), spawned), false)
      for (const cell of spawned) {
        assert.ok(cell.x >= 0 && cell.x < COLS)
        assert.ok(cell.y >= 0 && cell.y < ROWS)
      }
    }
  })

  it('keeps the next-piece preview inside a 4x4 box', () => {
    for (const type of PIECE_TYPES) {
      const cells = previewCells(type)
      assert.equal(cells.length, 4)
      for (const cell of cells) {
        assert.ok(cell.x >= 0 && cell.x < 4)
        assert.ok(cell.y >= 0 && cell.y < 4)
      }
    }
  })
})

describe('collision', () => {
  it('rejects walls, the floor, and stacked blocks, and allows rows above the well', () => {
    const board = emptyBoard()
    assert.equal(collides(board, pieceCells('O', 0, 4, 0)), false)
    assert.equal(collides(board, pieceCells('I', 0, 3, -1)), false)
    assert.equal(collides(board, pieceCells('O', 0, -1, 0)), true)
    assert.equal(collides(board, pieceCells('O', 0, 9, 0)), true)
    assert.equal(collides(board, pieceCells('O', 0, 4, 19)), true)

    board[19][4] = 'T'
    assert.equal(collides(board, pieceCells('O', 0, 4, 18)), true)
    assert.equal(collides(board, pieceCells('O', 0, 6, 18)), false)
  })

  it('stops a piece at the side walls', () => {
    const game = createGame({ queue: ['O', 'I', 'T', 'S', 'Z', 'J', 'L'] })
    game.start()
    for (let i = 0; i < 10; i += 1) game.move(-1)
    assert.equal(game.getState().piece.x, 0)
    for (let i = 0; i < 20; i += 1) game.move(1)
    assert.equal(game.getState().piece.x, 8)
    assert.equal(game.getState().piece.type, 'O')
  })

  it('locks a piece that cannot fall any farther and refuses to overlap the stack', () => {
    const game = createGame({ queue: ['O', 'I', 'T', 'S', 'Z', 'J', 'L'] })
    game.start()
    for (let i = 0; i < 18; i += 1) {
      const state = game.gravity()
      assert.equal(state.piece.type, 'O')
    }
    assert.equal(game.getState().piece.y, 18)
    const locked = game.gravity()
    assert.equal(locked.piece.type, 'I')
    assert.equal(locked.board[18][4], 'O')
    assert.equal(locked.board[19][4], 'O')
    assert.equal(locked.board[19][5], 'O')
    assert.equal(locked.board[17][4], null)
  })
})

describe('rotation and wall kicks', () => {
  it('rotates a free T piece clockwise without shifting it', () => {
    const piece = { type: 'T', rotation: 0, x: 3, y: 4 }
    const rotated = rotatePiece(emptyBoard(), piece, 1)
    assert.deepEqual(rotated, { type: 'T', rotation: 1, x: 3, y: 4 })
    assert.deepEqual(pieceCells('T', 1, 3, 4), [
      { x: 4, y: 4 },
      { x: 4, y: 5 },
      { x: 5, y: 5 },
      { x: 4, y: 6 }
    ])
  })

  it('kicks the vertical I piece right when a clockwise turn would leave the well', () => {
    const board = emptyBoard()
    const piece = { type: 'I', rotation: 1, x: -2, y: 5 }
    assert.equal(collides(board, pieceCells('I', 1, -2, 5)), false)
    assert.equal(collides(board, pieceCells('I', 2, -2, 5)), true)
    const rotated = rotatePiece(board, piece, 1)
    assert.deepEqual(rotated, { type: 'I', rotation: 2, x: 0, y: 5 })
    assert.equal(collides(board, pieceCells('I', 2, 0, 5)), false)
  })

  it('kicks upward when a rotation would pass through the floor', () => {
    const piece = { type: 'T', rotation: 0, x: 3, y: 18 }
    const board = emptyBoard()
    assert.equal(collides(board, pieceCells('T', 0, 3, 18)), false)
    assert.equal(collides(board, pieceCells('T', 1, 3, 18)), true)
    const rotated = rotatePiece(board, piece, 1)
    assert.deepEqual(rotated, { type: 'T', rotation: 1, x: 3, y: 17 })
  })

  it('refuses to rotate when every kick overlaps filled cells', () => {
    const board = emptyBoard()
    for (let y = 0; y < ROWS; y += 1) {
      for (let x = 0; x < COLS; x += 1) board[y][x] = 'T'
    }
    const piece = { type: 'T', rotation: 0, x: 3, y: 17 }
    for (const cell of pieceCells('T', 0, 3, 17)) board[cell.y][cell.x] = null
    assert.equal(collides(board, pieceCells('T', 0, 3, 17)), false)
    assert.equal(rotatePiece(board, piece, 1), null)
  })

  it('slides a vertical I off the left wall during play', () => {
    const game = createGame({ queue: ['I', 'O', 'T', 'S', 'Z', 'J', 'L'] })
    game.start()
    game.rotate(1)
    for (let i = 0; i < 8; i += 1) game.move(-1)
    assert.equal(game.getState().piece.x, -2)
    const kicked = game.rotate(1)
    assert.equal(kicked.piece.rotation, 2)
    assert.equal(kicked.piece.x, 0)
    assert.ok(kicked.cells.every((cell) => cell.x >= 0 && cell.x < COLS))
  })
})

describe('line clears and scoring', () => {
  it('removes full rows, keeps the rows above, and does not mutate the input', () => {
    const board = emptyBoard()
    board[15][0] = 'S'
    for (let y = 16; y < ROWS; y += 1) {
      for (let x = 0; x < COLS; x += 1) board[y][x] = 'I'
    }
    const { board: next, cleared } = clearLines(board)
    assert.equal(cleared, 4)
    assert.equal(next.length, ROWS)
    assert.equal(next[19][0], 'S')
    assert.equal(next[18][0], null)
    assert.equal(board[19][0], 'I')
    assert.equal(board[15][0], 'S')
  })

  it('scores 100/300/500/800 times the current level', () => {
    assert.equal(scoreForLines(1, 1), 100)
    assert.equal(scoreForLines(2, 1), 300)
    assert.equal(scoreForLines(3, 1), 500)
    assert.equal(scoreForLines(4, 1), 800)
    assert.equal(scoreForLines(4, 3), 2400)
    assert.equal(scoreForLines(0, 5), 0)
    assert.equal(levelForLines(0), 1)
    assert.equal(levelForLines(9), 1)
    assert.equal(levelForLines(10), 2)
    assert.equal(levelForLines(25), 3)
  })

  it('speeds up gravity as the level rises and then holds the fastest interval', () => {
    assert.equal(dropInterval(1), 800)
    assert.ok(dropInterval(2) < dropInterval(1))
    assert.ok(dropInterval(10) < dropInterval(5))
    assert.equal(dropInterval(20), dropInterval(99))
    assert.equal(dropInterval(0), dropInterval(1))
  })

  it('clears a single line and scores it at the level before a level-up', () => {
    const board = emptyBoard()
    board[19] = Array.from({ length: COLS }, (_, x) => (x >= 3 && x <= 6 ? null : 'T'))
    const game = createGame({
      lines: 9,
      board,
      queue: ['I', 'O', 'T', 'S', 'Z', 'J', 'L']
    })
    game.start()
    const state = game.hardDrop()
    assert.equal(state.lines, 10)
    assert.equal(state.level, 2)
    assert.equal(state.score, 19 * 2 + 100)
    assert.ok(state.board[19].every((cell) => cell === null))
  })

  it('awards a tetris when a vertical I fills four gaps', () => {
    const game = createGame({
      board: columnGapBoard(5, 16),
      queue: ['I', 'O', 'T', 'S', 'Z', 'J', 'L']
    })
    game.start()
    game.rotate(1)
    const state = game.hardDrop()
    assert.equal(state.lines, 4)
    assert.equal(state.level, 1)
    assert.equal(state.score, 16 * 2 + 800)
    assert.ok(state.board.every((row) => row.every((cell) => cell === null)))
  })

  it('adds one point per soft-dropped row and two per hard-dropped row', () => {
    const soft = createGame({ queue: ['O', 'I', 'T', 'S', 'Z', 'J', 'L'] })
    soft.start()
    soft.softDrop()
    assert.equal(soft.getState().score, 1)
    assert.equal(soft.getState().piece.y, 1)

    let guards = 1
    while (soft.getState().piece.type === 'O' && guards < 30) {
      soft.softDrop()
      guards += 1
    }
    assert.equal(soft.getState().score, 18)
    assert.equal(soft.getState().piece.type, 'I')

    const hard = createGame({ queue: ['O', 'I', 'T', 'S', 'Z', 'J', 'L'] })
    hard.start()
    const dropped = hard.hardDrop()
    assert.equal(dropped.score, 36)
    assert.equal(dropped.piece.type, 'I')
    assert.equal(dropped.board[19][4], 'O')
  })
})

describe('7-bag randomizer', () => {
  it('deals each tetromino once per bag, then refills', () => {
    assert.deepEqual(drawBag(() => 0), ['O', 'T', 'S', 'Z', 'J', 'L', 'I'])
    const again = drawBag(() => 0.99)
    assert.deepEqual(again, ['I', 'O', 'T', 'S', 'Z', 'J', 'L'])
    assert.equal(new Set(again).size, 7)

    const game = createGame({ rng: () => 0 })
    const started = game.start()
    assert.equal(started.piece.type, 'O')
    assert.deepEqual(started.queue, ['T', 'S', 'Z', 'J', 'L', 'I'])
    for (let i = 0; i < 6; i += 1) {
      const state = game.hardDrop()
      assert.equal(state.status, 'playing')
    }
    const seventh = game.getState()
    assert.equal(seventh.piece.type, 'I')
    assert.deepEqual(seventh.queue, ['O', 'T', 'S', 'Z', 'J', 'L', 'I'])
  })
})

describe('flow', () => {
  it('shows a ghost on the landing row', () => {
    const board = emptyBoard()
    board[19][4] = 'T'
    const piece = { type: 'O', rotation: 0, x: 4, y: 0 }
    assert.equal(ghostDropY(board, piece), 17)
    const game = createGame({ queue: ['O', 'I', 'T', 'S', 'Z', 'J', 'L'] })
    const state = game.start()
    assert.equal(state.ghostY, 18)
    assert.equal(state.ghostCells.length, 4)
  })

  it('pauses without moving and resumes', () => {
    const game = createGame({ queue: ['T', 'O', 'I', 'S', 'Z', 'J', 'L'] })
    game.start()
    game.togglePause()
    const paused = game.getState()
    assert.equal(paused.status, 'paused')
    game.gravity()
    game.move(1)
    game.rotate(1)
    game.hardDrop()
    const still = game.getState()
    assert.deepEqual(still.piece, paused.piece)
    assert.equal(still.score, 0)
    game.togglePause()
    assert.equal(game.getState().status, 'playing')
    game.gravity()
    assert.equal(game.getState().piece.y, paused.piece.y + 1)
  })

  it('ends the run when the next piece has nowhere to spawn', () => {
    const board = emptyBoard()
    board[0][4] = 'I'
    board[0][5] = 'I'
    board[1][4] = 'I'
    board[1][5] = 'I'
    const game = createGame({
      board,
      queue: ['O', 'T', 'S', 'Z', 'J', 'L', 'I']
    })
    const state = game.start()
    assert.equal(state.status, 'over')
    assert.equal(state.piece.type, 'O')
    assert.equal(state.score, 0)
    game.hardDrop()
    game.move(-1)
    assert.equal(game.getState().status, 'over')
    assert.equal(game.getState().score, 0)
  })

  it('restarts a fresh run', () => {
    const game = createGame({ queue: ['O', 'I', 'T', 'S', 'Z', 'J', 'L'] })
    assert.equal(game.getState().status, 'ready')
    game.start()
    game.softDrop()
    assert.equal(game.getState().score, 1)
    const restarted = game.restart()
    assert.equal(restarted.status, 'playing')
    assert.equal(restarted.score, 0)
    assert.equal(restarted.lines, 0)
    assert.equal(restarted.level, 1)
    assert.equal(restarted.piece.y, 0)
    assert.equal(restarted.piece.type, 'O')
  })
})

describe('high score store', () => {
  it('keeps the best score and ignores junk', () => {
    const data = new Map()
    const storage = {
      getItem(key) {
        return data.has(key) ? data.get(key) : null
      },
      setItem(key, value) {
        data.set(key, String(value))
      }
    }
    const store = createScoreStore(storage)
    assert.equal(store.read(), 0)
    assert.equal(store.commit(120), 120)
    assert.equal(store.commit(40), 120)
    assert.equal(store.commit(300), 300)
    assert.equal(storage.getItem(HIGH_SCORE_KEY), '300')

    data.set(HIGH_SCORE_KEY, 'nope')
    assert.equal(store.read(), 0)
    assert.equal(store.commit(15), 15)
  })
})
