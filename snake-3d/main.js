import * as THREE from 'three'
import { createGame, keyToDir } from './game.js'

const TICK_MS = 175
const CELL = 1

const canvas = document.getElementById('game-canvas')
const scoreEl = document.getElementById('score')
const overlayEl = document.getElementById('overlay')
const titleEl = document.getElementById('title')
const leadEl = document.getElementById('lead')
const eyebrowEl = document.getElementById('eyebrow')
const finalScoreEl = document.getElementById('final-score')
const startBtn = document.getElementById('start-btn')

function foodFromQuery() {
  const raw = new URLSearchParams(window.location.search).get('food')
  if (!raw) {
    return undefined
  }
  const [x, y] = raw.split(',').map(Number)
  if (!Number.isInteger(x) || !Number.isInteger(y)) {
    return undefined
  }
  return { x, y }
}

const game = createGame({ gridSize: 15, initialFood: foodFromQuery() })
let view = game.getState()
window.__snake = {
  getState: () => view,
  queueDirection: (dir) => {
    view = game.queueDirection(dir)
    return view
  }
}
let previousSnake = view.snake.map((cell) => ({ ...cell }))
let tickStartedAt = performance.now()

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
renderer.shadowMap.enabled = true

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x0b1220)
scene.fog = new THREE.Fog(0x0b1220, 26, 48)

const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 80)
camera.position.set(0, 17, 15)
camera.lookAt(0, 0, 0)

scene.add(new THREE.AmbientLight(0x9ec4ff, 0.55))
const hemi = new THREE.HemisphereLight(0xc8ffe0, 0x1a2a3d, 0.85)
scene.add(hemi)

const keyLight = new THREE.DirectionalLight(0xffffff, 1.25)
keyLight.position.set(8, 16, 6)
keyLight.castShadow = true
keyLight.shadow.mapSize.set(1024, 1024)
scene.add(keyLight)

const arena = new THREE.Group()
scene.add(arena)

const half = ((view.gridSize - 1) * CELL) / 2
const floorSize = view.gridSize * CELL

const floor = new THREE.Mesh(
  new THREE.PlaneGeometry(floorSize, floorSize),
  new THREE.MeshStandardMaterial({ color: 0x17324a, roughness: 0.88, metalness: 0.08 })
)
floor.rotation.x = -Math.PI / 2
floor.receiveShadow = true
arena.add(floor)

const grid = new THREE.GridHelper(floorSize, view.gridSize, 0x4fd68a, 0x2b6b58)
grid.position.y = 0.01
arena.add(grid)

const wallMat = new THREE.MeshStandardMaterial({
  color: 0x3d8a9c,
  emissive: 0x102830,
  roughness: 0.55,
  metalness: 0.2
})
const wallH = new THREE.BoxGeometry(floorSize + 0.35, 0.7, 0.28)
const wallV = new THREE.BoxGeometry(0.28, 0.7, floorSize + 0.35)
const walls = [
  new THREE.Mesh(wallH, wallMat),
  new THREE.Mesh(wallH, wallMat),
  new THREE.Mesh(wallV, wallMat),
  new THREE.Mesh(wallV, wallMat)
]
walls[0].position.set(0, 0.35, -half - 0.64)
walls[1].position.set(0, 0.35, half + 0.64)
walls[2].position.set(-half - 0.64, 0.35, 0)
walls[3].position.set(half + 0.64, 0.35, 0)
for (const wall of walls) {
  wall.castShadow = true
  wall.receiveShadow = true
  arena.add(wall)
}

const bodyGeo = new THREE.BoxGeometry(0.86, 0.62, 0.86)
const headMat = new THREE.MeshStandardMaterial({
  color: 0x8dffb0,
  emissive: 0x146b38,
  roughness: 0.35
})
const bodyMat = new THREE.MeshStandardMaterial({
  color: 0x3fce73,
  emissive: 0x08351c,
  roughness: 0.45
})
const foodMat = new THREE.MeshStandardMaterial({
  color: 0xff9a4d,
  emissive: 0xc44a12,
  roughness: 0.22
})

const snakeGroup = new THREE.Group()
arena.add(snakeGroup)

const foodMesh = new THREE.Mesh(new THREE.OctahedronGeometry(0.52, 0), foodMat)
foodMesh.castShadow = true
arena.add(foodMesh)
const foodGlow = new THREE.PointLight(0xff7a3a, 1.4, 6)
foodMesh.add(foodGlow)

function cellToWorld(cell, y = 0.38) {
  return new THREE.Vector3(cell.x * CELL - half, y, cell.y * CELL - half)
}

function lerpCell(from, to, t) {
  return {
    x: from.x + (to.x - from.x) * t,
    y: from.y + (to.y - from.y) * t
  }
}

function syncSnakeMeshes(count) {
  while (snakeGroup.children.length < count) {
    const mesh = new THREE.Mesh(bodyGeo, bodyMat)
    mesh.castShadow = true
    snakeGroup.add(mesh)
  }
  while (snakeGroup.children.length > count) {
    snakeGroup.remove(snakeGroup.children.at(-1))
  }
}

function renderHud() {
  scoreEl.textContent = String(view.score)
  const playing = view.status === 'playing'
  overlayEl.hidden = playing
  if (view.status === 'ready') {
    eyebrowEl.textContent = 'Grid arena'
    titleEl.classList.remove('dead-title')
    titleEl.textContent = '3D Snake'
    leadEl.textContent = 'Eat food to grow. Hit a wall or yourself and the run ends.'
    finalScoreEl.classList.add('hidden')
    startBtn.textContent = 'Start game'
  } else if (view.status === 'dead') {
    eyebrowEl.textContent = 'Game over'
    titleEl.classList.add('dead-title')
    titleEl.textContent = 'You crashed'
    leadEl.textContent = 'Walls and your own tail both end the run. Try again.'
    finalScoreEl.classList.remove('hidden')
    finalScoreEl.textContent = `Score ${view.score}`
    startBtn.textContent = 'Play again'
  }
}

function beginRun() {
  view = game.start()
  previousSnake = view.snake.map((cell) => ({ ...cell }))
  tickStartedAt = performance.now()
  renderHud()
}

function onKeyDown(event) {
  if (event.key === ' ' || event.key === 'Enter') {
    event.preventDefault()
    if (view.status !== 'playing') {
      beginRun()
    }
    return
  }

  const dir = keyToDir(event.key)
  if (!dir) {
    return
  }
  event.preventDefault()
  if (view.status === 'ready') {
    beginRun()
  }
  game.queueDirection(dir)
}

function resize() {
  const width = window.innerWidth
  const height = window.innerHeight
  renderer.setSize(width, height, false)
  camera.aspect = width / height
  camera.updateProjectionMatrix()
}

function tick(now) {
  if (view.status === 'playing' && now - tickStartedAt >= TICK_MS) {
    previousSnake = view.snake.map((cell) => ({ ...cell }))
    view = game.step()
    tickStartedAt = now
    renderHud()
  }
}

function paint(now) {
  tick(now)

  const progress =
    view.status === 'playing' ? Math.min(1, (now - tickStartedAt) / TICK_MS) : 1

  syncSnakeMeshes(view.snake.length)
  view.snake.forEach((cell, index) => {
    const from = previousSnake[index] ?? previousSnake.at(-1) ?? cell
    const pos = cellToWorld(lerpCell(from, cell, progress), index === 0 ? 0.44 : 0.38)
    const mesh = snakeGroup.children[index]
    mesh.position.copy(pos)
    mesh.material = index === 0 ? headMat : bodyMat
    mesh.scale.setScalar(index === 0 ? 1.08 : 1)
  })

  if (view.food) {
    foodMesh.visible = true
    const pulse = 1 + Math.sin(now * 0.008) * 0.08
    foodMesh.position.copy(cellToWorld(view.food, 0.5))
    foodMesh.rotation.y = now * 0.002
    foodMesh.scale.setScalar(pulse)
  } else {
    foodMesh.visible = false
  }

  renderer.render(scene, camera)
  requestAnimationFrame(paint)
}

startBtn.addEventListener('click', beginRun)
window.addEventListener('keydown', onKeyDown)
window.addEventListener('resize', resize)

resize()
renderHud()
requestAnimationFrame(paint)
