import { defineConfig } from 'vite';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { syncArtifacts } from './scripts/build.mjs';

const repoRoot = resolve(import.meta.dirname);
const sheetHtmlPath = resolve(repoRoot, 'src/sheet.html');
const sheetCssPath = resolve(repoRoot, 'src/sheet.css');

function transformSheet(raw) {
  // Strip <rolltemplate>…</rolltemplate> (Roll20-only, only rendered in chat),
  // and rewrite the sheet-worker script type so the browser doesn't try to
  // execute it as JS on insertion — the preview's main.js evals it explicitly.
  return raw
    .replace(/<rolltemplate[\s\S]*?<\/rolltemplate>/g, '')
    .replace(/<script\s+type="text\/worker"/g, '<script type="text/roll20-worker"');
}

function roll20SheetPlugin() {
  return {
    name: 'roll20-sheet',
    configureServer(server) {
      // Serve processed fragment + raw CSS on their own URLs. The fragment is
      // too large/irregular for Vite's HTML transform pipeline (parse5 chokes),
      // and the CSS lives outside the Vite root, so we serve both via
      // middleware rather than direct file resolution.
      server.middlewares.use('/__sheet-fragment', (_req, res) => {
        const raw = readFileSync(sheetHtmlPath, 'utf8');
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.setHeader('Cache-Control', 'no-store');
        res.end(transformSheet(raw));
      });
      server.middlewares.use('/__sheet-css', (_req, res) => {
        const css = readFileSync(sheetCssPath, 'utf8');
        res.setHeader('Content-Type', 'text/css; charset=utf-8');
        res.setHeader('Cache-Control', 'no-store');
        res.end(css);
      });
      // Watch src/ even though it's outside the Vite root.
      server.watcher.add([sheetHtmlPath, sheetCssPath]);

      // Initial sync: make sure the Roll20 artifacts at the repo root match
      // src/ the moment the dev server starts, so the autouploader never
      // picks up a stale copy.
      try {
        syncArtifacts();
      } catch (err) {
        server.config.logger.error(`[roll20-sheet] initial sync failed: ${err.message}`);
      }
    },
    handleHotUpdate({ file, server }) {
      if (file === sheetHtmlPath || file === sheetCssPath) {
        try {
          syncArtifacts();
          server.config.logger.info(
            `[roll20-sheet] synced ${file.endsWith('.html') ? 'sheet.html' : 'sheet.css'} → repo root`,
            { clear: false, timestamp: true },
          );
        } catch (err) {
          server.config.logger.error(`[roll20-sheet] sync failed: ${err.message}`);
        }
        server.ws.send({ type: 'full-reload' });
        return [];
      }
    },
  };
}

export default defineConfig({
  // Dev-only scaffolding lives in preview/. The repo root holds only the
  // Roll20 upload artifacts (sheet.html + sheet.css) so autouploader
  // extensions pointed at the root can't pick up any stray HTML.
  root: 'preview',
  server: {
    open: '/',
    fs: {
      allow: [repoRoot],
    },
  },
  plugins: [roll20SheetPlugin()],
});
