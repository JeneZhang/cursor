# Lane Drift

A tiny mobile-first endless lane game. Drift between three lanes, collect amber gems, and dodge steel gates.

## Play

```bash
cd tiny-game
npm install
npm run dev
```

Open the URL Vite prints (default `http://localhost:5174`). On a phone, use your LAN IP from the same network.

### Controls

- **Mobile:** swipe left/right, or tap the left/right half of the screen
- **Desktop:** `←` / `→` (or `A` / `D`); click left/right half of the canvas
- **Start / restart:** Play button, `Enter`, or `Space`

Best score is stored in `localStorage`.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Dev server with hot reload |
| `npm run build` | Typecheck + production build |
| `npm run preview` | Serve the production build |
| `npm test` | Unit tests (Vitest) |
