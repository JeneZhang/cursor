# Agent Prompt (copy-paste)

Use this as the initial message to the agent:

---

Build a Markdown Todo **Mac desktop app** from scratch in this empty directory.

Read and follow every requirement in `SPEC.md` exactly. Do not use any existing codebase or external project dependencies beyond normal npm packages.

Requirements summary:
- Electron + React + TypeScript (strict) + Vite
- Persist todos in a human-readable `todos.md` file
- UI flows: create/open file, add, list (with filters), detail/edit, done/undone, delete, search
- Main process owns filesystem IO; renderer uses a preload `contextBridge` API
- Automated tests (Vitest)
- README with setup and usage

When finished:
1. Run `npm install`, `npm run build`, and `npm test`
2. Fix any failures
3. Confirm all acceptance criteria in SPEC.md are met

Do not stop at planning — implement the full solution.
