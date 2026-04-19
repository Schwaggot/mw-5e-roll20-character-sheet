Roll20 custom character sheet. Sources are split; `sheet.html` and `sheet.css`
at the repo root are **generated artifacts** uploaded to Roll20 by an
autouploader extension.

## Rules

- **Never edit** `sheet.html` or `sheet.css` at the repo root. Edit `src/`.
- **Never edit** `preview/` to change sheet behavior — it's dev-only scaffolding
  (stubs Roll20's sheet-worker API for local preview).
- `src/sheet.html` is a thin skeleton. Keep the `<!-- SHEET_WORKER -->`
  placeholder (replaced with the worker script) and the
  `<!-- INCLUDE: src/html/… -->` directives (replaced with the partial's
  contents). One INCLUDE per line, directive-line indentation is discarded.
- Adding a new HTML partial: drop a file under `src/html/` and add an
  INCLUDE line in the skeleton. No build-script changes needed.
- Adding a new CSS file under `src/css/`: also add it to `CSS_SOURCES` in
  `scripts/build.mjs` — order matters (cascade).
- Adding a new worker file under `src/worker/`: also add it to
  `WORKER_SOURCES` in `scripts/build.mjs`. All files concat into one
  `<script type="text/worker">` block — consts/functions declared in one
  file are visible to later-concatenated files, so list dependencies before
  dependents.

## Where to edit

| Change                                  | File                                                                        |
|-----------------------------------------|-----------------------------------------------------------------------------|
| HTML markup                             | `src/html/header.html`, `src/html/tabs-nav.html`, `src/html/tabs/<tab>.html`, `src/html/rolltemplates.html` (skeleton in `src/sheet.html`) |
| Sheet-worker JS (derived values, rolls) | `src/worker/<topic>.js` — `core.js`, `skills.js`, `overview/*.js`, `gear/*.js`, `features/*.js` |
| Styling                                 | `src/css/base/*.css` (shared) or `src/css/tabs/<tab>.css`                   |
| Roll-template chat output               | `src/css/rolltemplates.css` and `<rolltemplate>` blocks in `src/sheet.html` |
| Dev-preview wrapping / Roll20 API stub  | `preview/main.js`, `preview/roll20-stub.js`                                 |
| Build / concat order                    | `scripts/build.mjs`                                                         |

## Workflow

1. `npm run dev` — Vite serves `http://localhost:5173`, auto-rebuilds root
   artifacts on any `src/` save, full-reloads the browser.
2. Edit, verify in the browser (check console for worker errors).
3. `npm run build` — one-shot sync, only needed if you edited with the dev
   server off.
4. The autouploader picks up root `sheet.html` + `sheet.css` on its own.

## Preview limitations (don't "fix" these)

- `startRoll` is stubbed — no real dice math; verify rolls in Roll20.
- `<rolltemplate>` blocks are stripped from the preview (they only render
  in Roll20 chat).
- Repeating rows start empty; use the `+ Add` buttons.
