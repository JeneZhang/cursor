# AGENTS.md

## Cursor Cloud specific instructions

### Overview

Photo Notes is a React Native (Expo SDK 54) mobile app for capturing and managing photo notes. On Linux VMs it runs in **web mode only** (`npx expo start --web`). The web build uses an in-memory note store (`src/db/index.web.ts`) — data does not persist across page refreshes.

### Running the app

See `README.md` for the full command reference. The key commands:

- `npm run web` — starts Expo dev server and opens web build (equivalent to `npx expo start --web`)
- `npm start` — starts Expo dev server (press `w` to open web)
- Default web port is `8081`

### Lint and type checking

There is no ESLint config in this project. Use TypeScript for type checking:

```bash
npx tsc --noEmit
```

### Testing notes

- No automated test suite exists yet (`jest`, `vitest`, etc. are not configured).
- Manual testing via the web build is the primary method on Linux VMs.
- Camera capture requires a physical camera — on VMs the Camera screen shows a "Grant permission" prompt but cannot take photos. All other navigation and CRUD flows work in web mode.
- The web in-memory DB (`src/db/index.web.ts`) resets on every page refresh. Native builds use SQLite (`src/db/index.ts`).
