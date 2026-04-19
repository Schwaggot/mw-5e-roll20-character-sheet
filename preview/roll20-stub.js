// Minimal stub of the Roll20 sheet worker API, scoped to what this sheet uses:
//   on, getAttrs, setAttrs, getSectionIDs, startRoll, finishRoll, generateRowID.
// Enough to let the real worker script compute derived values live in the browser.
//
// Conventions matching Roll20:
//  - Input/select/textarea `name="attr_foo"` maps to attribute `foo`.
//  - Repeating rows are wrapped in `.repitem[data-reprowid="<id>"]` inside a
//    `.repcontainer[data-section="repeating_xxx"]`. Inputs inside a row have
//    `name="attr_repeating_xxx_<rowid>_<field>"`.
//  - Action buttons use `name="act_foo"` and fire `clicked:foo`.

const listeners = new Map();

function addListener(eventSpec, handler) {
  // Roll20 allows space-separated event names in a single on() call.
  for (const evt of eventSpec.trim().split(/\s+/)) {
    if (!evt) continue;
    if (!listeners.has(evt)) listeners.set(evt, []);
    listeners.get(evt).push(handler);
  }
}

function fire(event, info = { sourceType: 'player' }) {
  const handlers = listeners.get(event);
  if (!handlers) return;
  for (const h of handlers) {
    try {
      h(info);
    } catch (err) {
      console.error(`[roll20-stub] handler for ${event} threw:`, err);
    }
  }
}

function readEl(el) {
  if (!el) return '';
  if (el.type === 'checkbox') return el.checked ? el.value || 'on' : '0';
  if (el.type === 'radio') {
    const group = document.querySelectorAll(`[name="${CSS.escape(el.name)}"]`);
    for (const r of group) if (r.checked) return r.value;
    return '';
  }
  return el.value ?? '';
}

function writeEl(el, value) {
  if (!el) return false;
  const str = value == null ? '' : String(value);
  if (el.type === 'checkbox') {
    const on = str !== '0' && str !== '' && str !== 'false';
    if (el.checked === on) return false;
    el.checked = on;
    return true;
  }
  if (el.type === 'radio') {
    const group = document.querySelectorAll(`[name="${CSS.escape(el.name)}"]`);
    let changed = false;
    for (const r of group) {
      const want = r.value === str;
      if (r.checked !== want) {
        r.checked = want;
        changed = true;
      }
    }
    return changed;
  }
  if (el.value === str) return false;
  el.value = str;
  return true;
}

function findAttrEl(attr) {
  return document.querySelector(`[name="attr_${CSS.escape(attr)}"]`);
}

export function generateRowID() {
  // Roll20 row IDs are 20-char base64url-ish strings prefixed with '-'. The
  // exact charset isn't load-bearing for the preview; just keep them unique
  // and valid as an HTML id / selector fragment.
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_';
  let out = '-';
  for (let i = 0; i < 19; i++) out += alphabet[Math.floor(Math.random() * alphabet.length)];
  return out;
}

export function on(eventSpec, handler) {
  addListener(eventSpec, handler);
}

export function getAttrs(names, callback) {
  const out = {};
  for (const name of names) out[name] = readEl(findAttrEl(name));
  queueMicrotask(() => callback(out));
}

export function setAttrs(values, _options, callback) {
  // Signature variants: setAttrs(values), setAttrs(values, opts), setAttrs(values, opts, cb), setAttrs(values, cb).
  if (typeof _options === 'function') {
    callback = _options;
    _options = undefined;
  }
  const changed = [];
  for (const [name, value] of Object.entries(values)) {
    const el = findAttrEl(name);
    if (writeEl(el, value)) changed.push(name);
  }
  queueMicrotask(() => {
    for (const name of changed) {
      fire(`change:${name}`);
      // Fire the repeating-section compound events too.
      const rep = /^repeating_([^_]+)_[^_]+_(.+)$/.exec(name);
      if (rep) {
        fire(`change:repeating_${rep[1]}:${rep[2]}`);
        fire(`change:repeating_${rep[1]}`);
      }
    }
    if (callback) callback();
  });
}

export function getSectionIDs(sectionName, callback) {
  const container = document.querySelector(`.repcontainer[data-section="${sectionName}"]`);
  const ids = container
    ? Array.from(container.querySelectorAll(':scope > .repitem[data-reprowid]')).map(
        (r) => r.dataset.reprowid,
      )
    : [];
  queueMicrotask(() => callback(ids));
}

const pendingRolls = new Map();

export function startRoll(rollString, callback) {
  const id = `roll-${Math.random().toString(36).slice(2, 10)}`;
  appendChat(rollString);
  pendingRolls.set(id, rollString);
  // The real worker treats this as async; mimic that with queueMicrotask.
  // We hand back an empty `results` map. The worker's finishRoll branches
  // typically read computed/override values it passed back in itself, so an
  // empty results object is usually fine for visual preview.
  queueMicrotask(() => callback({ rollId: id, results: {} }));
}

export function finishRoll(rollId, computed) {
  const src = pendingRolls.get(rollId) ?? '(unknown roll)';
  pendingRolls.delete(rollId);
  appendChat(`finish: ${src}`, computed);
}

function appendChat(line, computed) {
  const chat = document.getElementById('roll20-chat');
  if (!chat) return;
  const entry = document.createElement('div');
  entry.className = 'chat-entry';
  entry.textContent = computed
    ? `${line} | ${JSON.stringify(computed)}`
    : line;
  chat.appendChild(entry);
  chat.scrollTop = chat.scrollHeight;
}

// Wire DOM input events to fire change:attr events. Called once after the
// sheet fragment is in the DOM (and again after new repeating rows are added).
export function wireInputs(root = document) {
  root.querySelectorAll('[name^="attr_"]').forEach((el) => {
    if (el._r20Wired) return;
    el._r20Wired = true;
    const evt = el.tagName === 'SELECT' || el.type === 'checkbox' || el.type === 'radio'
      ? 'change'
      : 'change';
    el.addEventListener(evt, () => {
      const attr = el.name.slice(5); // strip "attr_"
      fire(`change:${attr}`);
      const rep = /^repeating_([^_]+)_[^_]+_(.+)$/.exec(attr);
      if (rep) {
        fire(`change:repeating_${rep[1]}:${rep[2]}`);
        fire(`change:repeating_${rep[1]}`);
      }
    });
  });
  root.querySelectorAll('button[type="action"][name^="act_"]').forEach((btn) => {
    if (btn._r20Wired) return;
    btn._r20Wired = true;
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const name = btn.name.slice(4); // strip "act_"
      const row = btn.closest('.repitem[data-reprowid]');
      if (row) {
        const section = row.closest('.repcontainer').dataset.section; // "repeating_weapons"
        const info = {
          sourceType: 'player',
          triggerName: name,
          sourceAttribute: `${section}_${row.dataset.reprowid}_${name}`,
        };
        fire(`clicked:${section}:${name}`, info);
      } else {
        fire(`clicked:${name}`, { sourceType: 'player', triggerName: name });
      }
    });
  });
}

export function fireSheetOpened() {
  fire('sheet:opened');
}

export function fireRepeatingChange(sectionName) {
  fire(`change:${sectionName}`);
}
