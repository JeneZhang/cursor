# AGENTS.md

## Cursor Cloud specific instructions

This repo is a small monorepo with **two independent npm projects** that are NOT linked by a workspace. Each has its own `package.json` / lockfile and must be installed separately (the startup update script already runs `npm install` in both):

- **Markdown Todo Desktop** (repo root) — Electron 35 + React 19 + TypeScript app backed by a `todos.md` file.
- **办公 Agent 情报台 / Office Agent Signal Desk** (`competitor-monitor/`) — Vite + React 19 SPA dashboard. No backend/database.

Standard commands are documented in `README.md` (root) and `competitor-monitor/README.md`; scripts live in each `package.json`. Node 20+ is required (VM has Node 22).

### Non-obvious notes

- **Lint runs from the root only.** `npm run lint` at the root runs `eslint .` across the whole tree, so it also lints `competitor-monitor/` files. `competitor-monitor` has no separate lint script. There is currently one pre-existing eslint *warning* (react-refresh) in `competitor-monitor/src/lib/catalog-context.tsx` — expected, not an error.
- **Electron dev prints scary-but-harmless errors.** Running `npm run dev` at the root launches Electron on `DISPLAY=:1` and logs `bus.cc ... Failed to connect to the bus` (DBus) and GPU/`viz_main_impl` errors. These are expected in this headless-style Linux VM and do NOT prevent the window from rendering.
- **Dev server ports:** the Electron renderer dev server uses `5173`; the `competitor-monitor` Vite dev server uses `5174` (bound to `0.0.0.0`). Start it with `npm run dev` from `competitor-monitor/`.
- **GUI testing needs the display.** Full Electron UI flows (New file, Add todo) require `DISPLAY=:1`; file open/save uses native dialogs. Headless `npm test` (root) only covers shared parser/writer/service logic.
- **Persistence:** the Todo app writes to a user-chosen `todos.md` (last path remembered in Electron `userData/prefs.json`); `competitor-monitor` persists competitor edits to browser `localStorage` (seed data is bundled from `src/data/`). No env vars or secrets are required for either app.
