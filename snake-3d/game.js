/**
 * Pure Snake rules: grid movement, growth, collisions, and restart.
 * Rendering stays in main.js so these rules can be unit-tested.
 */

export function keyToDir(key) {
  switch (key) {
    case 'ArrowUp':
    case 'w':
    case 'W':
      return { x: 0, y: -1 }
    case 'ArrowDown':
    case 's':
    case 'S':
      return { x: 0, y: 1 }
    case 'ArrowLeft':
    case 'a':
    case 'A':
      return { x: -1, y: 0 }
    case 'ArrowRight':
    case 'd':
    case 'D':
      return { x: 1, y: 0 }
    default:
      return null
  }
}

export function isOpposite(a, b) {
  return Boolean(a && b && a.x === -b.x && a.y === -b.y)
}

export function sameCell(a, b) {
  return Boolean(a && b && a.x === b.x && a.y === b.y)
}

function cloneCell(cell) {
  return { x: cell.x, y: cell.y }
}

export function createGame({
  gridSize = 15,
  rng = Math.random,
  initialSnake,
  initialDirection,
  initialFood
} = {}) {
  let snake
  let direction
  let queuedDirection
  let food
  let score
  let status

  function occupiedSet(cells) {
    return new Set(cells.map((cell) => `${cell.x},${cell.y}`))
  }

  function emptyCells() {
    const taken = occupiedSet(snake)
    const cells = []
    for (let y = 0; y < gridSize; y += 1) {
      for (let x = 0; x < gridSize; x += 1) {
        if (!taken.has(`${x},${y}`)) {
          cells.push({ x, y })
        }
      }
    }
    return cells
  }

  function placeFood() {
    const cells = emptyCells()
    if (cells.length === 0) {
      food = null
      return
    }
    food = cloneCell(cells[Math.floor(rng() * cells.length)])
  }

  function defaultSnake() {
    const mid = Math.floor(gridSize / 2)
    return [
      { x: mid, y: mid },
      { x: mid - 1, y: mid },
      { x: mid - 2, y: mid }
    ]
  }

  function reset() {
    snake = (initialSnake ?? defaultSnake()).map(cloneCell)
    direction = cloneCell(initialDirection ?? { x: 1, y: 0 })
    queuedDirection = null
    score = 0
    status = 'ready'
    food = initialFood ? cloneCell(initialFood) : null
    if (!food) {
      placeFood()
    }
  }

  function snapshot() {
    return {
      gridSize,
      snake: snake.map(cloneCell),
      direction: cloneCell(direction),
      queuedDirection: queuedDirection ? cloneCell(queuedDirection) : null,
      food: food ? cloneCell(food) : null,
      score,
      status
    }
  }

  function begin() {
    reset()
    status = 'playing'
    return snapshot()
  }

  /**
   * Queue one turn. Immediate reverse of the direction that will apply on
   * the next step is ignored, so a 180° turn cannot sneak in before a tick.
   */
  function queueDirection(next) {
    if (status !== 'playing' || !next) {
      return snapshot()
    }
    const effective = queuedDirection ?? direction
    if (isOpposite(effective, next) || sameCell(effective, next)) {
      return snapshot()
    }
    queuedDirection = cloneCell(next)
    return snapshot()
  }

  function step() {
    if (status !== 'playing') {
      return snapshot()
    }

    if (queuedDirection) {
      direction = queuedDirection
      queuedDirection = null
    }

    const head = snake[0]
    const next = { x: head.x + direction.x, y: head.y + direction.y }

    if (next.x < 0 || next.y < 0 || next.x >= gridSize || next.y >= gridSize) {
      status = 'dead'
      return snapshot()
    }

    const willEat = sameCell(next, food)
    const body = willEat ? snake : snake.slice(0, -1)
    if (body.some((cell) => sameCell(cell, next))) {
      status = 'dead'
      return snapshot()
    }

    snake = [next, ...snake]
    if (willEat) {
      score += 1
      placeFood()
    } else {
      snake.pop()
    }

    return snapshot()
  }

  reset()

  return {
    start: begin,
    restart: begin,
    queueDirection,
    step,
    getState: snapshot
  }
}
