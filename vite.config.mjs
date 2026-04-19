import { defineConfig } from 'vite';
import { resolve } from 'node:path';
import {
  syncArtifacts,
  buildCss,
  buildHtml,
  cssSourcePaths,
  htmlSourcePaths,
} from './scripts/build.mjs';

const repoRoot = resolve(import.meta.dirname);
const cssPaths = cssSourcePaths();
const cssPathSet = new Set(cssPaths);
const htmlPaths = htmlSourcePaths();
const htmlPathSet = new Set(htmlPaths);

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
      // Serve the assembled fragment + concatenated CSS on their own URLs.
      // The fragment is too large/irregular for Vite's HTML transform pipeline
      // (parse5 chokes); both live outside the Vite root and are assembled
      // from multiple source files.
      server.middlewares.use('/__sheet-fragment', (_req, res) => {
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.setHeader('Cache-Control', 'no-store');
        res.end(transformSheet(buildHtml()));
      });
      server.middlewares.use('/__sheet-css', (_req, res) => {
        res.setHeader('Content-Type', 'text/css; charset=utf-8');
        res.setHeader('Cache-Control', 'no-store');
        res.end(buildCss());
      });

      // Watch every source file even though they're outside the Vite root.
      server.watcher.add([...htmlPaths, ...cssPaths]);

      // Initial sync so the Roll20 artifacts at the repo root match src/
      // the moment the dev server starts.
      try {
        syncArtifacts();
      } catch (err) {
        server.config.logger.error(`[roll20-sheet] initial sync failed: ${err.message}`);
      }
    },
    handleHotUpdate({ file, server }) {
      const isHtml = htmlPathSet.has(file);
      const isCss = cssPathSet.has(file);
      if (!isHtml && !isCss) return;
      try {
        syncArtifacts();
        const target = isHtml ? 'sheet.html' : 'sheet.css';
        const rel = file.slice(repoRoot.length + 1);
        server.config.logger.info(`[roll20-sheet] synced ${target} (from ${rel}) → repo root`, {
          clear: false,
          timestamp: true,
        });
      } catch (err) {
        server.config.logger.error(`[roll20-sheet] sync failed: ${err.message}`);
      }
      server.ws.send({ type: 'full-reload' });
      return [];
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
