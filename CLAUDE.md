Roll20 custom character sheet. Sources are split; `sheet.html` and `sheet.css`
at the repo root are **generated artifacts** uploaded to Roll20 by an
autouploader extension.

## Rules

- **Never edit** `sheet.html` or `sheet.css` at the repo root. Edit `src/`.
- **Never edit** `preview/` to change sheet behavior — it's dev-only scaffolding
  (stubs Roll20's sheet-worker API for local preview).
- Keep the `<!-- SHEET_WORKER -->` placeholder in `src/sheet.html`. The build
  replaces it with the contents of `src/sheet-worker.js` wrapped in
  `<script type="text/worker">…</script>`.
- Adding a new CSS file under `src/css/` requires also adding it to
  `CSS_SOURCES` in `scripts/build.mjs` — order matters (cascade).

## Where to edit

| Change                                  | File                                                                        |
|-----------------------------------------|-----------------------------------------------------------------------------|
| HTML markup                             | `src/sheet.html`                                                            |
| Sheet-worker JS (derived values, rolls) | `src/sheet-worker.js`                                                       |
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
