import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const GRID = 16;
const CELL = 1;
const ARENA = GRID * CELL;
const HALF = ARENA / 2;
const INITIAL_LENGTH = 3;
const BASE_TICK_MS = 180;
const MIN_TICK_MS = 90;
const HIGH_SCORE_KEY = 'snake3d-high-score';

const DIRECTIONS = {
  ArrowUp: { x: 0, y: 0, z: -1 },
  ArrowDown: { x: 0, y: 0, z: 1 },
  ArrowLeft: { x: -1, y: 0, z: 0 },
  ArrowRight: { x: 1, y: 0, z: 0 },
  KeyW: { x: 0, y: 0, z: -1 },
  KeyS: { x: 0, y: 0, z: 1 },
  KeyA: { x: -1, y: 0, z: 0 },
  KeyD: { x: 1, y: 0, z: 0 },
  KeyQ: { x: 0, y: -1, z: 0 },
  KeyE: { x: 0, y: 1, z: 0 },
};

const canvas = document.getElementById('game');
const scoreEl = document.getElementById('score');
const highScoreEl = document.getElementById('high-score');
const lengthEl = document.getElementById('length');
const overlay = document.getElementById('overlay');
const overlayTitle = document.getElementById('overlay-title');
const overlayText = document.getElementById('overlay-text');
const startBtn = document.getElementById('start-btn');

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x070b14);
scene.fog = new THREE.Fog(0x070b14, 18, 42);

const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 200);
camera.position.set(HALF + 8, HALF + 10, HALF + 12);

const controls = new OrbitControls(camera, canvas);
controls.target.set(HALF, HALF, HALF);
controls.enableDamping = true;
controls.enablePan = false;
controls.minDistance = 10;
controls.maxDistance = 40;
controls.update();

scene.add(new THREE.AmbientLight(0x6b8cff, 0.45));

const keyLight = new THREE.DirectionalLight(0xffffff, 1.1);
keyLight.position.set(10, 18, 8);
keyLight.castShadow = true;
scene.add(keyLight);

const fillLight = new THREE.PointLight(0x4cf0c5, 0.8, 50);
fillLight.position.set(HALF, HALF + 4, HALF);
scene.add(fillLight);

const arenaGroup = new THREE.Group();
scene.add(arenaGroup);

const floorGeo = new THREE.PlaneGeometry(ARENA, ARENA);
const floorMat = new THREE.MeshStandardMaterial({
  color: 0x0f1728,
  metalness: 0.2,
  roughness: 0.85,
});
const floor = new THREE.Mesh(floorGeo, floorMat);
floor.rotation.x = -Math.PI / 2;
floor.position.set(HALF, -0.01, HALF);
floor.receiveShadow = true;
arenaGroup.add(floor);

const gridHelper = new THREE.GridHelper(ARENA, GRID, 0x2a3d66, 0x16233d);
gridHelper.position.set(HALF, 0.001, HALF);
arenaGroup.add(gridHelper);

const edgeGeo = new THREE.BoxGeometry(ARENA, ARENA, ARENA);
const edgeMat = new THREE.MeshBasicMaterial({
  color: 0x4cf0c5,
  wireframe: true,
  transparent: true,
  opacity: 0.18,
});
const edgeBox = new THREE.Mesh(edgeGeo, edgeMat);
edgeBox.position.set(HALF, HALF, HALF);
arenaGroup.add(edgeBox);

const snakeMat = new THREE.MeshStandardMaterial({
  color: 0x4cf0c5,
  emissive: 0x1a6655,
  emissiveIntensity: 0.35,
  metalness: 0.35,
  roughness: 0.35,
});
const headMat = new THREE.MeshStandardMaterial({
  color: 0x7af0ff,
  emissive: 0x2a6677,
  emissiveIntensity: 0.55,
  metalness: 0.45,
  roughness: 0.25,
});
const foodMat = new THREE.MeshStandardMaterial({
  color: 0xff6b8a,
  emissive: 0x772233,
  emissiveIntensity: 0.75,
  metalness: 0.2,
  roughness: 0.4,
});

const segmentGeo = new THREE.BoxGeometry(CELL * 0.88, CELL * 0.88, CELL * 0.88);
const foodGeo = new THREE.IcosahedronGeometry(CELL * 0.42, 1);

const snakeMeshes = [];
let foodMesh = null;

let snake = [];
let direction = { x: 0, y: 0, z: 1 };
let nextDirection = { x: 0, y: 0, z: 1 };
let score = 0;
let highScore = Number(localStorage.getItem(HIGH_SCORE_KEY) || 0);
let running = false;
let paused = false;
let tickMs = BASE_TICK_MS;
let lastTick = 0;
let pendingDirection = null;

highScoreEl.textContent = String(highScore);

function cellKey(cell) {
  return `${cell.x},${cell.y},${cell.z}`;
}

function gridToWorld(cell) {
  return new THREE.Vector3(
    cell.x * CELL + CELL / 2,
    cell.y * CELL + CELL / 2,
    cell.z * CELL + CELL / 2,
  );
}

function isOpposite(a, b) {
  return a.x === -b.x && a.y === -b.y && a.z === -b.z;
}

function resetSnake() {
  const start = { x: Math.floor(GRID / 2), y: Math.floor(GRID / 2), z: Math.floor(GRID / 2) - 1 };
  snake = [];
  for (let i = 0; i < INITIAL_LENGTH; i += 1) {
    snake.push({ x: start.x, y: start.y, z: start.z - i });
  }
  direction = { x: 0, y: 0, z: 1 };
  nextDirection = { x: 0, y: 0, z: 1 };
  pendingDirection = null;
}

function clearMeshes() {
  snakeMeshes.forEach((mesh) => {
    arenaGroup.remove(mesh);
    mesh.geometry.dispose();
  });
  snakeMeshes.length = 0;

  if (foodMesh) {
    arenaGroup.remove(foodMesh);
    foodMesh.geometry.dispose();
    foodMesh = null;
  }
}

function syncSnakeMeshes() {
  while (snakeMeshes.length < snake.length) {
    const mesh = new THREE.Mesh(segmentGeo, snakeMat.clone());
    mesh.castShadow = true;
    arenaGroup.add(mesh);
    snakeMeshes.push(mesh);
  }
  while (snakeMeshes.length > snake.length) {
    const mesh = snakeMeshes.pop();
    arenaGroup.remove(mesh);
    mesh.geometry.dispose();
    mesh.material.dispose();
  }

  snake.forEach((cell, index) => {
    const mesh = snakeMeshes[index];
    const pos = gridToWorld(cell);
    mesh.position.copy(pos);
    mesh.material = index === 0 ? headMat : snakeMat;
    mesh.scale.setScalar(index === 0 ? 1.05 : 1);
  });
}

function occupiedCells() {
  return new Set(snake.map(cellKey));
}

function spawnFood() {
  const taken = occupiedCells();
  const free = [];
  for (let x = 0; x < GRID; x += 1) {
    for (let y = 0; y < GRID; y += 1) {
      for (let z = 0; z < GRID; z += 1) {
        const key = `${x},${y},${z}`;
        if (!taken.has(key)) free.push({ x, y, z });
      }
    }
  }
  if (free.length === 0) return null;
  return free[Math.floor(Math.random() * free.length)];
}

function placeFood() {
  const food = spawnFood();
  if (!food) return;

  if (!foodMesh) {
    foodMesh = new THREE.Mesh(foodGeo, foodMat);
    foodMesh.castShadow = true;
    arenaGroup.add(foodMesh);
  }
  foodMesh.position.copy(gridToWorld(food));
  foodMesh.userData.cell = food;
}

function updateHud() {
  scoreEl.textContent = String(score);
  highScoreEl.textContent = String(highScore);
  lengthEl.textContent = String(snake.length);
}

function showOverlay(title, text, buttonLabel) {
  overlayTitle.textContent = title;
  overlayText.textContent = text;
  startBtn.textContent = buttonLabel;
  overlay.classList.add('visible');
}

function hideOverlay() {
  overlay.classList.remove('visible');
}

function gameOver(reason) {
  running = false;
  if (score > highScore) {
    highScore = score;
    localStorage.setItem(HIGH_SCORE_KEY, String(highScore));
  }
  updateHud();
  showOverlay('游戏结束', `${reason} 最终得分 ${score}，长度 ${snake.length}。`, '再来一局');
}

function tick() {
  if (pendingDirection && !isOpposite(pendingDirection, direction)) {
    nextDirection = pendingDirection;
  }
  pendingDirection = null;
  direction = nextDirection;

  const head = snake[0];
  const next = {
    x: head.x + direction.x,
    y: head.y + direction.y,
    z: head.z + direction.z,
  };

  if (next.x < 0 || next.y < 0 || next.z < 0 || next.x >= GRID || next.y >= GRID || next.z >= GRID) {
    gameOver('撞到了边界。');
    return;
  }

  const bodyWithoutTail = snake.slice(0, -1);
  if (bodyWithoutTail.some((cell) => cell.x === next.x && cell.y === next.y && cell.z === next.z)) {
    gameOver('咬到了自己。');
    return;
  }

  snake.unshift(next);

  const foodCell = foodMesh?.userData.cell;
  const ateFood =
    foodCell && next.x === foodCell.x && next.y === foodCell.y && next.z === foodCell.z;

  if (ateFood) {
    score += 10;
    tickMs = Math.max(MIN_TICK_MS, BASE_TICK_MS - Math.floor(score / 30) * 8);
    placeFood();
  } else {
    snake.pop();
  }

  if (!foodMesh?.userData.cell) {
    gameOver('你填满了整个空间！');
    return;
  }

  syncSnakeMeshes();
  updateHud();
}

function startGame() {
  clearMeshes();
  resetSnake();
  score = 0;
  tickMs = BASE_TICK_MS;
  running = true;
  paused = false;
  syncSnakeMeshes();
  placeFood();
  updateHud();
  hideOverlay();
  lastTick = performance.now();
}

function handleKeyDown(event) {
  if (event.code === 'Space') {
    event.preventDefault();
    if (!running) return;
    paused = !paused;
    overlayTitle.textContent = paused ? '已暂停' : '准备出发';
    overlayText.textContent = paused ? '按空格或点击按钮继续。' : '';
    startBtn.textContent = paused ? '继续' : '开始游戏';
    if (paused) overlay.classList.add('visible');
    else hideOverlay();
    return;
  }

  const next = DIRECTIONS[event.code];
  if (!next) return;
  event.preventDefault();
  if (!running || paused) return;
  if (pendingDirection && isOpposite(next, pendingDirection)) return;
  if (!pendingDirection && isOpposite(next, direction)) return;
  pendingDirection = next;
}

startBtn.addEventListener('click', () => {
  if (running && paused) {
    paused = false;
    hideOverlay();
    lastTick = performance.now();
    return;
  }
  startGame();
});

window.addEventListener('keydown', handleKeyDown);

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

function animate(now) {
  requestAnimationFrame(animate);

  if (running && !paused && now - lastTick >= tickMs) {
    tick();
    lastTick = now;
  }

  if (foodMesh) {
    foodMesh.rotation.x += 0.02;
    foodMesh.rotation.y += 0.03;
    foodMesh.position.y += Math.sin(now * 0.004) * 0.003;
  }

  controls.update();
  renderer.render(scene, camera);
}

resetSnake();
syncSnakeMeshes();
placeFood();
updateHud();
requestAnimationFrame(animate);
