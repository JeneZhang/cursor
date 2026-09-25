# 3D Snake

Browser-playable Snake on a 3D grid. Eat food to grow and score. Hit a wall or yourself to end the run, then restart.

No install step. Three.js loads from a CDN.

## Play locally

**Local server (recommended)** — import maps need `http://`, not `file://`:

```bash
cd snake-3d
python3 -m http.server 8080
```

Open [http://localhost:8080](http://localhost:8080). Optional: [http://localhost:8080/?food=8,7](http://localhost:8080/?food=8,7) places the first pellet directly in front of the snake.

## Controls

- **Start / restart:** Start button, Space, or Enter
- **Turn:** WASD or arrow keys
- Immediate reverse (180°) is ignored so you cannot fold into yourself in one tick

## Files

- `index.html` — page shell and overlay
- `style.css` — HUD and start / game-over panel
- `game.js` — grid rules (move, eat, collide, restart)
- `main.js` — Three.js arena and input
- `game.test.mjs` — rule checks for reverse / eat / die / restart

```bash
node --test game.test.mjs
```
