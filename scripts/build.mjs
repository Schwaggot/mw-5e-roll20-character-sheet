// Build the Roll20 upload artifacts at the repo root from sources in src/.
// Exported for the Vite dev plugin (auto-sync on save); runnable as a CLI
// (`npm run build`) for one-shot builds / CI.

import { readFileSync, writeFileSync, copyFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

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

export function buildCss() {
  const chunks = CSS_SOURCES.map((rel) => {
    const body = readFileSync(resolve(repoRoot, rel), 'utf8').replace(/\s+$/, '');
    return `/* === ${rel} === */\n${body}\n`;
  });
  return chunks.join('\n');
}

export function cssSourcePaths() {
  return CSS_SOURCES.map((rel) => resolve(repoRoot, rel));
}

export function syncArtifacts({ log = false } = {}) {
  copyFileSync(resolve(repoRoot, 'src/sheet.html'), resolve(repoRoot, 'sheet.html'));
  const css = buildCss();
  writeFileSync(resolve(repoRoot, 'sheet.css'), css);
  if (log) {
    console.log(`  src/sheet.html  →  sheet.html`);
    console.log(`  ${CSS_SOURCES.length} css files  →  sheet.css  (${css.length} bytes)`);
  }
}

// CLI entry.
if (import.meta.url === `file://${process.argv[1]}`) {
  syncArtifacts({ log: true });
  console.log('build: Roll20 upload artifacts synced.');
}
