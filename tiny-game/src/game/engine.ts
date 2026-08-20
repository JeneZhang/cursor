import {
  type Entity,
  type GameSnapshot,
  type Lane,
  type Player,
  circleHitsRect,
  circlesOverlap,
  clampLane,
  laneCenterX,
  nextSpeed,
  scoreForGem
} from './logic'

const WIDTH = 390
const HEIGHT = 720
const PADDING = 28
const PLAYER_Y = HEIGHT - 110
const SPAWN_EVERY_MS = 780

export interface EngineCallbacks {
  onScore: (score: number, best: number) => void
  onGameOver: (score: number, best: number) => void
  onReady: () => void
}

export class LaneDriftEngine {
  private status: GameSnapshot['status'] = 'ready'
  private score = 0
  private best = 0
  private speed = 220
  private combo = 0
  private entities: Entity[] = []
  private nextId = 1
  private spawnTimer = 0
  private lastTs = 0
  private player: Player = {
    lane: 1,
    displayLane: 1,
    y: PLAYER_Y,
    radius: 18
  }
  private animFrame = 0
  private readonly ctx: CanvasRenderingContext2D
  private readonly callbacks: EngineCallbacks
  private stars: { x: number; y: number; s: number; a: number }[] = []

  constructor(canvas: HTMLCanvasElement, callbacks: EngineCallbacks, best = 0) {
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas 2D unavailable')
    this.ctx = ctx
    this.callbacks = callbacks
    this.best = best
    this.seedStars()
  }

  getSnapshot(): GameSnapshot {
    return {
      status: this.status,
      score: this.score,
      best: this.best,
      speed: this.speed,
      player: { ...this.player },
      entities: this.entities.map((e) => ({ ...e }))
    }
  }

  /** Ambient loop behind the start / game-over overlay. */
  idle(): void {
    this.stopLoop()
    this.status = 'ready'
    this.entities = []
    this.player.lane = 1
    this.player.displayLane = 1
    this.lastTs = performance.now()
    this.loop(this.lastTs)
  }

  start(): void {
    this.stopLoop()
    this.status = 'playing'
    this.score = 0
    this.combo = 0
    this.speed = 220
    this.entities = []
    this.spawnTimer = 400
    this.player.lane = 1
    this.player.displayLane = 1
    this.lastTs = performance.now()
    this.callbacks.onScore(this.score, this.best)
    this.loop(this.lastTs)
  }

  move(dir: -1 | 1): void {
    if (this.status !== 'playing') return
    this.player.lane = clampLane(this.player.lane + dir)
  }

  stopLoop(): void {
    cancelAnimationFrame(this.animFrame)
  }

  private seedStars(): void {
    this.stars = Array.from({ length: 48 }, () => ({
      x: Math.random() * WIDTH,
      y: Math.random() * HEIGHT,
      s: 0.6 + Math.random() * 1.8,
      a: 0.25 + Math.random() * 0.55
    }))
  }

  private loop = (ts: number): void => {
    const dt = Math.min(0.033, (ts - this.lastTs) / 1000)
    this.lastTs = ts
    this.driftStars(dt, this.status === 'playing' ? this.speed : 120)
    if (this.status === 'playing') this.update(dt)
    this.draw(ts)
    this.animFrame = requestAnimationFrame(this.loop)
  }

  private driftStars(dt: number, speed: number): void {
    for (const star of this.stars) {
      star.y += (speed * 0.15 + star.s * 8) * dt
      if (star.y > HEIGHT) {
        star.y = -4
        star.x = Math.random() * WIDTH
      }
    }
  }

  private update(dt: number): void {
    this.player.displayLane += (this.player.lane - this.player.displayLane) * Math.min(1, dt * 14)
    this.speed = nextSpeed(this.score)
    this.spawnTimer -= dt * 1000
    if (this.spawnTimer <= 0) {
      this.spawn()
      this.spawnTimer = Math.max(420, SPAWN_EVERY_MS - this.score * 4)
    }

    const py = this.player.y
    const px = laneCenterX(this.player.displayLane, WIDTH, PADDING)
    const next: Entity[] = []

    for (const entity of this.entities) {
      entity.y += this.speed * dt
      if (entity.y - entity.height > HEIGHT + 40) continue

      const ex = laneCenterX(entity.lane, WIDTH, PADDING)
      if (entity.kind === 'gem') {
        if (
          circlesOverlap(
            { x: px, y: py, radius: this.player.radius },
            { x: ex, y: entity.y, radius: entity.radius }
          )
        ) {
          this.score += scoreForGem(5, this.combo)
          this.combo += 1
          if (this.score > this.best) this.best = this.score
          this.callbacks.onScore(this.score, this.best)
          continue
        }
      } else {
        const gateW = (WIDTH - PADDING * 2) / 3 - 18
        if (
          circleHitsRect(
            { x: px, y: py, radius: this.player.radius * 0.85 },
            { x: ex - gateW / 2, y: entity.y - entity.height / 2, width: gateW, height: entity.height }
          )
        ) {
          this.gameOver()
          return
        }
      }
      next.push(entity)
    }
    this.entities = next
  }

  private spawn(): void {
    const lane = Math.floor(Math.random() * 3) as Lane
    const roll = Math.random()
    if (roll < 0.58) {
      this.entities.push({
        id: this.nextId++,
        kind: 'gate',
        lane,
        y: -40,
        radius: 0,
        height: 28
      })
    } else {
      this.entities.push({
        id: this.nextId++,
        kind: 'gem',
        lane,
        y: -30,
        radius: 11,
        height: 22
      })
    }

    // Occasional second gem in another lane for rhythm
    if (Math.random() < 0.28) {
      const other = clampLane((lane + 1 + Math.floor(Math.random() * 2)) % 3)
      this.entities.push({
        id: this.nextId++,
        kind: 'gem',
        lane: other,
        y: -90,
        radius: 11,
        height: 22
      })
    }
  }

  private gameOver(): void {
    this.status = 'over'
    this.combo = 0
    if (this.score > this.best) this.best = this.score
    this.callbacks.onGameOver(this.score, this.best)
  }

  private draw(ts: number): void {
    const { ctx } = this
    const g = ctx.createLinearGradient(0, 0, 0, HEIGHT)
    g.addColorStop(0, '#07131c')
    g.addColorStop(0.55, '#0b1f2c')
    g.addColorStop(1, '#102a24')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, WIDTH, HEIGHT)

    for (const star of this.stars) {
      ctx.globalAlpha = star.a
      ctx.fillStyle = '#d7f3ff'
      ctx.beginPath()
      ctx.arc(star.x, star.y, star.s, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.globalAlpha = 1

    // Lanes
    const usable = WIDTH - PADDING * 2
    const laneW = usable / 3
    for (let i = 0; i < 3; i++) {
      const x = PADDING + i * laneW
      ctx.fillStyle = i === 1 ? 'rgba(56, 189, 160, 0.06)' : 'rgba(255,255,255,0.03)'
      ctx.fillRect(x + 4, 0, laneW - 8, HEIGHT)
      ctx.strokeStyle = 'rgba(120, 200, 180, 0.18)'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(x + 4, 0)
      ctx.lineTo(x + 4, HEIGHT)
      ctx.stroke()
    }

    // Entities
    for (const entity of this.entities) {
      const x = laneCenterX(entity.lane, WIDTH, PADDING)
      if (entity.kind === 'gem') {
        const pulse = 1 + Math.sin(ts / 180 + entity.id) * 0.08
        ctx.save()
        ctx.translate(x, entity.y)
        ctx.rotate(Math.PI / 4)
        ctx.scale(pulse, pulse)
        ctx.fillStyle = '#f0b429'
        ctx.shadowColor = 'rgba(240, 180, 41, 0.55)'
        ctx.shadowBlur = 12
        ctx.fillRect(-entity.radius, -entity.radius, entity.radius * 2, entity.radius * 2)
        ctx.restore()
      } else {
        const w = laneW - 18
        ctx.fillStyle = '#6d7f8d'
        ctx.strokeStyle = '#9eb0bf'
        ctx.lineWidth = 2
        ctx.beginPath()
        roundRect(ctx, x - w / 2, entity.y - entity.height / 2, w, entity.height, 8)
        ctx.fill()
        ctx.stroke()
        ctx.fillStyle = 'rgba(8, 16, 22, 0.35)'
        ctx.fillRect(x - w / 2 + 8, entity.y - 4, w - 16, 8)
      }
    }

    // Player
    const px = laneCenterX(this.player.displayLane, WIDTH, PADDING)
    const bob = Math.sin(ts / 220) * 3
    ctx.save()
    ctx.translate(px, this.player.y + bob)
    ctx.fillStyle = '#3fd0a8'
    ctx.shadowColor = 'rgba(63, 208, 168, 0.55)'
    ctx.shadowBlur = 16
    ctx.beginPath()
    ctx.moveTo(0, -this.player.radius)
    ctx.lineTo(this.player.radius * 0.9, this.player.radius * 0.85)
    ctx.lineTo(0, this.player.radius * 0.45)
    ctx.lineTo(-this.player.radius * 0.9, this.player.radius * 0.85)
    ctx.closePath()
    ctx.fill()
    ctx.fillStyle = '#e8fff7'
    ctx.beginPath()
    ctx.arc(0, -2, 4, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()

    // Soft vignette
    const vig = ctx.createRadialGradient(WIDTH / 2, HEIGHT / 2, HEIGHT * 0.2, WIDTH / 2, HEIGHT / 2, HEIGHT * 0.75)
    vig.addColorStop(0, 'rgba(0,0,0,0)')
    vig.addColorStop(1, 'rgba(0,0,0,0.35)')
    ctx.fillStyle = vig
    ctx.fillRect(0, 0, WIDTH, HEIGHT)
  }
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
): void {
  const radius = Math.min(r, w / 2, h / 2)
  ctx.moveTo(x + radius, y)
  ctx.arcTo(x + w, y, x + w, y + h, radius)
  ctx.arcTo(x + w, y + h, x, y + h, radius)
  ctx.arcTo(x, y + h, x, y, radius)
  ctx.arcTo(x, y, x + w, y, radius)
  ctx.closePath()
}
