# Markdown Todo Desktop — Agent Benchmark Spec

## How to use this document

Give an agent this instruction:

> Build the project described in `SPEC.md` from scratch in an empty directory. Do not use any existing codebase. Follow all requirements, acceptance criteria, and test requirements. When finished, ensure `npm install`, `npm run build`, and `npm test` all succeed, and the app can be started with `npm start` (or `npm run dev`).

---

## Project brief

Build a **greenfield Mac desktop todo app** from scratch in an **empty directory**, using **Electron + React + TypeScript**. Todos are stored in a **single Markdown file** (`todos.md`) that humans can read and edit. The app must support full CRUD via a desktop UI and keep the Markdown file as the source of truth.

**Do not** depend on any existing codebase, monorepo, or shared libraries outside this project.

---

## Goals

- Create, list, view, update, complete, uncomplete, and delete todos via a desktop UI
- Search and filter todos (status, tag, priority)
- Persist all data in `todos.md` in a predictable, human-readable format
- Handle invalid input and corrupted files gracefully (errors shown in the UI)
- Include automated tests and a README with setup/run instructions
- Project should run with one install step and one command to launch

## Non-goals

- No database
- No web SaaS / hosted backend
- No cloud sync or multi-user support
- No authentication
- No CLI companion binary
- No recurring todos or reminders (unless all required features are complete)

---

## Tech constraints

- Use **TypeScript** with **strict mode** enabled (no `any`)
- Use **Node.js** (LTS, v20 or later)
- Package manager: **npm**
- Desktop shell: **Electron**
- UI: **React** + **Vite** (or electron-vite)
- Tests: **Vitest**
- Linting/formatting: **ESLint** + **Prettier** (or equivalent)
- Security: `contextIsolation: true`, `nodeIntegration: false`; renderer talks to main only via preload `contextBridge`

---

## Data model

Each todo has:

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `id` | string | yes | Stable UUID or short unique ID |
| `title` | string | yes | 1–200 chars, trimmed |
| `description` | string | no | Markdown supported |
| `status` | `open` \| `done` | yes | Default: `open` |
| `priority` | `low` \| `medium` \| `high` | no | Default: `medium` |
| `tags` | string[] | no | Lowercase, no spaces; use `-` |
| `createdAt` | ISO 8601 string | yes | Set on create |
| `updatedAt` | ISO 8601 string | yes | Update on every change |
| `completedAt` | ISO 8601 string \| null | yes | `null` unless `done` |

---

## Markdown file format (`todos.md`)

Store todos in one file with this structure:

```md
# Todos

<!-- todo-app-format: v1 -->

## [open] Buy groceries (id: abc123, priority: high, tags: errands, home)
Created: 2026-07-20T10:00:00.000Z
Updated: 2026-07-20T10:00:00.000Z

- [ ] Milk
- [ ] Eggs

---

## [done] Write spec (id: def456, priority: medium, tags: work)
Created: 2026-07-19T09:00:00.000Z
Updated: 2026-07-20T08:30:00.000Z
Completed: 2026-07-20T08:30:00.000Z

Ship the first version.

---
```

### Format rules

1. File starts with `# Todos` and a format marker comment `<!-- todo-app-format: v1 -->`
2. Each todo is an `##` heading:
   - `## [status] Title (id: ..., priority: ..., tags: ...)`
   - `tags` omitted if empty
   - `priority` omitted if `medium`
3. Metadata lines immediately after heading:
   - `Created: ...`
   - `Updated: ...`
   - `Completed: ...` only when `status=done`
4. Description body follows metadata (Markdown allowed)
5. Todos separated by `---`
6. On write, the app **normalizes** the full managed file (documents this in the README). Manual edits that follow the format are parsed on next open/reload.

---

## File handling

- User can **create** a new `todos.md` (Save dialog) or **open** an existing one (Open dialog)
- Remember the last opened path across launches (userData prefs)
- On first launch with no remembered file: show an empty state with Create / Open actions
- All filesystem IO happens in the **main process**; renderer never touches the disk directly
- Writes must be **atomic** (write temp file then rename) so failed operations do not corrupt `todos.md`

---

## UI capabilities

### 1. Create / Open file

- Create new empty template file
- Open existing `todos.md`
- Display current file path in the UI

### 2. Add todo

- Form fields: title (required), description, priority, tags (comma-separated)
- Generates `id` and timestamps
- Persists immediately to `todos.md`

### 3. List + filters

- Show todos with at least: short id, status, priority, title
- Filters: status, tag, priority (AND logic when combined)
- Default sort: `open` first, then `high` → `medium` → `low`, then `createdAt` ascending

### 4. Detail / edit

- Selecting a todo shows full details
- Update title, description, priority, tags
- Sets `updatedAt` on save
- Validates inputs before persist

### 5. Complete / Uncomplete

- Mark done: `status=done`, set `completedAt`
- Mark open: `status=open`, clear `completedAt`

### 6. Delete

- Confirm via native dialog (or in-app confirm) before delete
- Removes todo from `todos.md`

### 7. Search

- Case-insensitive search across `title`, `description`, and `tags`
- Returns matching todos in the list view

### 8. Errors

- Validation and parse errors shown clearly in the UI (banner or dialog)
- Malformed `todos.md` should report a readable message, ideally with line number
- Duplicate IDs: error with a repair suggestion

---

## Validation rules

- Empty title → error
- Invalid priority/status → error
- Duplicate `id` in file → error with repair suggestion
- Malformed `todos.md` → readable error pointing to line number when possible
- Tag normalization: trim, lowercase, replace spaces with `-`

---

## Project structure (expected)

```text
.
├── package.json
├── tsconfig.json
├── electron.vite.config.ts   # or equivalent Vite + Electron config
├── README.md
├── src/
│   ├── shared/               # types, validation, parser, writer, sort
│   ├── main/                 # Electron main, IPC, storage, todoService
│   ├── preload/              # contextBridge API
│   └── renderer/             # React UI
└── tests/
    ├── parser.test.ts
    ├── writer.test.ts
    └── todoService.test.ts
```

Exact layout can vary, but separation of parse/write/main/renderer is required.

---

## README requirements

Include:

1. Prerequisites (Node version, macOS for running the desktop app)
2. Install steps
3. Build/run instructions (`npm start` / `npm run dev`, `npm run build`)
4. How to use the UI (create/open file, CRUD, search, filters)
5. `todos.md` format explanation + normalize-on-write note
6. How to run tests

---

## Test requirements (minimum)

Write automated tests for:

### Parser

- Parse valid `todos.md` with multiple todos
- Handle missing optional fields
- Fail on malformed heading/metadata

### Writer

- Round-trip: model → markdown → model
- `done`/`undone` updates `completedAt` correctly

### Todo service / domain

- `add` creates todo and persists
- List filtering works
- `update`, `done`, `delete` behavior
- `search` matches title/description/tags

### Edge cases

- Empty file / init template
- Duplicate ID detection
- Invalid field values

Target: all tests passing via `npm test`.

---

## Acceptance criteria

The task is complete when:

- [ ] `npm install && npm run build` succeeds
- [ ] `npm test` passes
- [ ] App starts with `npm start` or `npm run dev`
- [ ] Create/open `todos.md` works
- [ ] Full CRUD + search + filters work end-to-end in the UI
- [ ] Manual edits to `todos.md` are parsed correctly on next open/reload
- [ ] Invalid file/input produces clear UI errors
- [ ] README documents setup and usage
- [ ] No `any` in TypeScript (strict typing)
- [ ] Renderer uses preload bridge (no direct Node in renderer)

---

## Suggested implementation workflow

1. Scaffold Electron + Vite + React + TypeScript tooling
2. Define shared types, validation, parser, writer
3. Implement main-process storage + todo service + IPC
4. Build React UI wired to the preload API
5. Add automated tests
6. Write README and verify fresh setup

---

## Optional stretch goals

Only after core requirements are complete:

- Export / import JSON or CSV
- Watch `todos.md` on disk and reload when externally edited
- electron-builder packaged `.dmg` for macOS distribution
- Dark / light appearance following system preference

---

## Example end-to-end demo

```bash
npm install
npm run build
npm test
npm start   # or: npm run dev
```

In the app:

1. Create a new `todos.md`
2. Add “Buy groceries” (priority high, tags `errands`)
3. Add “Write report” (tags `work`)
4. Filter list to open / high priority
5. Search “report”
6. Mark a todo done, then undone
7. Edit title and save
8. Delete a todo (confirm)
9. Quit, hand-edit `todos.md`, reopen — changes appear

---

## Manual verification script

After the agent finishes, run this checklist:

```bash
# 1. Fresh install
rm -rf node_modules dist out release
npm install
npm run build
npm test

# 2. Launch
npm start   # or npm run dev
```

Then in the UI:

1. Create new file → empty list
2. Add two todos with different priorities/tags
3. Filter by status / priority / tag
4. Search by title fragment
5. Open detail, edit, save
6. Toggle done / undone
7. Delete with confirmation
8. Hand-edit `todos.md` externally, reopen or reload → list updates
9. Open a deliberately malformed file → clear error (ideally with line number)
