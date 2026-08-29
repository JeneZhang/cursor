# Markdown Todo Desktop

This repository currently contains three apps:

- **Markdown Todo Desktop** — Electron + React todo app backed by `todos.md` (original project)
- **[办公 Agent 情报台](./competitor-monitor/README.md)** — P1 website for monitoring office-agent competitor updates
- **[2048 小游戏](./game-2048/README.md)** — browser 2048 game with undo, board sizes, and keyboard/swipe controls

---

A Mac-friendly **Electron + React + TypeScript** desktop app that stores todos in a single human-readable Markdown file (`todos.md`).

## Prerequisites

- **Node.js** 20+ (LTS recommended)
- **npm**
- macOS recommended for day-to-day use (Electron also builds on Linux/Windows for development)

## Install

```bash
npm install
```

## Run

Development (hot reload):

```bash
npm run dev
```

Preview the production build:

```bash
npm run build
npm start
```

## Test

```bash
npm test
```

## Lint / format

```bash
npm run lint
npm run format
```

## Using the app

1. **New file** — create a fresh `todos.md` via the save dialog
2. **Open…** — open an existing Markdown todo file
3. **Add todo** — title (required), description, priority, comma-separated tags
4. **List** — shows id (short), status, priority, and title
5. **Filters** — status, priority, and tag (AND logic). Disabled while a search query is active
6. **Search** — case-insensitive match across title, description, and tags
7. **Detail** — edit fields and **Save**; **Mark done** / **Mark open**; **Delete** (native confirm)
8. **Reload** — re-read the current file from disk (useful after hand-editing)

The last opened path is remembered across launches.

## `todos.md` format

```md
# Todos

<!-- todo-app-format: v1 -->

## [open] Buy groceries (id: abc123, priority: high, tags: errands, home)
Created: 2026-07-20T10:00:00.000Z
Updated: 2026-07-20T10:00:00.000Z

- [ ] Milk
- [ ] Eggs

---

## [done] Write spec (id: def456, tags: work)
Created: 2026-07-19T09:00:00.000Z
Updated: 2026-07-20T08:30:00.000Z
Completed: 2026-07-20T08:30:00.000Z

Ship the first version.

---
```

Rules:

- File starts with `# Todos` and `<!-- todo-app-format: v1 -->`
- Each todo is an `## [status] Title (id: …, priority?: …, tags?: …)` heading
- `priority` is omitted when `medium`; `tags` omitted when empty
- Metadata: `Created`, `Updated`, and `Completed` (only when done)
- Description body follows metadata; todos are separated by `---`

**Normalize on write:** the app rewrites the full managed file when saving. Manual edits that follow this format are parsed on the next open/reload. Unknown free-form content outside the managed structure is not preserved.

## Architecture

- `src/shared` — types, validation, parser, writer, sort, domain helpers
- `src/main` — Electron main process, atomic file IO, IPC handlers, todo service
- `src/preload` — `contextBridge` API (`window.todoApi`)
- `src/renderer` — React UI

Renderer never touches the filesystem. Writes use a temp file + rename so failures do not corrupt `todos.md`.

## Project docs

- [SPEC.md](./SPEC.md) — full product requirements
- [AGENT_PROMPT.md](./AGENT_PROMPT.md) — agent bootstrap prompt
- [SCORING_RUBRIC.md](./SCORING_RUBRIC.md) — evaluation rubric
