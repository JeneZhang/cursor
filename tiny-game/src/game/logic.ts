export type Lane = 0 | 1 | 2

export type EntityKind = 'gem' | 'gate'

export interface Entity {
  id: number
  kind: EntityKind
  lane: Lane
  y: number
  radius: number
  height: number
}

export interface Player {
  lane: Lane
  displayLane: number
  y: number
  radius: number
}

export interface GameSnapshot {
  status: 'ready' | 'playing' | 'over'
  score: number
  best: number
  speed: number
  player: Player
  entities: Entity[]
}

export interface Circle {
  x: number
  y: number
  radius: number
}

export interface Rect {
  x: number
  y: number
  width: number
  height: number
}

export function clampLane(lane: number): Lane {
  if (lane <= 0) return 0
  if (lane >= 2) return 2
  return lane as Lane
}

export function laneCenterX(lane: number, width: number, padding: number): number {
  const usable = width - padding * 2
  const laneWidth = usable / 3
  return padding + laneWidth * (lane + 0.5)
}

export function circlesOverlap(a: Circle, b: Circle): boolean {
  const dx = a.x - b.x
  const dy = a.y - b.y
  const r = a.radius + b.radius
  return dx * dx + dy * dy <= r * r
}

export function circleHitsRect(circle: Circle, rect: Rect): boolean {
  const nearestX = Math.max(rect.x, Math.min(circle.x, rect.x + rect.width))
  const nearestY = Math.max(rect.y, Math.min(circle.y, rect.y + rect.height))
  const dx = circle.x - nearestX
  const dy = circle.y - nearestY
  return dx * dx + dy * dy <= circle.radius * circle.radius
}

export function scoreForGem(base: number, combo: number): number {
  return base + Math.max(0, combo) * 2
}

export function nextSpeed(score: number, base = 220, max = 520): number {
  return Math.min(max, base + Math.floor(score / 8) * 12)
}
