import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { createGame, isOpposite, keyToDir } from './game.js'

describe('keyToDir', () => {
  it('maps WASD and arrow keys', () => {
    assert.deepEqual(keyToDir('ArrowUp'), { x: 0, y: -1 })
    assert.deepEqual(keyToDir('w'), { x: 0, y: -1 })
    assert.deepEqual(keyToDir('s'), { x: 0, y: 1 })
    assert.deepEqual(keyToDir('a'), { x: -1, y: 0 })
    assert.deepEqual(keyToDir('d'), { x: 1, y: 0 })
    assert.equal(keyToDir('q'), null)
  })
})

describe('turning', () => {
  it('forbids an immediate reverse of the current direction', () => {
    const game = createGame({
      gridSize: 7,
      initialFood: { x: 0, y: 0 }
    })
    game.start()
    const blocked = game.queueDirection({ x: -1, y: 0 })
    assert.equal(blocked.queuedDirection, null)
    assert.deepEqual(blocked.direction, { x: 1, y: 0 })
  })

  it('forbids reversing a queued turn before the next step', () => {
    const game = createGame({
      gridSize: 7,
      initialFood: { x: 0, y: 0 }
    })
    game.start()
    game.queueDirection({ x: 0, y: -1 })
    const blocked = game.queueDirection({ x: 0, y: 1 })
    assert.deepEqual(blocked.queuedDirection, { x: 0, y: -1 })
  })

  it('accepts a 90-degree turn', () => {
    const game = createGame({
      gridSize: 7,
      initialFood: { x: 0, y: 0 }
    })
    game.start()
    const queued = game.queueDirection({ x: 0, y: -1 })
    assert.deepEqual(queued.queuedDirection, { x: 0, y: -1 })
  })

  it('treats opposite vectors as reverse', () => {
    assert.equal(isOpposite({ x: 1, y: 0 }, { x: -1, y: 0 }), true)
    assert.equal(isOpposite({ x: 0, y: 1 }, { x: 0, y: -1 }), true)
    assert.equal(isOpposite({ x: 1, y: 0 }, { x: 0, y: 1 }), false)
  })
})

describe('eat / die / restart', () => {
  it('grows and scores when the head reaches food', () => {
    const game = createGame({
      gridSize: 7,
      initialFood: { x: 4, y: 3 },
      rng: () => 0.99
    })
    const started = game.start()
    assert.equal(started.snake.length, 3)
    const after = game.step()
    assert.equal(after.score, 1)
    assert.equal(after.snake.length, 4)
    assert.equal(after.status, 'playing')
    assert.ok(after.food)
    assert.notDeepEqual(after.food, { x: 4, y: 3 })
  })

  it('ends the run when the head hits a wall', () => {
    const game = createGame({
      gridSize: 5,
      initialSnake: [
        { x: 4, y: 2 },
        { x: 3, y: 2 },
        { x: 2, y: 2 }
      ],
      initialDirection: { x: 1, y: 0 },
      initialFood: { x: 0, y: 0 }
    })
    game.start()
    const after = game.step()
    assert.equal(after.status, 'dead')
    assert.equal(after.score, 0)
  })

  it('ends the run when the head hits the body', () => {
    const game = createGame({
      gridSize: 7,
      initialSnake: [
        { x: 3, y: 3 },
        { x: 3, y: 2 },
        { x: 2, y: 2 },
        { x: 2, y: 3 },
        { x: 2, y: 4 }
      ],
      initialDirection: { x: -1, y: 0 },
      initialFood: { x: 0, y: 0 }
    })
    game.start()
    const after = game.step()
    assert.equal(after.status, 'dead')
  })

  it('restart clears score and returns to a playable snake', () => {
    const game = createGame({
      gridSize: 5,
      initialSnake: [
        { x: 4, y: 2 },
        { x: 3, y: 2 },
        { x: 2, y: 2 }
      ],
      initialDirection: { x: 1, y: 0 },
      initialFood: { x: 0, y: 0 }
    })
    game.start()
    assert.equal(game.step().status, 'dead')
    const again = game.restart()
    assert.equal(again.status, 'playing')
    assert.equal(again.score, 0)
    assert.equal(again.snake.length, 3)
    assert.deepEqual(again.snake[0], { x: 4, y: 2 })
  })
})
