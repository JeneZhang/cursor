# AGENTS.md

## Cursor Cloud specific instructions

This is a **Markdown Todo Desktop** app: Electron + React + TypeScript, bundled with `electron-vite`. Todos are persisted to a human-readable `todos.md` file. See `README.md` and `SPEC.md` for product details and `package.json` for the canonical scripts.

### Services / commands

There is a single app (no backend service). Standard commands (from `package.json`):

- Lint: `npm run lint`
- Test: `npm test` (Vitest, headless, no display needed)
- Build: `npm run build`
- Dev run: `npm run dev` (starts the Vite dev server + launches Electron)

### Running the Electron GUI in the cloud VM (non-obvious)

The VM is headless, so the Electron window needs an X display. All Electron system libraries and `Xvfb` are already present on the base image — no extra apt installs are required.

- A virtual display is typically already running on `:1` (this is also what computer-use/manual GUI testing attaches to). Launch the app against it so it is interactable:
  - `DISPLAY=:1 ELECTRON_DISABLE_SANDBOX=1 npm run dev`
- `ELECTRON_DISABLE_SANDBOX=1` is required because the Chromium sandbox does not work in this container.
- The `Failed to connect to the bus` (D-Bus) and GPU/`viz_main_impl`/`command_buffer` errors in the logs are expected in this headless environment and are **not** fatal — the app still runs and renders.
- If no display is available, start one: `Xvfb :99 -screen 0 1280x900x24 -nolisten tcp &` then use `DISPLAY=:99`. Prefer `:1` when it exists so GUI testing tools can see the window.
- Creating/opening a file uses native GTK dialogs; the default save path for a new file is the current working directory (`/workspace/todos.md`).

### Notes

- `todos.md` (and `*.todo.md`) are git-ignored; the app writes them at runtime and they should not be committed.
- Run `npm run dev` (development), not `npm run build` + `npm start` (production preview), for day-to-day development.
