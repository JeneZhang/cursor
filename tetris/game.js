/**
 * Classic Tetris rules: board, collision, rotation with basic wall kicks,
 * 7-bag randomizer, line clears, and scoring.
 * Rendering and input live in main.js. This file is loaded as a classic
 * script in the browser and as CommonJS from the Node tests.
 */
;(function (root, factory) {
  const api = factory()
  if (typeof module === 'object' && module.exports) {
    module.exports = api
  } else {
    root.Tetris = api
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const COLS = 10
  const ROWS = 20
  const PIECE_TYPES = ['I', 'O', 'T', 'S', 'Z', 'J', 'L']

  const COLORS = {
    I: '#3ecfe0',
    O: '#f2c14e',
    T: '#b06bff',
    S: '#62c554',
    Z: '#ef5d5d',
    J: '#4c7cf3',
    L: '#f0913a'
  }

  // Cell offsets for each clockwise rotation, y grows downward.
  const ROTATIONS = {
    I: [
      [
        [0, 0],
        [1, 0],
        [2, 0],
        [3, 0]
      ],
      [
        [2, 0],
        [2, 1],
        [2, 2],
        [2, 3]
      ],
      [
        [0, 1],
        [1, 1],
        [2, 1],
        [3, 1]
      ],
      [
        [1, 0],
        [1, 1],
        [1, 2],
        [1, 3]
      ]
    ],
    O: [
      [
        [0, 0],
        [1, 0],
        [0, 1],
        [1, 1]
      ],
      [
        [0, 0],
        [1, 0],
        [0, 1],
        [1, 1]
      ],
      [
        [0, 0],
        [1, 0],
        [0, 1],
        [1, 1]
      ],
      [
        [0, 0],
        [1, 0],
        [0, 1],
        [1, 1]
      ]
    ],
    T: [
      [
        [1, 0],
        [0, 1],
        [1, 1],
        [2, 1]
      ],
      [
        [1, 0],
        [1, 1],
        [2, 1],
        [1, 2]
      ],
      [
        [0, 1],
        [1, 1],
        [2, 1],
        [1, 2]
      ],
      [
        [1, 0],
        [0, 1],
        [1, 1],
        [1, 2]
      ]
    ],
    S: [
      [
        [1, 0],
        [2, 0],
        [0, 1],
        [1, 1]
      ],
      [
        [1, 0],
        [1, 1],
        [2, 1],
        [2, 2]
      ],
      [
        [1, 1],
        [2, 1],
        [0, 2],
        [1, 2]
      ],
      [
        [0, 0],
        [0, 1],
        [1, 1],
        [1, 2]
      ]
    ],
    Z: [
      [
        [0, 0],
        [1, 0],
        [1, 1],
        [2, 1]
      ],
      [
        [2, 0],
        [1, 1],
        [2, 1],
        [1, 2]
      ],
      [
        [0, 1],
        [1, 1],
        [1, 2],
        [2, 2]
      ],
      [
        [1, 0],
        [0, 1],
        [1, 1],
        [0, 2]
      ]
    ],
    J: [
      [
        [0, 0],
        [0, 1],
        [1, 1],
        [2, 1]
      ],
      [
        [1, 0],
        [2, 0],
        [1, 1],
        [1, 2]
      ],
      [
        [0, 1],
        [1, 1],
        [2, 1],
        [2, 2]
      ],
      [
        [1, 0],
        [1, 1],
        [0, 2],
        [1, 2]
      ]
    ],
    L: [
      [
        [2, 0],
        [0, 1],
        [1, 1],
        [2, 1]
      ],
      [
        [1, 0],
        [1, 1],
        [1, 2],
        [2, 2]
      ],
      [
        [0, 1],
        [1, 1],
        [2, 1],
        [0, 2]
      ],
      [
        [0, 0],
        [1, 0],
        [1, 1],
        [1, 2]
      ]
    ]
  }

  const SPAWN = {
    I: { x: 3, y: 0 },
    O: { x: 4, y: 0 },
    T: { x: 3, y: 0 },
    S: { x: 3, y: 0 },
    Z: { x: 3, y: 0 },
    J: { x: 3, y: 0 },
    L: { x: 3, y: 0 }
  }

  // Try the natural rotation first, then nudge off walls and the floor.
  const KICKS = [
    [0, 0],
    [-1, 0],
    [1, 0],
    [0, -1],
    [-1, -1],
    [1, -1],
    [-2, 0],
    [2, 0],
    [0, -2]
  ]

  // Roughly NES gravity, in milliseconds per row. Level 1 is the first entry.
  const DROP_MS = [
    800, 717, 633, 550, 467, 383, 300, 217, 133, 100, 83, 83, 83, 67, 67, 67, 50, 50, 50, 33
  ]

  const LINE_SCORES = { 1: 100, 2: 300, 3: 500, 4: 800 }
  const HIGH_SCORE_KEY = 'tetris-high-score'

  function emptyBoard() {
    return Array.from({ length: ROWS }, () => Array(COLS).fill(null))
  }

  function cloneBoard(board) {
    return board.map((row) => row.slice())
  }

  function pieceCells(type, rotation, x, y) {
    const shapes = ROTATIONS[type]
    const index = ((rotation % 4) + 4) % 4
    return shapes[index].map(([dx, dy]) => ({ x: x + dx, y: y + dy }))
  }

  function collides(board, cells) {
    for (const cell of cells) {
      if (cell.x < 0 || cell.x >= COLS || cell.y >= ROWS) return true
      if (cell.y >= 0 && board[cell.y][cell.x]) return true
    }
    return false
  }

  function rotatePiece(board, piece, dir) {
    const direction = dir === undefined ? 1 : dir
    const rotation = (((piece.rotation + direction) % 4) + 4) % 4
    for (const [kx, ky] of KICKS) {
      const x = piece.x + kx
      const y = piece.y + ky
      if (!collides(board, pieceCells(piece.type, rotation, x, y))) {
        return { type: piece.type, rotation, x, y }
      }
    }
    return null
  }

  function clearLines(board) {
    const kept = []
    let cleared = 0
    for (const row of board) {
      if (row.every((cell) => cell)) {
        cleared += 1
      } else {
        kept.push(row.slice())
      }
    }
    const blanks = Array.from({ length: cleared }, () => Array(COLS).fill(null))
    return { board: blanks.concat(kept), cleared }
  }

  function scoreForLines(cleared, level) {
    const base = LINE_SCORES[cleared] || 0
    return base * level
  }

  function levelForLines(lines) {
    return Math.floor(lines / 10) + 1
  }

  function dropInterval(level) {
    const safe = Math.max(1, Math.floor(level) || 1)
    const index = Math.min(safe, DROP_MS.length) - 1
    return DROP_MS[index]
  }

  function drawBag(rng) {
    const bag = PIECE_TYPES.slice()
    for (let i = bag.length - 1; i > 0; i -= 1) {
      const j = Math.floor(rng() * (i + 1))
      const tmp = bag[i]
      bag[i] = bag[j]
      bag[j] = tmp
    }
    return bag
  }

  function ghostDropY(board, piece) {
    let y = piece.y
    for (let i = 0; i < ROWS + 4; i += 1) {
      if (collides(board, pieceCells(piece.type, piece.rotation, piece.x, y + 1))) {
        return y
      }
      y += 1
    }
    return y
  }

  function previewCells(type) {
    const cells = pieceCells(type, 0, 0, 0)
    const minX = Math.min(...cells.map((cell) => cell.x))
    const minY = Math.min(...cells.map((cell) => cell.y))
    const maxX = Math.max(...cells.map((cell) => cell.x))
    const maxY = Math.max(...cells.map((cell) => cell.y))
    const offsetX = Math.floor((4 - (maxX - minX + 1)) / 2) - minX
    const offsetY = Math.floor((4 - (maxY - minY + 1)) / 2) - minY
    return cells.map((cell) => ({ x: cell.x + offsetX, y: cell.y + offsetY }))
  }

  function createScoreStore(storage) {
    return {
      read() {
        try {
          const value = Number(storage.getItem(HIGH_SCORE_KEY))
          if (!Number.isFinite(value) || value < 0) return 0
          return Math.floor(value)
        } catch {
          return 0
        }
      },
      commit(score) {
        const next = Math.max(this.read(), Math.max(0, Math.floor(Number(score)) || 0))
        try {
          storage.setItem(HIGH_SCORE_KEY, String(next))
        } catch {
          return next
        }
        return next
      }
    }
  }

  function createGame(options) {
    const settings = options || {}
    const rng = settings.rng || Math.random
    let board = emptyBoard()
    let scripted = []
    let bag = []
    let piece = null
    let status = 'ready'
    let score = 0
    let lines = 0
    let level = 1

    function peekNext() {
      if (scripted.length > 0) return scripted[0]
      if (bag.length > 0) return bag[0]
      return null
    }

    function pullType() {
      if (scripted.length > 0) return scripted.shift()
      if (bag.length === 0) bag = drawBag(rng)
      return bag.shift()
    }

    function ensurePreview() {
      if (scripted.length === 0 && bag.length === 0) bag = drawBag(rng)
    }

    function reset() {
      board = settings.board ? cloneBoard(settings.board) : emptyBoard()
      scripted = (settings.queue || []).slice()
      bag = []
      piece = null
      score = settings.score || 0
      lines = settings.lines || 0
      level = levelForLines(lines)
      status = 'ready'
      if (scripted.length === 0) bag = drawBag(rng)
    }

    function spawn() {
      const type = pullType()
      ensurePreview()
      const pos = SPAWN[type]
      piece = { type, rotation: 0, x: pos.x, y: pos.y }
      if (collides(board, pieceCells(type, 0, pos.x, pos.y))) {
        status = 'over'
      }
    }

    function canPlace(x, y, rotation) {
      return !collides(board, pieceCells(piece.type, rotation, x, y))
    }

    function lockPiece() {
      const cells = pieceCells(piece.type, piece.rotation, piece.x, piece.y)
      if (cells.some((cell) => cell.y < 0)) {
        status = 'over'
        return
      }
      for (const cell of cells) {
        board[cell.y][cell.x] = piece.type
      }
      const result = clearLines(board)
      board = result.board
      if (result.cleared > 0) {
        score += scoreForLines(result.cleared, level)
        lines += result.cleared
        level = levelForLines(lines)
      }
      spawn()
    }

    function getState() {
      const active = piece && (status === 'playing' || status === 'paused' || status === 'over')
      const cells = active ? pieceCells(piece.type, piece.rotation, piece.x, piece.y) : []
      let ghostY = null
      let ghostCells = []
      if (piece && (status === 'playing' || status === 'paused')) {
        ghostY = ghostDropY(board, piece)
        ghostCells = pieceCells(piece.type, piece.rotation, piece.x, ghostY)
      }
      return {
        status,
        board: cloneBoard(board),
        piece: piece
          ? { type: piece.type, rotation: piece.rotation, x: piece.x, y: piece.y }
          : null,
        cells,
        ghostY,
        ghostCells,
        next: peekNext(),
        queue: scripted.concat(bag),
        score,
        lines,
        level
      }
    }

    function start() {
      if (status !== 'ready') return getState()
      status = 'playing'
      spawn()
      return getState()
    }

    function restart() {
      reset()
      status = 'playing'
      spawn()
      return getState()
    }

    function togglePause() {
      if (status === 'playing') status = 'paused'
      else if (status === 'paused') status = 'playing'
      return getState()
    }

    function move(dx) {
      if (status !== 'playing' || !piece) return getState()
      if (canPlace(piece.x + dx, piece.y, piece.rotation)) {
        piece = { type: piece.type, rotation: piece.rotation, x: piece.x + dx, y: piece.y }
      }
      return getState()
    }

    function rotate(dir) {
      if (status !== 'playing' || !piece) return getState()
      const next = rotatePiece(board, piece, dir === undefined ? 1 : dir)
      if (next) piece = next
      return getState()
    }

    function softDrop() {
      if (status !== 'playing' || !piece) return getState()
      if (canPlace(piece.x, piece.y + 1, piece.rotation)) {
        piece = { type: piece.type, rotation: piece.rotation, x: piece.x, y: piece.y + 1 }
        score += 1
        return getState()
      }
      lockPiece()
      return getState()
    }

    function hardDrop() {
      if (status !== 'playing' || !piece) return getState()
      let steps = 0
      while (canPlace(piece.x, piece.y + 1, piece.rotation)) {
        piece = { type: piece.type, rotation: piece.rotation, x: piece.x, y: piece.y + 1 }
        steps += 1
      }
      score += steps * 2
      lockPiece()
      return getState()
    }

    function gravity() {
      if (status !== 'playing' || !piece) return getState()
      if (canPlace(piece.x, piece.y + 1, piece.rotation)) {
        piece = { type: piece.type, rotation: piece.rotation, x: piece.x, y: piece.y + 1 }
        return getState()
      }
      lockPiece()
      return getState()
    }

    reset()

    return {
      start,
      restart,
      togglePause,
      move,
      rotate,
      softDrop,
      hardDrop,
      gravity,
      getState
    }
  }

  return {
    COLS,
    ROWS,
    PIECE_TYPES,
    COLORS,
    ROTATIONS,
    SPAWN,
    KICKS,
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
  }
})
