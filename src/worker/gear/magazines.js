  // ---- Magazines / Ammo Pool ----
  // Spare-mag pool für jede Waffe. Reload tauscht die geladene Mag gegen
  // eine aus dem Pool; der Swap-Out wandert (stowed) zurück in den Pool
  // oder wird (speed) verworfen. Siehe compendium/rules/ammunition.md.
  //
  // Datenmodell: repeating_magazines row mit
  //   mag_weapon         - repeating_weapons row-id (dropdown)
  //   mag_weapon_label   - cached Waffen-Name für die Sichtanzeige
  //   mag_capacity       - Kapazität (meist = Waffen wammo_max)
  //   mag_rounds         - aktuell geladene Runden in dieser Mag
  //   mag_class          - Klassen-Key (pistol/rifle_556/saw/...)
  //   mag_weight         - Gewicht in kg (auto, user-editierbar)
  //   mag_weight_auto    - "1" solange auto-berechnet; "0" wenn User
  //                        das Feld überschrieben hat

  // Basis-Kapazitäten + -Gewichte pro Klasse (ammunition.md).
  // Gewicht skaliert linear: loaded_weight = base * (capacity / base_cap).
  const MAG_CLASSES = {
    pistol:                 { baseCap: 15,  baseWeight: 0.2, startingPool: 3, label: "Pistol" },
    smg:                    { baseCap: 30,  baseWeight: 0.3, startingPool: 4, label: "SMG" },
    shotgun:                { baseCap: 8,   baseWeight: 0.2, startingPool: 4, label: "Shotgun" },
    rifle_556:              { baseCap: 30,  baseWeight: 0.4, startingPool: 6, label: "5.56 Rifle" },
    rifle_762:              { baseCap: 20,  baseWeight: 0.5, startingPool: 6, label: "7.62 Rifle" },
    rifle_50:               { baseCap: 10,  baseWeight: 0.8, startingPool: 6, label: ".50 Rifle" },
    saw:                    { baseCap: 150, baseWeight: 2.5, startingPool: 3, label: "SAW Belt" },
    gpmg:                   { baseCap: 150, baseWeight: 3.0, startingPool: 3, label: "GPMG Belt" },
    grenade_40_standalone:  { baseCap: 1,   baseWeight: 0.2, startingPool: 4, label: "40mm Grenade" },
    grenade_40_ub:          { baseCap: 1,   baseWeight: 0.2, startingPool: 6, label: "40mm UB" },
    rocket:                 { baseCap: 1,   baseWeight: 2.5, startingPool: 2, label: "Rocket" },
  };

  // Klasse wird beim Preset-Wechsel aus weapons-data.js in attr_wclass
  // geschrieben (siehe personality.js wpreset-Handler). Fallback auf
  // 'pistol' wenn der Waffen-Row kein wclass gesetzt hat (Custom-Waffe).
  function resolveClass(wclass) {
    return (wclass && MAG_CLASSES[wclass]) ? wclass : "pistol";
  }

  function magWeightForCapacity(classKey, capacity) {
    const c = MAG_CLASSES[classKey];
    if (!c) return 0;
    const cap = parseInt(capacity) || c.baseCap;
    const w = c.baseWeight * (cap / c.baseCap);
    return Math.round(w * 10) / 10;
  }

  // ---- Row-id Utils ----
  // Roll20 quirk: stored repeating-row IDs (in getSectionIDs + attrs) are
  // always lowercase, aber info.sourceAttribute aus "clicked:"-Events behält
  // den original Mixed-Case. Wir normalisieren hier auf lowercase, damit
  // weapon/mag-IDs zwischen change- und clicked-Pfaden konsistent matchen.
  function magRowIdFromSrc(src) {
    const m = /^(repeating_magazines_([^_]+))_/i.exec(String(src || ""));
    if (!m) return null;
    const id = m[2].toLowerCase();
    return { prefix: `repeating_magazines_${id}`, id };
  }
  function weaponRowIdFromSrc(src) {
    const m = /^(repeating_weapons_([^_]+))_/i.exec(String(src || ""));
    if (!m) return null;
    const id = m[2].toLowerCase();
    return { prefix: `repeating_weapons_${id}`, id };
  }

  // ---- Weapon label lookup ----
  // Posting a chat message or labelling a mag needs the Waffen-Name. We
  // cache it on the mag row as mag_weapon_label so we don't re-fetch from
  // the weapon on every render.
  function forEachWeapon(ids, readers, cb) {
    const attrs = [];
    for (const id of ids) {
      for (const r of readers) attrs.push(`repeating_weapons_${id}_${r}`);
    }
    getAttrs(attrs, cb);
  }

  // Syncs mag_weapon_label for every mag when a weapon name changes or a
  // weapon is added/removed.
  function syncMagLabels() {
    getSectionIDs("repeating_magazines", (magIds) => {
      if (!magIds.length) return;
      getSectionIDs("repeating_weapons", (wIds) => {
        const need = [];
        for (const id of magIds) need.push(`repeating_magazines_${id}_mag_weapon`);
        for (const id of wIds) {
          need.push(`repeating_weapons_${id}_wname`);
          need.push(`repeating_weapons_${id}_wcaliber`);
        }
        getAttrs(need, (v) => {
          const upd = {};
          for (const id of magIds) {
            const wid = v[`repeating_magazines_${id}_mag_weapon`];
            if (!wid) continue;
            const name = v[`repeating_weapons_${wid}_wname`] || "";
            const cal  = v[`repeating_weapons_${wid}_wcaliber`] || "";
            const label = name + (cal ? ` (${cal})` : "");
            upd[`repeating_magazines_${id}_mag_weapon_label`] = label || "(unassigned)";
          }
          if (Object.keys(upd).length) setAttrs(upd);
        });
      });
    });
  }

  // Recomputes capacity/class/weight from the linked weapon's current
  // state. Triggered when mag_weapon changes.
  function recomputeMagFromWeapon(magRowId) {
    const pfx = `repeating_magazines_${magRowId}`;
    getAttrs(
      [`${pfx}_mag_weapon`, `${pfx}_mag_weight_auto`, `${pfx}_mag_rounds`],
      (mv) => {
        const wid = mv[`${pfx}_mag_weapon`];
        if (!wid) return;
        const wpfx = `repeating_weapons_${wid}`;
        getAttrs(
          [
            `${wpfx}_wname`,
            `${wpfx}_wcaliber`,
            `${wpfx}_wclass`,
            `${wpfx}_wammo_max`,
          ],
          (wv) => {
            const cap = parseInt(wv[`${wpfx}_wammo_max`]) || 0;
            const cls = resolveClass(wv[`${wpfx}_wclass`]);
            const label =
              (wv[`${wpfx}_wname`] || "") +
              (wv[`${wpfx}_wcaliber`] ? ` (${wv[`${wpfx}_wcaliber`]})` : "");
            const upd = {
              [`${pfx}_mag_capacity`]: cap,
              [`${pfx}_mag_class`]: cls,
              [`${pfx}_mag_class_label`]: (MAG_CLASSES[cls] && MAG_CLASSES[cls].label) || cls,
              [`${pfx}_mag_weapon_label`]: label || "(unassigned)",
            };
            // Clamp mag_rounds to new capacity
            const rounds = parseInt(mv[`${pfx}_mag_rounds`]) || 0;
            if (rounds > cap) upd[`${pfx}_mag_rounds`] = cap;
            // Auto weight falls User es nicht überschrieben hat (default "1").
            const autoFlag = mv[`${pfx}_mag_weight_auto`];
            if (autoFlag === undefined || autoFlag === "" || autoFlag === "1") {
              upd[`${pfx}_mag_weight`] = magWeightForCapacity(cls, cap);
              upd[`${pfx}_mag_weight_auto`] = "1";
            }
            setAttrs(upd);
          }
        );
      }
    );
  }

  // ---- Add a row to repeating_magazines ----
  // Roll20: writing to repeating_<section>_<new_id>_<attr> auto-creates
  // the row. Use generateRowID() for the id.
  function addMagRow(weaponId, capacity, rounds, classKey, label, extra) {
    const id = generateRowID();
    const pfx = `repeating_magazines_${id}`;
    const upd = {
      [`${pfx}_mag_weapon`]:       weaponId,
      [`${pfx}_mag_weapon_label`]: label || "",
      [`${pfx}_mag_capacity`]:     capacity,
      [`${pfx}_mag_rounds`]:       rounds,
      [`${pfx}_mag_class`]:        classKey,
      [`${pfx}_mag_class_label`]:  (MAG_CLASSES[classKey] && MAG_CLASSES[classKey].label) || classKey,
      [`${pfx}_mag_weight`]:       magWeightForCapacity(classKey, capacity),
      [`${pfx}_mag_weight_auto`]:  "1",
    };
    if (extra) Object.assign(upd, extra);
    return { id, pfx, upd };
  }

  // ---- Auto-Seed Starting Pool ----
  // Triggert genau EINMAL pro Waffe: beim ersten wammo_max-Write (wpreset
  // gewählt). Markiert danach wpool_seeded=1 damit spätere Writes den
  // Seed nicht erneut auslösen - sonst wuerden leer-geschossene Pools
  // automatisch wieder aufgefüllt werden. Für manuelle Refills gibt's
  // "+ Mag" und "Resupply All".
  function autoSeedPool(weaponId) {
    const wpfx = `repeating_weapons_${weaponId}`;
    getAttrs(
      [
        `${wpfx}_wpool_seeded`,
        `${wpfx}_wcaliber`,
        `${wpfx}_wclass`,
        `${wpfx}_wammo_max`,
        `${wpfx}_wname`,
      ],
      (v) => {
        if (v[`${wpfx}_wpool_seeded`] === "1") return; // schon geseeded
        const cap = parseInt(v[`${wpfx}_wammo_max`]) || 0;
        if (cap <= 0) return;
        const cls = resolveClass(v[`${wpfx}_wclass`]);
        const meta = MAG_CLASSES[cls];
        if (!meta) return;
        const spares = Math.max(0, (meta.startingPool || 0) - 1);
        const label =
          (v[`${wpfx}_wname`] || "") +
          (v[`${wpfx}_wcaliber`] ? ` (${v[`${wpfx}_wcaliber`]})` : "");
        const upd = { [`${wpfx}_wpool_seeded`]: "1" };
        for (let i = 0; i < spares; i++) {
          const row = addMagRow(weaponId, cap, cap, cls, label);
          Object.assign(upd, row.upd);
        }
        setAttrs(upd);
      }
    );
  }

  // ---- Reload Flow ----
  // Per-Mag-Trigger: User klickt [Load] / [Speed] auf einer Mag-Zeile.
  // Wir lesen die verlinkte Waffe aus mag_weapon, tauschen die geladene
  // Mag gegen diese, und behandeln die alte Mag je nach Modus:
  //   stowed -> alte Mag wandert (auch leer) als neue Zeile zurück in den Pool
  //   speed  -> alte Mag ist verloren.
  function reloadWithMag(magId, mode) {
    const mpfx = `repeating_magazines_${magId}`;
    getAttrs(
      [
        `${mpfx}_mag_weapon`,
        `${mpfx}_mag_rounds`,
        `${mpfx}_mag_capacity`,
      ],
      (mv) => {
        const weaponId = mv[`${mpfx}_mag_weapon`];
        const pickRounds = parseInt(mv[`${mpfx}_mag_rounds`]) || 0;
        const pickCap = parseInt(mv[`${mpfx}_mag_capacity`]) || 0;
        if (!weaponId) {
          startRoll(
            `&{template:check} {{title=Reload}} ` +
              `{{result=Keine Waffen-Zuordnung}} ` +
              `{{note=Diese Mag-Zeile ist nicht mit einer Waffe verknüpft.}}`,
            (r) => finishRoll(r.rollId)
          );
          return;
        }

        const wpfx = `repeating_weapons_${weaponId}`;
        getAttrs(
          [
            `${wpfx}_wname`,
            `${wpfx}_wammo`,
            `${wpfx}_wammo_max`,
            `${wpfx}_wcaliber`,
            `${wpfx}_wclass`,
            `character_name`,
          ],
          (v) => {
            const wname = v[`${wpfx}_wname`] || "Weapon";
            const wammo = parseInt(v[`${wpfx}_wammo`]) || 0;
            const wammoMax = parseInt(v[`${wpfx}_wammo_max`]) || 0;
            const charName = v["character_name"] || "";
            const isSpeed = mode === "speed";
            const newLoaded = Math.min(pickRounds, wammoMax);

            const upd = {
              [`${wpfx}_wammo`]: newLoaded,
            };

            // Gewählte Mag aus dem Pool entfernen.
            removeRepeatingRow(`repeating_magazines_${magId}`);

            if (!isSpeed) {
              // Stowed: alter Loaded-Rundenstand wandert als neue Mag-Zeile
              // zurück in den Pool (auch wenn 0 - leere Mag in der Dump
              // Pouch, compendium keeps them).
              const wcal = v[`${wpfx}_wcaliber`] || "";
              const cls = resolveClass(v[`${wpfx}_wclass`]);
              const label = wname + (wcal ? ` (${wcal})` : "");
              const row = addMagRow(weaponId, wammoMax, wammo, cls, label);
              Object.assign(upd, row.upd);
            }

            setAttrs(upd);

            const action = isSpeed ? "Speed Reload" : "Reload";
            const oldAmmo = `${wammo}/${wammoMax}`;
            const newAmmo = `${newLoaded}/${wammoMax}`;
            const poolNote = isSpeed
              ? `Alte Mag (${oldAmmo}) verworfen. Geladen: ${pickRounds}/${pickCap}.`
              : `Alte Mag (${oldAmmo}) als Partial zurück im Pool. Geladen: ${pickRounds}/${pickCap}.`;
            startRoll(
              `&{template:check} {{title=${wname} - ${action}}} ` +
                `{{result=${oldAmmo} -> ${newAmmo}}} ` +
                `{{note=${poolNote}}} ` +
                (charName ? `{{who=${charName}}}` : ""),
              (r) => finishRoll(r.rollId)
            );
          }
        );
      }
    );
  }

  // ---- Resupply (Long Rest @ secure base) ----
  // Alle Waffen: wammo := wammo_max. Alle verlinkten Mags auf cap = rounds
  // (full). Danach: für jede Waffe sicherstellen, dass die Pool-Größe
  // dem starting loadout entspricht (fehlende Mags werden full added).
  function resupplyAll() {
    getSectionIDs("repeating_weapons", (wIds) => {
      getSectionIDs("repeating_magazines", (magIds) => {
        const need = ["character_name"];
        for (const id of wIds) {
          need.push(`repeating_weapons_${id}_wammo_max`);
          need.push(`repeating_weapons_${id}_wcaliber`);
          need.push(`repeating_weapons_${id}_wclass`);
          need.push(`repeating_weapons_${id}_wname`);
        }
        for (const id of magIds) {
          need.push(`repeating_magazines_${id}_mag_weapon`);
          need.push(`repeating_magazines_${id}_mag_rounds`);
          need.push(`repeating_magazines_${id}_mag_capacity`);
        }
        getAttrs(need, (v) => {
          const upd = {};

          // Für jede Waffe: Loaded-Mag + Pool auffüllen
          for (const wid of wIds) {
            const cap = parseInt(v[`repeating_weapons_${wid}_wammo_max`]) || 0;
            if (cap <= 0) continue;
            upd[`repeating_weapons_${wid}_wammo`] = cap;

            // Zähle existierende Mags für diese Waffe + setze rounds = cap
            const ownMags = [];
            for (const mid of magIds) {
              if (v[`repeating_magazines_${mid}_mag_weapon`] === wid) ownMags.push(mid);
            }
            for (const mid of ownMags) {
              upd[`repeating_magazines_${mid}_mag_rounds`] = cap;
              upd[`repeating_magazines_${mid}_mag_capacity`] = cap;
            }

            // Top up to starting pool size (pool - 1 spares, eine liegt in der Waffe)
            const cls = resolveClass(v[`repeating_weapons_${wid}_wclass`]);
            const meta = MAG_CLASSES[cls];
            if (!meta) continue;
            const wantSpares = Math.max(0, (meta.startingPool || 0) - 1);
            const missing = Math.max(0, wantSpares - ownMags.length);
            if (missing > 0) {
              const label =
                (v[`repeating_weapons_${wid}_wname`] || "") +
                (v[`repeating_weapons_${wid}_wcaliber`]
                  ? ` (${v[`repeating_weapons_${wid}_wcaliber`]})`
                  : "");
              for (let i = 0; i < missing; i++) {
                const row = addMagRow(wid, cap, cap, cls, label);
                Object.assign(upd, row.upd);
              }
            }
          }

          setAttrs(upd);

          const charName = v["character_name"] || "";
          startRoll(
            `&{template:check} {{title=Resupply}} ` +
              `{{result=Alle Mags full, Pools auf Starting Loadout}} ` +
              `{{note=Long Rest @ secure base (FOB, cache). Scavenged / lost mags werden nicht ersetzt.}} ` +
              (charName ? `{{who=${charName}}}` : ""),
            (r) => finishRoll(r.rollId)
          );
        });
      });
    });
  }

  // ---- Repack All (Consolidate Partials) ----
  // Iteriert alle Waffen: für jede sammelt es die Mags, fuellt sie greedy
  // von größter zu kleinster Mag auf volle Kapazität. Leere Mags bleiben
  // als Zeilen erhalten (compendium-Regel). Pro Waffe 1 Chat-Summary.
  function repackAll() {
    getSectionIDs("repeating_weapons", (wIds) => {
      getSectionIDs("repeating_magazines", (magIds) => {
        const need = ["character_name"];
        for (const wid of wIds) need.push(`repeating_weapons_${wid}_wname`);
        for (const mid of magIds) {
          need.push(`repeating_magazines_${mid}_mag_weapon`);
          need.push(`repeating_magazines_${mid}_mag_rounds`);
          need.push(`repeating_magazines_${mid}_mag_capacity`);
        }
        getAttrs(need, (v) => {
          const charName = v["character_name"] || "";
          const upd = {};
          const lines = [];

          for (const wid of wIds) {
            const mags = [];
            for (const mid of magIds) {
              if (v[`repeating_magazines_${mid}_mag_weapon`] !== wid) continue;
              mags.push({
                id: mid,
                rounds: parseInt(v[`repeating_magazines_${mid}_mag_rounds`]) || 0,
                capacity: parseInt(v[`repeating_magazines_${mid}_mag_capacity`]) || 0,
              });
            }
            if (mags.length < 2) continue;

            mags.sort((a, b) => b.rounds - a.rounds);
            let pool = mags.reduce((acc, m) => acc + m.rounds, 0);
            const newRounds = [];
            for (const m of mags) {
              const fill = Math.min(m.capacity, pool);
              upd[`repeating_magazines_${m.id}_mag_rounds`] = fill;
              newRounds.push(`${fill}/${m.capacity}`);
              pool -= fill;
            }
            const wname = v[`repeating_weapons_${wid}_wname`] || "Weapon";
            lines.push(`${wname}: ${newRounds.join(", ")}`);
          }

          if (!lines.length) {
            startRoll(
              `&{template:check} {{title=Repack All}} ` +
                `{{result=Nichts zu repacken}} ` +
                `{{note=Keine Waffe mit 2+ Mags im Pool.}} ` +
                (charName ? `{{who=${charName}}}` : ""),
              (r) => finishRoll(r.rollId)
            );
            return;
          }

          setAttrs(upd);
          startRoll(
            `&{template:check} {{title=Repack All}} ` +
              `{{result=${lines.length} Waffe(n)}} ` +
              `{{note=${lines.join(" | ")}}} ` +
              (charName ? `{{who=${charName}}}` : ""),
            (r) => finishRoll(r.rollId)
          );
        });
      });
    });
  }

  // ---- Event Wiring ----

  // Auto-seed: triggert auf wammo_max (wird durch den wpreset-Handler in
  // personality.js geschrieben nachdem der Preset gewechselt wurde). Nur
  // sheetworker-Writes auslösen den Seed - manuelle User-Edits an wammo_max
  // sollen die Pool-Größe nicht verändern. autoSeedPool selbst guardt
  // gegen doppeltes Seeding (Abbruch wenn schon Mags existieren).
  on("change:repeating_weapons:wammo_max", (info) => {
    const src = (info && info.sourceAttribute) || "";
    const m = weaponRowIdFromSrc(src);
    if (!m) return;
    if (!info || info.sourceType !== "sheetworker") return;
    autoSeedPool(m.id);
  });

  // Waffen-Namen / -Kaliber-Updates -> mag_weapon_label refreshen.
  on(
    "change:repeating_weapons:wname change:repeating_weapons:wcaliber " +
      "remove:repeating_weapons",
    () => syncMagLabels()
  );

  // Mag linked to a weapon -> copy capacity/class/weight from weapon.
  on("change:repeating_magazines:mag_weapon", (info) => {
    const src = (info && info.sourceAttribute) || "";
    const m = magRowIdFromSrc(src);
    if (!m) return;
    recomputeMagFromWeapon(m.id);
  });

  // User editiert mag_weight -> auto-flag aus.
  on("change:repeating_magazines:mag_weight", (info) => {
    const src = (info && info.sourceAttribute) || "";
    const m = magRowIdFromSrc(src);
    if (!m) return;
    // Nur als "manuell" markieren wenn der Change von der UI kommt
    // (sourceType == "player"). setAttrs-getriebene Updates sind "sheetworker".
    if (info && info.sourceType === "player") {
      setAttrs({ [`repeating_magazines_${m.id}_mag_weight_auto`]: "0" });
    }
  });

  // Reload-Aktionen auf der Mag-Zeile selbst: User klickt auf die konkrete
  // Mag die er laden will (explizite Auswahl, keine Auto-Pick-Logik).
  // WICHTIG: Roll20 parst repeating-row Action-Namen naiv per Split auf "_",
  // d.h. Multi-Token-Actions wie "mag_load" werden gekürzt. Alle Action-
  // namen im Magazines-System sind deshalb single-token (magload / magspeed
  // statt mag_load / mag_load_speed).
  on("clicked:repeating_magazines:magload", (info) => {
    const src = (info && info.sourceAttribute) || "";
    const m = magRowIdFromSrc(src);
    if (!m) return;
    reloadWithMag(m.id, "stowed");
  });
  on("clicked:repeating_magazines:magspeed", (info) => {
    const src = (info && info.sourceAttribute) || "";
    const m = magRowIdFromSrc(src);
    if (!m) return;
    reloadWithMag(m.id, "speed");
  });

  // Repack All-Button in der Magazines-Section-Actions-Bar.
  on("clicked:magsrepack", () => repackAll());

  // "[+ Mag]"-Button auf Weapon-Row: legt eine volle Spare-Mag an.
  on("clicked:repeating_weapons:wmagadd", (info) => {
    const src = (info && info.sourceAttribute) || "";
    const m = weaponRowIdFromSrc(src);
    if (!m) return;
    const wpfx = `repeating_weapons_${m.id}`;
    getAttrs(
      [
        `${wpfx}_wammo_max`,
        `${wpfx}_wcaliber`,
        `${wpfx}_wclass`,
        `${wpfx}_wname`,
        "character_name",
      ],
      (v) => {
        const cap = parseInt(v[`${wpfx}_wammo_max`]) || 0;
        if (cap <= 0) return;
        const cls = resolveClass(v[`${wpfx}_wclass`]);
        const wname = v[`${wpfx}_wname`] || "Weapon";
        const wcal = v[`${wpfx}_wcaliber`] || "";
        const label = wname + (wcal ? ` (${wcal})` : "");
        const row = addMagRow(m.id, cap, cap, cls, label);
        setAttrs(row.upd);

        const charName = v["character_name"] || "";
        startRoll(
          `&{template:check} {{title=${wname} - Neue Mag}} ` +
            `{{result=${cap}/${cap} in Pool}} ` +
            `{{note=Volle Spare-Mag hinzugefuegt. (Req-Kosten per Compendium: 0.5 bzw. 1 Req pro Mag/Belt/Round.)}} ` +
            (charName ? `{{who=${charName}}}` : ""),
          (r) => finishRoll(r.rollId)
        );
      }
    );
  });

  // Top-Level Resupply-Button (action name ist single-token, muss single
  // bleiben damit Roll20 ihn korrekt dispatcht).
  on("clicked:magsresupply", () => resupplyAll());
