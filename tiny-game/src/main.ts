import { LaneDriftEngine } from './game/engine'
import { THEME_KEY, nextTheme, parseTheme, type ThemeMode } from './theme'
import './style.css'

const BEST_KEY = 'lane-drift-best'

const canvasEl = document.querySelector<HTMLCanvasElement>('#game')
const overlayEl = document.querySelector<HTMLDivElement>('#overlay')
const overlayTitleEl = document.querySelector<HTMLHeadingElement>('#overlay-title')
const overlayCopyEl = document.querySelector<HTMLParagraphElement>('#overlay-copy')
const startBtnEl = document.querySelector<HTMLButtonElement>('#start-btn')
const scoreNode = document.querySelector<HTMLSpanElement>('#score')
const bestNode = document.querySelector<HTMLElement>('#best')
const themeToggleEl = document.querySelector<HTMLButtonElement>('#theme-toggle')
const themeLabelEl = document.querySelector<HTMLSpanElement>('#theme-label')
const themeColorMeta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')

if (
  !canvasEl ||
  !overlayEl ||
  !overlayTitleEl ||
  !overlayCopyEl ||
  !startBtnEl ||
  !scoreNode ||
  !bestNode ||
  !themeToggleEl ||
  !themeLabelEl
) {
  throw new Error('Missing required DOM nodes')
}

const canvas = canvasEl
const overlay = overlayEl
const overlayTitle = overlayTitleEl
const overlayCopy = overlayCopyEl
const startBtn = startBtnEl
const scoreEl = scoreNode
const bestEl = bestNode
const themeToggle = themeToggleEl
const themeLabel = themeLabelEl

const savedBest = Number(localStorage.getItem(BEST_KEY) ?? '0') || 0
bestEl.textContent = String(savedBest)

let theme: ThemeMode = parseTheme(localStorage.getItem(THEME_KEY))

function applyTheme(next: ThemeMode): void {
  theme = next
  document.documentElement.dataset.theme = next
  localStorage.setItem(THEME_KEY, next)
  const goingLight = next === 'light'
  themeLabel.textContent = goingLight ? 'Dark' : 'Light'
  themeToggle.setAttribute('aria-pressed', String(goingLight))
  themeToggle.setAttribute(
    'aria-label',
    goingLight ? 'Switch to dark theme' : 'Switch to light theme'
  )
  if (themeColorMeta) {
    themeColorMeta.content = goingLight ? '#eef7f4' : '#061018'
  }
  engine.setTheme(next)
}

const engine = new LaneDriftEngine(
  canvas,
  {
    onScore(score, best) {
      scoreEl.textContent = String(score)
      bestEl.textContent = String(best)
      localStorage.setItem(BEST_KEY, String(best))
    },
    onGameOver(score, best) {
      overlay.hidden = false
      overlay.classList.add('visible')
      overlayTitle.textContent = 'Drift ended'
      overlayCopy.textContent = `You scored ${score}. Best so far: ${best}.`
      startBtn.textContent = 'Play again'
      localStorage.setItem(BEST_KEY, String(best))
    },
    onReady() {
      /* reserved */
    }
  },
  savedBest,
  theme
)

applyTheme(theme)

function begin(): void {
  overlay.classList.remove('visible')
  overlay.hidden = true
  scoreEl.textContent = '0'
  engine.start()
}

startBtn.addEventListener('click', (e) => {
  e.stopPropagation()
  begin()
})

themeToggle.addEventListener('click', (e) => {
  e.stopPropagation()
  applyTheme(nextTheme(theme))
})

let touchStartX: number | null = null
let touchStartY: number | null = null

canvas.addEventListener(
  'touchstart',
  (e) => {
    const t = e.changedTouches[0]
    touchStartX = t.clientX
    touchStartY = t.clientY
  },
  { passive: true }
)

canvas.addEventListener(
  'touchend',
  (e) => {
    if (touchStartX == null || touchStartY == null) return
    const t = e.changedTouches[0]
    const dx = t.clientX - touchStartX
    const dy = t.clientY - touchStartY
    touchStartX = null
    touchStartY = null

    if (Math.abs(dx) < 18 && Math.abs(dy) < 18) {
      const rect = canvas.getBoundingClientRect()
      const localX = t.clientX - rect.left
      engine.move(localX < rect.width / 2 ? -1 : 1)
      return
    }

    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 24) {
      engine.move(dx < 0 ? -1 : 1)
    }
  },
  { passive: true }
)

canvas.addEventListener('click', (e) => {
  if (!overlay.hidden) return
  const rect = canvas.getBoundingClientRect()
  const localX = e.clientX - rect.left
  engine.move(localX < rect.width / 2 ? -1 : 1)
})

window.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
    e.preventDefault()
    engine.move(-1)
  } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
    e.preventDefault()
    engine.move(1)
  } else if ((e.key === 'Enter' || e.key === ' ') && !overlay.hidden) {
    e.preventDefault()
    begin()
  }
})

overlay.classList.add('visible')
overlay.hidden = false
engine.idle()
