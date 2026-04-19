// Build the Roll20 upload artifacts at the repo root from sources in src/.
// Exported for the Vite dev plugin (auto-sync on save); runnable as a CLI
// (`npm run build`) for one-shot builds / CI.

import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const INCLUDE_LINE = /^(\s*)<!--\s*INCLUDE:\s*(\S+)\s*-->\s*$/;

// CSS is split by tab + shared base. Files are concatenated in this exact
// order — base first (global resets, layout primitives, shared components),
// then per-tab styling, then chat rolltemplates. Order preserves cascade so
// that later rules (e.g. weapon-status state overrides) continue to win.
export const CSS_SOURCES = [
  'src/css/base/root.css',
  'src/css/base/header.css',
  'src/css/base/tabs-nav.css',
  'src/css/base/sections.css',
  'src/css/base/feature-trackers.css',
  'src/css/base/checkboxes.css',
  'src/css/base/rep-alignment.css',
  'src/css/base/buttons.css',
  'src/css/tabs/overview.css',
  'src/css/tabs/skills.css',
  'src/css/tabs/gear.css',
  'src/css/tabs/features.css',
  'src/css/rolltemplates.css',
];

const HTML_SOURCE = 'src/sheet.html';
const WORKER_SOURCE = 'src/sheet-worker.js';

export function buildCss() {
  const chunks = CSS_SOURCES.map((rel) => {
    const body = readFileSync(resolve(repoRoot, rel), 'utf8').replace(/\s+$/, '');
    return `/* === ${rel} === */\n${body}\n`;
  });
  return chunks.join('\n');
}

// Resolves `<!-- INCLUDE: path -->` lines by inlining the referenced file's
// contents. The include directive must sit alone on a line; indentation
// before the directive is discarded (the included file provides its own
// indentation). Trailing newlines on the included file are stripped so the
// directive's own line-terminator remains the sole separator — this is what
// makes the build output byte-identical to the pre-split source.
function resolveIncludes(text) {
  return text
    .split('\n')
    .map((line) => {
      const m = line.match(INCLUDE_LINE);
      if (!m) return line;
      const body = readFileSync(resolve(repoRoot, m[2]), 'utf8');
      return body.endsWith('\n') ? body.slice(0, -1) : body;
    })
    .join('\n');
}

export function buildHtml() {
  const skeleton = readFileSync(resolve(repoRoot, HTML_SOURCE), 'utf8');
  const inlined = resolveIncludes(skeleton);
  const worker = readFileSync(resolve(repoRoot, WORKER_SOURCE), 'utf8').replace(/\s+$/, '');
  if (!inlined.includes('<!-- SHEET_WORKER -->')) {
    throw new Error(`${HTML_SOURCE} is missing the <!-- SHEET_WORKER --> placeholder`);
  }
  const scriptBlock = `<script type="text/worker">\n${worker}\n</script>`;
  return inlined.replace('<!-- SHEET_WORKER -->', scriptBlock);
}

// Walk src/html/ to discover every included partial so the watcher can track
// them without a maintained static list.
function walkHtmlDir(abs, out = []) {
  for (const name of readdirSync(abs)) {
    const p = resolve(abs, name);
    if (statSync(p).isDirectory()) walkHtmlDir(p, out);
    else if (p.endsWith('.html')) out.push(p);
  }
  return out;
}

export function htmlSourcePaths() {
  const paths = [resolve(repoRoot, HTML_SOURCE), resolve(repoRoot, WORKER_SOURCE)];
  const htmlDir = resolve(repoRoot, 'src/html');
  try {
    paths.push(...walkHtmlDir(htmlDir));
  } catch {
    // src/html/ not present yet — ignore.
  }
  return paths;
}

export function cssSourcePaths() {
  return CSS_SOURCES.map((rel) => resolve(repoRoot, rel));
}

export function syncArtifacts({ log = false } = {}) {
  const html = buildHtml();
  writeFileSync(resolve(repoRoot, 'sheet.html'), html);
  const css = buildCss();
  writeFileSync(resolve(repoRoot, 'sheet.css'), css);
  if (log) {
    console.log(`  src/sheet.html + src/sheet-worker.js  →  sheet.html  (${html.length} bytes)`);
    console.log(`  ${CSS_SOURCES.length} css files                      →  sheet.css  (${css.length} bytes)`);
  }
}

// CLI entry.
if (import.meta.url === `file://${process.argv[1]}`) {
  syncArtifacts({ log: true });
  console.log('build: Roll20 upload artifacts synced.');
}
