// Bootstraps the local preview: converts static fieldset.repeating_* templates
// into Roll20-style repcontainer/repitem DOM, wires input/click events into
// the stub, then runs the sheet's own worker script so derived fields update.

import * as roll20 from './roll20-stub.js';

const api = {
  on: roll20.on,
  getAttrs: roll20.getAttrs,
  setAttrs: roll20.setAttrs,
  getSectionIDs: roll20.getSectionIDs,
  startRoll: roll20.startRoll,
  finishRoll: roll20.finishRoll,
  generateRowID: roll20.generateRowID,
  // The real sheet sandbox also exposes console; no-op extras are harmless.
  _: undefined,
};

function hydrateRepeatingSections() {
  const fieldsets = document.querySelectorAll(
    '#sheet-root fieldset[class*="repeating_"]',
  );
  for (const fs of fieldsets) {
    const cls = [...fs.classList].find((c) => c.startsWith('repeating_'));
    if (!cls) continue;
    const sectionName = cls;

    // Snapshot the original fieldset as the row template before we replace it.
    const templateHtml = fs.innerHTML;

    const container = document.createElement('div');
    container.className = `repcontainer ${sectionName}`;
    container.dataset.section = sectionName;
    container._templateHtml = templateHtml;
    // Preserve any remaining classes on the original fieldset (some CSS may
    // hang off them).
    for (const c of fs.classList) {
      if (c !== sectionName) container.classList.add(c);
    }
    fs.replaceWith(container);

    const addBtn = document.createElement('button');
    addBtn.type = 'button';
    addBtn.className = 'repcontrol_add';
    addBtn.textContent = `+ Add ${sectionName.replace('repeating_', '')}`;
    addBtn.addEventListener('click', () => addRepeatingRow(container));
    container.after(addBtn);
  }
}

function addRepeatingRow(container) {
  const rowId = roll20.generateRowID();
  const section = container.dataset.section; // "repeating_weapons"
  const row = document.createElement('div');
  row.className = 'repitem';
  row.dataset.reprowid = rowId;
  row.innerHTML = container._templateHtml;

  // Rewrite attr_ names inside the row to Roll20's repeating-attribute form.
  row.querySelectorAll('[name^="attr_"]').forEach((el) => {
    const field = el.name.slice(5); // strip "attr_"
    el.name = `attr_${section}_${rowId}_${field}`;
  });

  // Action buttons inside repeating rows keep their act_ prefix; the stub
  // handles the section:field event translation on click.

  const del = document.createElement('button');
  del.type = 'button';
  del.className = 'repcontrol_del';
  del.title = 'Remove row';
  del.textContent = '×';
  del.addEventListener('click', () => {
    row.remove();
    roll20.fireRepeatingChange(section);
  });
  row.appendChild(del);

  container.appendChild(row);
  roll20.wireInputs(row);
  roll20.fireRepeatingChange(section);
}

function runWorkerScripts() {
  const scripts = document.querySelectorAll(
    '#sheet-root script[type="text/roll20-worker"]',
  );
  for (const script of scripts) {
    const source = script.textContent;
    try {
      // Expose the stub API as locals in the script's scope, matching Roll20.
      const fn = new Function(
        'on',
        'getAttrs',
        'setAttrs',
        'getSectionIDs',
        'startRoll',
        'finishRoll',
        'generateRowID',
        source,
      );
      fn(
        api.on,
        api.getAttrs,
        api.setAttrs,
        api.getSectionIDs,
        api.startRoll,
        api.finishRoll,
        api.generateRowID,
      );
    } catch (err) {
      console.error('[preview] sheet worker threw during init:', err);
    }
  }
}

async function boot() {
  const root = document.getElementById('sheet-root');
  const res = await fetch('/__sheet-fragment');
  if (!res.ok) {
    root.textContent = `Failed to load sheet fragment: HTTP ${res.status}`;
    return;
  }
  root.innerHTML = await res.text();

  hydrateRepeatingSections();
  roll20.wireInputs(root);
  runWorkerScripts();
  // Give the worker's `on("sheet:opened", …)` handlers a chance to run.
  queueMicrotask(() => roll20.fireSheetOpened());
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot, { once: true });
} else {
  boot();
}
