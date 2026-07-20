# Markdown Todo Desktop — Agent Scoring Rubric

Use this rubric to evaluate how well an agent performed on the [SPEC.md](./SPEC.md) benchmark.

**Total score: 100 points**

| Score | Rating |
|-------|--------|
| 90–100 | Excellent — production-quality greenfield delivery |
| 75–89 | Good — core works, minor gaps |
| 60–74 | Acceptable — usable but notable issues |
| 40–59 | Weak — major missing features or instability |
| 0–39 | Fail — does not run or core spec unmet |

---

## How to evaluate

1. Start in an **empty directory** (or delete the agent's output and re-run).
2. Give the agent only the spec (or the prompt in `AGENT_PROMPT.md`).
3. Do **not** help unless you are measuring "assisted" performance separately.
4. After the agent stops, run the **verification steps** in SPEC.md.
5. Score each section below. Use partial credit where noted.

Record:

- Agent name/model
- Date
- Time to completion (if tracked)
- Number of user interventions required

---

## 1. Build & bootstrap (10 points)

| Points | Criteria |
|--------|----------|
| 4 | `npm install && npm run build` succeeds on first try after agent finishes |
| 3 | Sensible project structure (`src/shared`, `src/main`, `src/preload`, `src/renderer`, tests, config) |
| 2 | `package.json` scripts work (`build`, `test`, `start`/`dev`) |
| 1 | TypeScript strict mode enabled |

**Deductions:**

- -2: Requires manual fixes to install or build
- -4: Cannot build without substantial human intervention
- -3: Renderer has `nodeIntegration: true` or no preload bridge

---

## 2. Functional correctness (30 points)

Score each UI capability (partial credit allowed):

| Capability | Points | Pass criteria |
|------------|--------|---------------|
| Create / open file | 3 | Creates valid `todos.md`; opens existing; remembers path |
| Add | 4 | Creates todo with id, timestamps, tags, priority |
| List + filters | 4 | Lists todos; filters by status/tag/priority; sensible sort |
| Detail / show | 3 | Shows full details for selected todo |
| Update | 4 | Partial updates work; updates `updatedAt` |
| Done / undone | 4 | Toggles status; manages `completedAt` |
| Delete | 4 | Deletes todo; confirmation works |
| Search | 4 | Case-insensitive match on title, description, tags |

**Deductions:**

- -2 per capability that is missing or clearly broken
- -5: Data loss or file corruption during normal operations

---

## 3. Markdown format compliance (15 points)

| Points | Criteria |
|--------|----------|
| 5 | Output matches spec format (headings, metadata, separators) |
| 4 | Round-trip: write → read → write preserves data |
| 3 | Manual edits to `todos.md` are parsed on next open/reload |
| 3 | Handles optional fields correctly (no tags, default priority) |

**Deductions:**

- -3: Format deviates but is internally consistent
- -5: Parser fails on valid spec-compliant files

---

## 4. Error handling & robustness (10 points)

| Points | Criteria |
|--------|----------|
| 3 | Invalid inputs produce clear UI errors |
| 3 | Malformed `todos.md` reports helpful error (ideally with line number) |
| 2 | Duplicate ID detection |
| 2 | Failed operations do not corrupt `todos.md` (atomic writes or equivalent) |

---

## 5. Tests (15 points)

| Points | Criteria |
|--------|----------|
| 5 | `npm test` passes |
| 4 | Parser tests cover valid + invalid input |
| 3 | Writer round-trip tests |
| 3 | Todo service / domain tests for core flows |

**Deductions:**

- -3: Tests exist but are trivial (e.g. only `expect(true).toBe(true)`)
- -5: Tests fail or were not run by agent

---

## 6. Code quality (10 points)

| Points | Criteria |
|--------|----------|
| 3 | Clear separation: shared parser/writer, main, preload, renderer |
| 2 | Strict TypeScript — no `any` |
| 2 | Readable naming and small focused functions |
| 2 | No obvious dead code or copy-paste duplication |
| 1 | Lint/format setup present and clean |

---

## 7. Documentation (5 points)

| Points | Criteria |
|--------|----------|
| 2 | README has install, build, and run instructions |
| 2 | UI usage documented (create/open, CRUD, search, filters) |
| 1 | `todos.md` format explained |

---

## 8. Agent autonomy & efficiency (5 bonus points)

Optional — only if you tracked session behavior:

| Points | Criteria |
|--------|----------|
| 2 | Completed without asking unnecessary clarifying questions |
| 2 | Ran build/tests and fixed failures independently |
| 1 | Finished in reasonable time (< 30 min unassisted) |

---

## Red flags (automatic major deductions)

Apply these on top of section scores:

| Issue | Deduction |
|-------|-----------|
| Hardcoded absolute paths | -5 |
| Committed `node_modules` or broken `.gitignore` | -3 |
| Uses a database despite spec | -10 |
| Web-only UI with no Electron shell | -10 |
| `todos.md` not used as source of truth | -15 |
| Project does not run at all | Cap total at 39 |

---

## Quick pass/fail checklist

Before detailed scoring, verify minimum viability:

- [ ] Project builds
- [ ] Tests pass
- [ ] App launches
- [ ] Add + list + done + delete work in sequence
- [ ] README exists

If fewer than 4 boxes are checked → **Fail (≤ 39)**.

---

## Scoring sheet (copy per run)

```text
Agent: _______________________
Model: _______________________
Date:  _______________________
Duration: ____________________
User interventions: ___________

1. Build & bootstrap     ___ / 10
2. Functional correctness ___ / 30
3. Markdown format        ___ / 15
4. Error handling         ___ / 10
5. Tests                  ___ / 15
6. Code quality           ___ / 10
7. Documentation          ___ / 5
8. Autonomy (bonus)       ___ / 5

Subtotal:                 ___ / 100
Red flag deductions:       ___
TOTAL:                    ___ / 100

Rating: _____________________

Notes:
-
-
-
```

---

## Follow-up challenge prompts (optional)

Use these to test iteration ability after the initial build. Score separately (+10 each, max +30).

1. **Filter combo:** Ensure list filters apply AND logic for tag + priority + status together.
2. **Due dates:** Add optional `dueAt` field to model, format, UI, and tests.
3. **Bug fix:** Introduce a malformed `todos.md` sample and ask the agent to show a graceful parse error with line numbers.

A strong agent should handle follow-ups without rewriting the entire project.
