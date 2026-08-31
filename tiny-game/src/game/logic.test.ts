import { describe, expect, it } from 'vitest'
import {
  circleHitsRect,
  circlesOverlap,
  clampLane,
  laneCenterX,
  nextSpeed,
  scoreForGem
} from './logic'

describe('clampLane', () => {
  it('keeps values in 0..2', () => {
    expect(clampLane(-2)).toBe(0)
    expect(clampLane(1)).toBe(1)
    expect(clampLane(9)).toBe(2)
  })
})

describe('laneCenterX', () => {
  it('centers each lane inside padded width', () => {
    expect(laneCenterX(0, 390, 30)).toBeCloseTo(85)
    expect(laneCenterX(1, 390, 30)).toBeCloseTo(195)
    expect(laneCenterX(2, 390, 30)).toBeCloseTo(305)
  })
})

describe('collision helpers', () => {
  it('detects overlapping circles', () => {
    expect(circlesOverlap({ x: 0, y: 0, radius: 10 }, { x: 15, y: 0, radius: 10 })).toBe(true)
    expect(circlesOverlap({ x: 0, y: 0, radius: 10 }, { x: 30, y: 0, radius: 10 })).toBe(false)
  })

  it('detects circle vs rect hits', () => {
    expect(
      circleHitsRect({ x: 50, y: 50, radius: 10 }, { x: 40, y: 40, width: 30, height: 20 })
    ).toBe(true)
    expect(
      circleHitsRect({ x: 0, y: 0, radius: 5 }, { x: 40, y: 40, width: 30, height: 20 })
    ).toBe(false)
  })
})

describe('scoring', () => {
  it('rewards combo on gems', () => {
    expect(scoreForGem(5, 0)).toBe(5)
    expect(scoreForGem(5, 3)).toBe(11)
  })

  it('ramps speed with score and caps', () => {
    expect(nextSpeed(0)).toBe(220)
    expect(nextSpeed(80)).toBe(340)
    expect(nextSpeed(9999)).toBe(520)
  })
})
