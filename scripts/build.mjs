// Sync the Roll20 upload artifacts at the repo root from the source files in src/.
// Exported for the Vite dev plugin (auto-sync on save); runnable as a CLI
// (`npm run build`) for one-shot builds / CI.

import { copyFileSync, statSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const PAIRS = [
  ['src/sheet.html', 'sheet.html'],
  ['src/sheet.css', 'sheet.css'],
];

export function syncArtifacts({ log = false } = {}) {
  for (const [from, to] of PAIRS) {
    const src = resolve(repoRoot, from);
    const dest = resolve(repoRoot, to);
    copyFileSync(src, dest);
    if (log) {
      const { size } = statSync(dest);
      console.log(`  ${from}  →  ${to}  (${size} bytes)`);
    }
  }
}

// CLI entry.
if (import.meta.url === `file://${process.argv[1]}`) {
  syncArtifacts({ log: true });
  console.log('build: Roll20 upload artifacts synced.');
}
