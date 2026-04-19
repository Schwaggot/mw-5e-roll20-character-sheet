#!/usr/bin/env node
// Parse compendium grenades-and-explosives.md -> JS preset object + HTML options.
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PATH = resolve(__dirname, "..", "..", "mw-5e-compendium", "modern-warfare-5e", "weapons", "grenades-and-explosives.md");
const text = readFileSync(PATH, "utf8");
const lines = text.split(/\r?\n/);

// Walk through sections; section heading (### ...) sets the category.
let section = "Grenades";
let currentHeading = "";
const entries = [];

for (let i = 0; i < lines.length; i++) {
  const h = /^###\s+(.+?)\s*$/.exec(lines[i]);
  if (h) { currentHeading = h[1]; continue; }
  if (/^\|\s*Name\b/i.test(lines[i])) {
    const headerCells = lines[i].split("|").slice(1, -1).map((s) => s.trim().toLowerCase());
    for (let j = i + 2; j < lines.length; j++) {
      const l = lines[j];
      if (!l.trim().startsWith("|")) break;
      if (/^\|\s*-+/.test(l)) break;
      const cells = l.split("|").slice(1, -1).map((s) => s.trim());
      if (cells.length !== headerCells.length) continue;
      const row = {};
      headerCells.forEach((k, idx) => row[k] = cells[idx]);
      row._category = currentHeading;
      entries.push(row);
    }
    i += 1;
  }
}

// ---------- slugify ----------
const seen = new Set();
function slugify(name) {
  let base = name.toLowerCase()
    .replace(/h&k/gi, "hk")
    .replace(/s&w/gi, "sw")
    .replace(/&/g, "")
    .replace(/"/g, "")
    .replace(/[().]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  if (/^[0-9]/.test(base)) base = "g" + base;
  let s = base; let n = 2;
  while (seen.has(s)) s = `${base}_${n++}`;
  seen.add(s);
  return s;
}

function jsStr(s) { return '"' + String(s).replace(/\\/g, "\\\\").replace(/"/g, '\\"') + '"'; }

// Build preset objects
const presets = [];
const htmlByCat = new Map();
for (const r of entries) {
  const name = r.name;
  if (!name || name === "-") continue;
  const slug = slugify(name);
  const damage = r.damage || "";
  const misfireCrit = r["misfire/crit"] || "";
  const [misfire, crit] = misfireCrit.split("/").map((s) => (s || "").trim());
  const range = r.range || "";
  const weight = r.weight || "";
  // Extract blast from properties
  const propsRaw = r.properties || "";
  const blastMatch = /Blast\s+([^,]+?)(?:,|$)/i.exec(propsRaw);
  const blast = blastMatch ? blastMatch[1].trim() : "";
  // DC / note field: use short property summary excluding structural tokens
  const dc = propsRaw.split(",").map((s) => s.trim()).filter((s) => {
    return s && !/^1H$/i.test(s) && !/^2H$/i.test(s) && !/^Thrown$/i.test(s)
      && !/^Deviation$/i.test(s) && !/^Blast\s/i.test(s);
  }).join(", ") || "";
  const weightKg = parseFloat((weight || "0").replace(/[^0-9.]/g, "")) || 0;
  presets.push({ slug, name, damage, misfire, crit, range, blast, dc, weight: weightKg, category: r._category });
  if (!htmlByCat.has(r._category)) htmlByCat.set(r._category, []);
  htmlByCat.get(r._category).push({ slug, label: name });
}

// Emit JS
console.log("===GRENADE_PRESETS===");
console.log("  const GRENADE_PRESETS = {");
let lastCat = null;
for (const p of presets) {
  if (p.category !== lastCat) { console.log(`    // ${p.category}`); lastCat = p.category; }
  console.log(`    ${p.slug}: { name: ${jsStr(p.name)}, damage: ${jsStr(p.damage)}, misfire: ${jsStr(p.misfire || "1-3")}, crit: ${jsStr(p.crit || "20")}, range: ${jsStr(p.range)}, blast: ${jsStr(p.blast)}, dc: ${jsStr(p.dc)}, weight: ${p.weight} },`);
}
console.log("  };");

// Emit HTML
console.log("===HTML===");
console.log('          <select name="attr_gpreset" class="atlas-grenade-name-select">');
console.log('            <option value="" disabled selected>-- Granate wählen --</option>');
for (const [cat, opts] of htmlByCat.entries()) {
  console.log(`            <option disabled>---------- ${cat} ----------</option>`);
  for (const { slug, label } of opts) {
    console.log(`            <option value="${slug}">${label.replace(/&/g, "&amp;").replace(/</g, "&lt;")}</option>`);
  }
}
console.log('          </select>');
console.log("===DONE===");
console.log(`Total: ${presets.length}`);
