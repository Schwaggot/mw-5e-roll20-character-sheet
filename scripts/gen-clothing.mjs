#!/usr/bin/env node
// Parse compendium gear/clothing.md -> JS preset object + HTML options.
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PATH = resolve(__dirname, "..", "..", "mw-5e-compendium", "modern-warfare-5e", "gear", "clothing.md");
const text = readFileSync(PATH, "utf8");
const lines = text.split(/\r?\n/);

// Walk through sections. H2 (## X) sets the main section. H3 (### Y) sets the
// subsection. The "Tags" section is a legend, not items - skip it.
let h2 = "";
let h3 = "";
const entries = [];

for (let i = 0; i < lines.length; i++) {
  const m2 = /^##\s+(.+?)\s*$/.exec(lines[i]);
  if (m2 && !/^###/.test(lines[i])) { h2 = m2[1]; h3 = ""; continue; }
  const m3 = /^###\s+(.+?)\s*$/.exec(lines[i]);
  if (m3) { h3 = m3[1]; continue; }
  if (h2 === "Tags") continue;
  // Table header row starts with "| <label> |" and col[0] is one of our known labels
  if (/^\|\s*(Outfit|Item|Set|Gloves|Boots)\b/i.test(lines[i])) {
    const headerCells = lines[i].split("|").slice(1, -1).map((s) => s.trim().toLowerCase());
    const category = h3 ? `${h2} - ${h3}` : h2;
    for (let j = i + 2; j < lines.length; j++) {
      const l = lines[j];
      if (!l.trim().startsWith("|")) break;
      if (/^\|\s*-+/.test(l)) break;
      const cells = l.split("|").slice(1, -1).map((s) => s.trim());
      if (cells.length !== headerCells.length) continue;
      const row = {};
      headerCells.forEach((k, idx) => row[k] = cells[idx]);
      row._category = category;
      row._protective = /protective/i.test(h3);
      entries.push(row);
    }
    i += 1;
  }
}

// ---------- slugify ----------
const seen = new Set();
function slugify(name, prefix = "") {
  let base = (prefix ? prefix + "_" : "") + name.toLowerCase()
    .replace(/'/g, "")
    .replace(/&/g, "")
    .replace(/"/g, "")
    .replace(/[().\/]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  if (/^[0-9]/.test(base)) base = "c" + base;
  let s = base; let n = 2;
  while (seen.has(s)) s = `${base}_${n++}`;
  seen.add(s);
  return s;
}

function jsStr(s) { return '"' + String(s).replace(/\\/g, "\\\\").replace(/"/g, '\\"') + '"'; }

// Prefix map keyed by category to keep slugs namespaced / readable.
const PREFIX = {
  "Quick Outfits": "outfit",
  "Headwear - Everyday": "head",
  "Headwear": "head",
  "Eyewear": "eye",
  "Face and Neck": "face",
  "Tops - Everyday": "top",
  "Tops - Base Layers": "topbase",
  "Outerwear": "outer",
  "Bottoms - Everyday": "pants",
  "Bottoms - Base Layers": "pantsbase",
  "Belts": "belt",
  "Gloves - Everyday": "glove",
  "Gloves - Protective": "gloveprot",
  "Socks": "sock",
  "Footwear - Everyday": "foot",
  "Footwear - Protective": "footprot",
  "Uniform Sets": "uniform",
};

function parseKg(s) {
  const m = /([\d.]+)/.exec(s || "");
  return m ? parseFloat(m[1]) : 0;
}

// Build preset objects
const presets = [];
const htmlByCat = new Map();
for (const r of entries) {
  const name = r.outfit || r.item || r.set || r.gloves || r.boots;
  if (!name || name === "-") continue;
  const cat = r._category;
  const prefix = PREFIX[cat] || "cloth";
  const slug = slugify(name, prefix);
  let style, tags, weight;
  if (r._protective) {
    // Columns: AC, Modifiers, Resistances, Weight, Req
    style = "Tactical";
    weight = parseKg(r.weight);
    const parts = [];
    if (r.ac && r.ac !== "-") parts.push(`AC ${r.ac}`);
    if (r.modifiers) parts.push(r.modifiers);
    if (r.resistances) parts.push(`Resist: ${r.resistances}`);
    if (r.req) parts.push(`Req ${r.req}`);
    tags = parts.join("; ");
  } else {
    style = r.style || "";
    weight = parseKg(r.weight);
    tags = r.tags || "";
  }
  presets.push({ slug, name, style, weight, tags, category: cat });
  if (!htmlByCat.has(cat)) htmlByCat.set(cat, []);
  htmlByCat.get(cat).push({ slug, label: name });
}

// Emit JS
console.log("===CLOTHING_PRESETS===");
console.log("  const CLOTHING_PRESETS = {");
let lastCat = null;
for (const p of presets) {
  if (p.category !== lastCat) { console.log(`    // ${p.category}`); lastCat = p.category; }
  console.log(`    ${p.slug}: { name: ${jsStr(p.name)}, style: ${jsStr(p.style)}, weight: ${p.weight}, tags: ${jsStr(p.tags)} },`);
}
console.log("  };");

// Emit HTML
console.log("===HTML===");
console.log('          <select name="attr_cpreset" class="atlas-clothing-name-select">');
console.log('            <option value="" disabled selected>-- Kleidung wählen --</option>');
for (const [cat, opts] of htmlByCat.entries()) {
  console.log(`            <option disabled>---------- ${cat} ----------</option>`);
  for (const { slug, label } of opts) {
    const esc = label.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
    console.log(`            <option value="${slug}">${esc}</option>`);
  }
}
console.log('          </select>');
console.log("===DONE===");
console.log(`Total: ${presets.length}`);
