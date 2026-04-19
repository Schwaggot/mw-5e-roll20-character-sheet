#!/usr/bin/env node
// One-off generator: parses compendium MD weapon tables and emits:
//   - WEAPON_PRESETS object (for weapons-data.js)
//   - WEAPON_GROUP_MAP
//   - HTML option list (for gear.html)
//   - GRENADE_PRESETS (for grenades.js)
// Usage: node scripts/gen-weapons.mjs > /tmp/gen.txt
// Re-run whenever the compendium weapons change.

import { readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
// Compendium is a sibling repo: ../../mw-5e-compendium relative to repo root.
const COMP_DIR = resolve(__dirname, "..", "..", "mw-5e-compendium", "modern-warfare-5e", "weapons");

// Group metadata for each file.
const FILES = [
  { file: "pistols.md",         category: "Pistols",              group: "pistols" },
  { file: "submachine-guns.md", category: "Submachine Guns",      group: "smg" },
  { file: "assault-rifles.md",  category: "Assault Rifles",       group: "assault_rifles" },
  { file: "semi-auto-rifles.md",category: "Semi-Auto / DMR",      group: "dmr" },
  { file: "bolt-action-rifles.md", category: "Bolt-Action Rifles", group: "bolt_action" },
  { file: "shotguns.md",        category: "Shotguns",             group: "shotguns" },
  { file: "machine-guns.md",    category: "Machine Guns",         group: "saw_mg" },
  { file: "grenade-launchers.md", category: "Grenade Launchers",  group: "launchers" },
  { file: "rocket-launchers.md", category: "Rocket Launchers",    group: "launchers" },
];

// ---------- Slug utilities ----------
const slugifyCache = new Set();
function slugify(name, caliber) {
  let base = (name + "_" + (caliber || ""))
    .toLowerCase()
    .replace(/h&k/gi, "hk")
    .replace(/s&w/gi, "sw")
    .replace(/&/g, "")
    .replace(/×/g, "x")
    .replace(/[().]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  let s = base;
  let i = 2;
  while (slugifyCache.has(s)) { s = `${base}_${i++}`; }
  slugifyCache.add(s);
  return s;
}

// ---------- Property parsing ----------
// Split props string by commas, but also extract Recoil/Ammo.
// Normalize Accurate (N) -> "Accurate +N", Inaccurate (-N) -> "Inaccurate -N".
// Strip Recoil (N) and Ammo N from tokens, return as separate stats.
function parseProps(propsRaw, damageField) {
  const tokens = propsRaw.split(",").map((s) => s.trim()).filter((s) => s && s !== "same" && s !== "-");
  const out = {
    recoil: 0,
    ammo_max: null,
    propTokens: [],
  };
  for (let t of tokens) {
    // Strip bold markdown **foo**
    t = t.replace(/\*\*/g, "");
    const mR = /^Recoil\s*\((-?\d+)(?:-(-?\d+))?\)$/i.exec(t);
    if (mR) { out.recoil = parseInt(mR[2] || mR[1]); continue; }
    const mR2 = /^Recoil\s*\(-\)$/i.exec(t);
    if (mR2) { out.recoil = 0; continue; }
    const mA = /^Ammo\s+(\d+)$/i.exec(t);
    if (mA) { out.ammo_max = parseInt(mA[1]); continue; }
    if (/^Ammo\s+-$/i.test(t)) continue;
    if (/^Light$/i.test(t)) { out.propTokens.push("Lite"); continue; }
    const mAcc = /^Accurate\s*\((\d+)\)$/i.exec(t);
    if (mAcc) { out.propTokens.push(`Accurate +${mAcc[1]}`); continue; }
    const mInacc = /^Inaccurate\s*\((-?\d+)\)$/i.exec(t);
    if (mInacc) {
      const n = Math.abs(parseInt(mInacc[1]));
      out.propTokens.push(`Inaccurate -${n}`);
      continue;
    }
    const mBlast = /^Blast\s+(\d+)\s*ft/i.exec(t);
    if (mBlast) { out.propTokens.push(`Blast ${mBlast[1]}ft`); continue; }
    const mDur = /^Duration\s+(\d+)\s+rounds?$/i.exec(t);
    if (mDur) { out.propTokens.push(`Duration ${mDur[1]}r`); continue; }
    // Select Fire variants (normalize B/A -> S/B/A-ish? keep as-is per compendium)
    out.propTokens.push(t);
  }
  return out;
}

// ---------- Parse a single MD table ----------
function parseTable(lines, startIdx) {
  // Header row at startIdx, separator at startIdx+1, data from startIdx+2
  const headerCells = lines[startIdx].split("|").slice(1, -1).map((s) => s.trim().toLowerCase());
  const rows = [];
  for (let i = startIdx + 2; i < lines.length; i++) {
    const l = lines[i];
    if (!l.trim().startsWith("|")) break;
    if (/^\|\s*-+/.test(l)) break;
    const cells = l.split("|").slice(1, -1).map((s) => s.trim());
    if (cells.length !== headerCells.length) continue;
    const row = {};
    headerCells.forEach((h, j) => row[h] = cells[j]);
    rows.push(row);
  }
  return { headers: headerCells, rows, nextIdx: startIdx + 2 + rows.length };
}

// ---------- Parse file into entries ----------
function parseWeaponFile(path) {
  const text = readFileSync(path, "utf8");
  const lines = text.split(/\r?\n/);
  const entries = [];
  let lastShotProps = null; // for shotgun "same" continuation
  for (let i = 0; i < lines.length; i++) {
    if (/^\|\s*Name\b/i.test(lines[i]) || /^\|\s*Weapon\b/i.test(lines[i])) {
      const { rows, nextIdx } = parseTable(lines, i);
      for (const r of rows) {
        entries.push(r);
      }
      i = nextIdx - 1;
    }
  }
  return entries;
}

// Default magazine capacity by caliber for service/backup pistols
// where the compendium omits "Ammo N" (assumes standard capacity).
const PISTOL_AMMO_DEFAULTS = {
  "9mm p": 15, "9×19mm": 15,
  ".40 s&w": 12,
  ".45 acp": 8,
  "10mm acp": 15, "10mm auto": 15,
  ".357 sig": 12,
  ".357 magnum": 6,
  ".44 magnum": 6, ".44-40": 6,
  ".50 ae": 7,
  ".38 super": 9, ".38 special": 6,
  "5.7×28mm": 20,
  ".22 lr": 10, ".22 magnum": 5, ".17 hmr": 5,
  ".25 acp": 7, ".32 acp": 7, ".32 s&w": 6,
  ".380 acp": 7,
  ".45 long colt": 6, ".455 british": 6,
  ".500 magnum": 5, ".454 casull": 6,
  "9×18 makarov": 8, "9x18 makarov": 8,
};

// ---------- Row -> preset ----------
function rowToPreset(r, group, category) {
  const name = r.name || r.weapon;
  if (!name || name === "-") return null;
  const caliber = r.caliber || r["gauge/slug"] || r.gauge || "";
  const damage = r.damage || "";
  const misfireCrit = r["misfire/crit"] || r["misfire"] || "";
  const [misfire, crit] = misfireCrit.split("/").map((s) => (s || "").trim());
  const range = r.range || "";
  const weight = r.weight || "";
  const propsRaw = r.properties || "";
  const parsed = parseProps(propsRaw, damage);
  let ammoMax = parsed.ammo_max;
  if ((ammoMax == null || ammoMax === 0) && group === "pistols") {
    const def = PISTOL_AMMO_DEFAULTS[caliber.toLowerCase()];
    if (def) ammoMax = def;
  }
  return {
    name,
    caliber,
    damage,
    range,
    recoil: parsed.recoil || 0,
    misfire: misfire || "1",
    crit: crit || "20",
    ammo_max: ammoMax != null ? ammoMax : 0,
    weight: weight || "",
    properties: parsed.propTokens.join(", "),
    group,
    category,
  };
}

// ---------- Main ----------
const allEntries = []; // array of {slug, preset, category, group}
const categoryOptions = new Map(); // category -> [{slug, label}]

for (const { file, category, group } of FILES) {
  const path = join(COMP_DIR, file);
  const rows = parseWeaponFile(path);
  // Shotguns have "same" continuations - inherit from previous row.
  let lastProps = null;
  for (const r of rows) {
    const propsRaw = r.properties;
    if (propsRaw === "same" && lastProps) r.properties = lastProps;
    else if (propsRaw && propsRaw !== "same") lastProps = propsRaw;
    const p = rowToPreset(r, group, category);
    if (!p) continue;
    const slug = slugify(p.name, p.caliber);
    allEntries.push({ slug, preset: p });
    if (!categoryOptions.has(category)) categoryOptions.set(category, []);
    const labelCal = p.caliber ? ` (${p.caliber})` : "";
    categoryOptions.get(category).push({ slug, label: `${p.name}${labelCal}` });
  }
}

// ---------- Emit WEAPON_PRESETS JS ----------
function jsStr(s) { return '"' + String(s).replace(/\\/g, "\\\\").replace(/"/g, '\\"') + '"'; }
function jsNum(n) {
  if (n === null || n === undefined || n === "") return 0;
  const x = parseFloat(n);
  return Number.isFinite(x) ? x : 0;
}

const weaponLines = [];
weaponLines.push("  const WEAPON_PRESETS = {");
let lastCategory = null;
for (const { slug, preset } of allEntries) {
  if (preset.category !== lastCategory) {
    weaponLines.push(`    // ${preset.category}`);
    lastCategory = preset.category;
  }
  weaponLines.push(`    ${slug}: { name: ${jsStr(preset.name)}, caliber: ${jsStr(preset.caliber)}, damage: ${jsStr(preset.damage)}, range: ${jsStr(preset.range)}, recoil: ${preset.recoil}, misfire: ${jsStr(preset.misfire)}, crit: ${jsStr(preset.crit)}, ammo_max: ${preset.ammo_max}, properties: ${jsStr(preset.properties)} },`);
}
weaponLines.push("  };");

// ---------- Emit WEAPON_GROUP_MAP JS ----------
const groupMapLines = ["  const WEAPON_GROUP_MAP = {"];
const byGroup = new Map();
for (const { slug, preset } of allEntries) {
  if (!byGroup.has(preset.group)) byGroup.set(preset.group, []);
  byGroup.get(preset.group).push(slug);
}
const groupsSeen = new Set();
for (const { file, category, group } of FILES) {
  if (groupsSeen.has(group)) continue;
  groupsSeen.add(group);
  const slugs = byGroup.get(group);
  if (!slugs) continue;
  groupMapLines.push(`    // ${group} (${slugs.length})`);
  // Chunk 6 per line
  for (let i = 0; i < slugs.length; i += 6) {
    const chunk = slugs.slice(i, i + 6).map((s) => `${s}: ${jsStr(group)}`).join(", ");
    groupMapLines.push(`    ${chunk},`);
  }
}
groupMapLines.push("  };");

// ---------- Emit HTML option list ----------
const htmlLines = [];
htmlLines.push('          <select name="attr_wpreset" class="atlas-weapon-name-select">');
htmlLines.push('            <option value="" disabled selected>-- Waffe wählen --</option>');
for (const [cat, opts] of categoryOptions.entries()) {
  htmlLines.push(`            <option disabled>---------- ${cat} ----------</option>`);
  for (const { slug, label } of opts) {
    const escaped = label.replace(/&/g, "&amp;").replace(/</g, "&lt;");
    htmlLines.push(`            <option value="${slug}">${escaped}</option>`);
  }
}
htmlLines.push('          </select>');

// ---------- Emit to stdout segments separated by markers ----------
process.stdout.write("\n===WEAPON_PRESETS===\n");
process.stdout.write(weaponLines.join("\n"));
process.stdout.write("\n===WEAPON_GROUP_MAP===\n");
process.stdout.write(groupMapLines.join("\n"));
process.stdout.write("\n===HTML_OPTIONS===\n");
process.stdout.write(htmlLines.join("\n"));
process.stdout.write("\n===DONE===\n");
process.stdout.write(`Total weapons: ${allEntries.length}\n`);
