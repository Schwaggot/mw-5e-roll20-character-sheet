// Build the Roll20 upload artifacts at the repo root from sources in src/.
// Exported for the Vite dev plugin (auto-sync on save); runnable as a CLI
// (`npm run build`) for one-shot builds / CI.

import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

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

// Sheet-worker JS is split by topic. Every file is concatenated into one
// `<script type="text/worker">` block in this order — roughly "fundamentals
// → gear → overview state → features", mirroring the original declaration
// order closely enough that handler-registration side effects are preserved.
// Adding a new file: add a banner + file, add it here.
export const WORKER_SOURCES = [
  'src/worker/core.js',
  'src/worker/gear/encumbrance.js',
  'src/worker/features/designation.js',
  'src/worker/features/drone.js',
  'src/worker/gear/weapons-combat.js',
  'src/worker/gear/weapons-data.js',
  'src/worker/skills.js',
  'src/worker/overview/stress.js',
  'src/worker/overview/hp-rest.js',
  'src/worker/features/personality.js',
  'src/worker/gear/armor.js',
  'src/worker/gear/grenades.js',
  'src/worker/gear/inventory.js',
  'src/worker/features/leadership.js',
  'src/worker/features/medic.js',
  'src/worker/features/companions.js',
];

const HTML_SOURCE = 'src/sheet.html';

export function buildCss() {
  const chunks = CSS_SOURCES.map((rel) => {
    const body = readFileSync(resolve(repoRoot, rel), 'utf8').replace(/\s+$/, '');
    return `/* === ${rel} === */\n${body}\n`;
  });
  return chunks.join('\n');
}

export function buildWorker() {
  // Banners are indented 2 spaces to match the surrounding worker code's
  // indentation (it was originally inside a 2-space-indented <script> body).
  const chunks = WORKER_SOURCES.map((rel) => {
    const body = readFileSync(resolve(repoRoot, rel), 'utf8').replace(/\s+$/, '');
    return `  // === ${rel} ===\n${body}\n`;
  });
  return chunks.join('\n');
}

// Resolves `<!-- INCLUDE: path -->` lines by inlining the referenced file's
// contents. The include directive must sit alone on a line; indentation
// before the directive is discarded (the included file provides its own
// indentation). Trailing newlines on the included file are stripped so the
// directive's own line-terminator remains the sole separator — this is what
// keeps the non-worker portion of the build output aligned with the source.
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
  if (!inlined.includes('<!-- SHEET_WORKER -->')) {
    throw new Error(`${HTML_SOURCE} is missing the <!-- SHEET_WORKER --> placeholder`);
  }
  const scriptBlock = `<script type="text/worker">\n${buildWorker()}</script>`;
  return inlined.replace('<!-- SHEET_WORKER -->', scriptBlock);
}

// Walk a directory for files with a given extension.
function walkDir(abs, ext, out = []) {
  for (const name of readdirSync(abs)) {
    const p = resolve(abs, name);
    if (statSync(p).isDirectory()) walkDir(p, ext, out);
    else if (p.endsWith(ext)) out.push(p);
  }
  return out;
}

export function htmlSourcePaths() {
  const paths = [resolve(repoRoot, HTML_SOURCE)];
  try {
    paths.push(...walkDir(resolve(repoRoot, 'src/html'), '.html'));
  } catch {
    /* src/html/ missing — ignore */
  }
  try {
    paths.push(...walkDir(resolve(repoRoot, 'src/worker'), '.js'));
  } catch {
    /* src/worker/ missing — ignore */
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
    console.log(`  src/sheet.html + src/worker/**  →  sheet.html  (${html.length} bytes)`);
    console.log(`  ${CSS_SOURCES.length} css files                    →  sheet.css  (${css.length} bytes)`);
  }
}

// CLI entry.
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  syncArtifacts({ log: true });
  console.log('build: Roll20 upload artifacts synced.');
}
