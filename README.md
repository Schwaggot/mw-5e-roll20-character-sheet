# MW 5E Roll20 Character Sheet

Roll20 character sheet for a Modern Warfare 5E campaign, plus a local Vite
preview so you don't have to upload to Roll20 just to see a layout change.

## Use

```bash
npm install       # once
npm run dev       # http://localhost:5173
npm run build     # one-shot sync of src/ → root (CI / sanity check)
```

Edit files under `src/`. While `npm run dev` is running, the root `sheet.html`
and `sheet.css` are rebuilt from `src/` on every save (and on server start),
so the autouploader always sees a fresh artifact. `npm run build` does the
same sync as a one-shot for CI or offline edits.

Upload the root `sheet.html` + `sheet.css` to Roll20
(Settings → Game Settings → Character Sheet Template → Custom), or point
your autouploader at the repo root.

## Layout

```
src/sheet.html                  HTML fragment (header, tabs, rolltemplates); <!-- SHEET_WORKER --> placeholder marks where the worker is injected
src/sheet-worker.js             sheet-worker JavaScript, edited as plain JS
src/css/base/*.css              shared styles (root, header, tab nav, checkboxes, buttons, …)
src/css/tabs/<tab>.css          per-tab styles: overview, skills, gear, features
src/css/rolltemplates.css       chat rolltemplate styles

sheet.html, sheet.css           build output at root, the only Roll20 artifacts
preview/index.html              dev-only entry (full HTML doc wrapper)
preview/main.js                 boots the stub, hydrates repeating sections, evals the worker
preview/roll20-stub.js          on / getAttrs / setAttrs / getSectionIDs / startRoll / finishRoll
vite.config.mjs                 Vite root = preview/; serves /__sheet-fragment + /__sheet-css
scripts/build.mjs               src/ → root assembly (imported by Vite + CLI for `npm run build`)
```

The repo root intentionally contains no HTML other than `sheet.html`, so
autouploader extensions pointed at the root can't confuse the dev entry for
the Roll20 sheet.

`sheet.html` at the root is `src/sheet.html` with the `<!-- SHEET_WORKER -->`
placeholder replaced by `<script type="text/worker">…</script>` wrapping
`src/sheet-worker.js` verbatim. The resulting file is byte-identical to what
you'd get by pasting the worker back inline.

`sheet.css` at the root is the concatenation of every file in `src/css/`, in
the order defined by `CSS_SOURCES` in `scripts/build.mjs` — base files first
(so per-tab rules can override them via the cascade), then `tabs/*`, then
`rolltemplates.css`. Each concatenated block is preceded by a
`/* === src/css/… === */` banner to make the generated file traceable back
to its source.

## How the preview works

Roll20 sheets are HTML fragments: Roll20 wraps them in `<div class="charsheet">`
and runs the `<script type="text/worker">` block in a sandbox with an
`on/getAttrs/setAttrs` API. A plain browser does none of that.

The preview reproduces it locally:

1. **Wrap.** `preview/index.html` is a full document with a
   `<div class="charsheet"><div id="sheet-root"></div></div>` and a link to
   `/__sheet-css` (served by the Vite plugin — concatenates `src/css/**/*.css`
   on every request, same order as the Roll20 artifact).
2. **Fetch + clean.** On boot, `preview/main.js` fetches `/__sheet-fragment`.
   The Vite plugin returns `src/sheet.html` with `<rolltemplate>` blocks
   stripped and `<script type="text/worker">` rewritten to
   `type="text/roll20-worker"` so the browser leaves it alone.
3. **Hydrate repeating sections.** Each `<fieldset class="repeating_xxx">` is
   turned into a `.repcontainer` with an add-row button; rows get Roll20-style
   `attr_repeating_xxx_<rowid>_<field>` names and a delete button.
4. **Run the worker.** `main.js` finds each `text/roll20-worker` script and
   evals it with `on / getAttrs / setAttrs / getSectionIDs / startRoll /
   finishRoll / generateRowID` injected as locals. `roll20-stub.js` routes
   those through the live DOM, so derived fields (ability mods, prof bonus,
   encumbrance, stress tiers, …) update as you edit inputs.
5. **Chat log.** `startRoll` output is appended to a `#roll20-chat` div at the
   bottom of the page — no real dice math, just a record that a roll fired.

## Known limits

- **No dice.** `startRoll` returns an empty `results` object; `finishRoll`
  just logs. Visual rolls in Roll20 chat aren't reproduced.
- **Rolltemplates aren't rendered.** They only exist in Roll20 chat.
- **Repeating rows start empty.** Use the `+ Add` button under each section
  to create rows; they're not persisted across reloads.
- **Sync happens via the dev server.** The root artifacts are refreshed on
  every `src/` save while `npm run dev` is running. Edit `src/` with the
  server off and you'll need `npm run build` before pushing.
