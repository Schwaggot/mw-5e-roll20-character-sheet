  // ---- Grenade/Explosive Presets (aus Compendium generiert) ----
  // weight = kg pro Einzel-Item (fuer Encumbrance-Sum, multipliziert mit gcount).
  // Generiert via scripts/gen-grenades.mjs aus compendium/weapons/grenades-and-explosives.md.
  //
  // `dmg` is structured: each entry is [count, sides, type] -> e.g.
  // [[2,8,FORCE],[2,8,PIERCING]] = "2d8 Force + 2d8 Piercing". The
  // display string and the Roll20-evaluable form are derived from it
  // (see fmtDmgDisplay / fmtDmgRoll). Roll20 inline rolls require type
  // labels in [brackets] or the parser bails after the first dice term;
  // keeping a single source of truth avoids the two strings drifting.
  // `dmg: []` = no damage roll (smokes, signal markers).
  // `dmgScale` = trailing display-only suffix for per-unit explosives
  // ("per 0.1 kg") -- player scales the actual roll via gdmg_bonus.
  const FORCE = "Force", PIERCING = "Piercing", BLUDGEONING = "Bludgeoning",
        FIRE = "Fire", POISON = "Poison", BANG = "Bang", FLASH = "Flash";

  function fmtDmgDisplay(parts, scale) {
    if (!parts || !parts.length) return "-";
    const s = parts.map(([n, d, t]) => t ? `${n}d${d} ${t}` : `${n}d${d}`).join(" + ");
    return scale ? `${s} ${scale}` : s;
  }
  function fmtDmgRoll(parts) {
    if (!parts || !parts.length) return "";
    return parts.map(([n, d, t]) => t ? `${n}d${d}[${t}]` : `${n}d${d}`).join(" + ");
  }

  const GRENADE_PRESETS = {
    // Fragmentation Grenades
    arges_hg_85_austria: { name: "ARGES HG 85 (Austria)", dmg: [[2,8,FORCE],[2,8,PIERCING]], misfire: "1-3", crit: "19-20", range: "30 ft", blast: "10 ft", dc: "", weight: 0.4 },
    dm51_german:         { name: "DM51 (German)",         dmg: [[2,8,FORCE],[2,8,PIERCING]], misfire: "1-3", crit: "19-20", range: "30 ft", blast: "10 ft", dc: "", weight: 0.45 },
    dm61_german:         { name: "DM61 (German)",         dmg: [[2,8,FORCE],[2,8,PIERCING]], misfire: "1-3", crit: "19-20", range: "30 ft", blast: "10 ft", dc: "removable frag sleeve (concussion-only without sleeve)", weight: 0.45 },
    f1_soviet:           { name: "F1 (Soviet)",           dmg: [[3,8,FORCE],[3,8,PIERCING]], misfire: "1-3", crit: "19-20", range: "25 ft", blast: "15 ft", dc: "", weight: 0.6 },
    l109a1_uk:           { name: "L109A1 (UK)",           dmg: [[2,8,FORCE],[2,8,PIERCING]], misfire: "1-3", crit: "19-20", range: "30 ft", blast: "10 ft", dc: "", weight: 0.45 },
    l111a1_uk:           { name: "L111A1 (UK)",           dmg: [[2,8,FORCE],[2,8,PIERCING]], misfire: "1-3", crit: "19-20", range: "30 ft", blast: "10 ft", dc: "", weight: 0.45 },
    m26_fragmentation:   { name: "M26 Fragmentation",     dmg: [[2,8,FORCE],[2,8,PIERCING]], misfire: "1-3", crit: "19-20", range: "30 ft", blast: "10 ft", dc: "", weight: 0.45 },
    m67_fragmentation:   { name: "M67 Fragmentation",     dmg: [[2,8,FORCE],[2,8,PIERCING]], misfire: "1-3", crit: "19-20", range: "30 ft", blast: "10 ft", dc: "", weight: 0.4 },
    mk_2_pineapple_us:   { name: "Mk 2 \"Pineapple\" (US)", dmg: [[2,8,FORCE],[2,8,PIERCING]], misfire: "1-3", crit: "19-20", range: "25 ft", blast: "10 ft", dc: "", weight: 0.6 },
    rgd_5_soviet:        { name: "RGD-5 (Soviet)",        dmg: [[2,8,FORCE],[2,8,PIERCING]], misfire: "1-3", crit: "19-20", range: "30 ft", blast: "10 ft", dc: "", weight: 0.31 },
    v40_mini_dutch:      { name: "V40 Mini (Dutch)",      dmg: [[1,8,FORCE],[1,8,PIERCING]], misfire: "1-3", crit: "19-20", range: "30 ft", blast: "5 ft",  dc: "", weight: 0.13 },
    // Offensive/Concussion Grenades
    mk3a2_offensive:     { name: "Mk3A2 Offensive",       dmg: [[4,8,FORCE]], misfire: "1-3", crit: "20", range: "30 ft", blast: "10 ft", dc: "", weight: 0.44 },
    // Incendiary Grenades
    an_m14_th3_incendiary: { name: "AN-M14 TH3 Incendiary", dmg: [[6,6,FIRE]], misfire: "1-3", crit: "20", range: "30 ft", blast: "5 ft",  dc: "Duration 4 rounds, Ignite", weight: 0.9 },
    m34_wp:                { name: "M34 WP",                dmg: [[5,6,FIRE]], misfire: "1-3", crit: "20", range: "30 ft", blast: "15 ft", dc: "Duration 3 rounds, Ignite", weight: 0.68 },
    // Stun/Flashbang Grenades
    als_1007_flashbang:    { name: "ALS 1007 Flashbang",    dmg: [[5,6,BANG],[5,6,FLASH]], misfire: "1-3", crit: "20", range: "30 ft", blast: "10 ft", dc: "", weight: 0.22 },
    g60_stun_grenade_uk:   { name: "G60 Stun Grenade (UK)", dmg: [[5,6,BANG],[5,6,FLASH]], misfire: "1-3", crit: "20", range: "30 ft", blast: "10 ft", dc: "", weight: 0.23 },
    m84_flashbang:         { name: "M84 Flashbang",         dmg: [[5,6,BANG],[5,6,FLASH]], misfire: "1-3", crit: "20", range: "30 ft", blast: "10 ft", dc: "", weight: 0.23 },
    mk141_mod_0_us_seal:   { name: "Mk141 Mod 0 (US SEAL)", dmg: [[5,6,BANG],[5,6,FLASH]], misfire: "1-3", crit: "20", range: "30 ft", blast: "10 ft", dc: "", weight: 0.2 },
    model_7290_flashbang:  { name: "Model 7290 Flashbang",  dmg: [[4,6,BANG],[4,6,FLASH]], misfire: "1-3", crit: "20", range: "30 ft", blast: "10 ft", dc: "", weight: 0.18 },
    // Smoke Grenades
    an_m8_hc_white_smoke:  { name: "AN-M8 HC White Smoke",  dmg: [], misfire: "1-3", crit: "-", range: "30 ft", blast: "20 ft", dc: "Duration 10 rounds, Obscures", weight: 0.66 },
    m18_signal_smoke:      { name: "M18 Signal Smoke",      dmg: [], misfire: "1-3", crit: "-", range: "30 ft", blast: "15 ft", dc: "Duration 8 rounds, Obscures", weight: 0.54 },
    m83_ir_smoke:          { name: "M83 IR Smoke",          dmg: [], misfire: "1-3", crit: "-", range: "30 ft", blast: "15 ft", dc: "Duration 10 rounds, Obscures (also blocks IR/thermal optics)", weight: 0.55 },
    rdg_2_smoke_russian:   { name: "RDG-2 Smoke (Russian)", dmg: [], misfire: "1-3", crit: "-", range: "30 ft", blast: "15 ft", dc: "Duration 8 rounds, Obscures", weight: 0.5 },
    // Less-Lethal / Riot Control Grenades
    m7a3_cs:               { name: "M7A3 CS",               dmg: [[2,6,POISON]],      misfire: "1-3", crit: "20", range: "30 ft", blast: "15 ft", dc: "Duration 6 rounds", weight: 0.45 },
    stingball:             { name: "Stingball",             dmg: [[3,4,BLUDGEONING]], misfire: "1-3", crit: "20", range: "30 ft", blast: "15 ft", dc: "rubber shrapnel + flash, less-lethal", weight: 0.3 },
    // Plastic Explosives
    g01_kg_c4:             { name: "0.1 kg C4",             dmg: [[2,10,FORCE]], dmgScale: "per 0.1 kg", misfire: "1-2", crit: "20", range: "Placed", blast: "10 ft + 5 ft per 0.1 kg", dc: "", weight: 0.1 },
    g01_kg_pe_4:           { name: "0.1 kg PE-4",           dmg: [[2,10,FORCE]], dmgScale: "per 0.1 kg", misfire: "1-2", crit: "20", range: "Placed", blast: "10 ft + 5 ft per 0.1 kg", dc: "", weight: 0.1 },
    g01_kg_semtex:         { name: "0.1 kg Semtex",         dmg: [[2,10,FORCE]], dmgScale: "per 0.1 kg", misfire: "1-2", crit: "20", range: "Placed", blast: "10 ft + 5 ft per 0.1 kg", dc: "", weight: 0.1 },
    m112_c4_block:         { name: "M112 C4 Block",         dmg: [[6,10,FORCE]], misfire: "1-2", crit: "20", range: "Placed", blast: "15 ft + 5 ft per 0.1 kg over 0.57 kg", dc: "standardized 1.25 lb demo block", weight: 0.57 },
    m118_demo_sheet:       { name: "M118 Demo Sheet",       dmg: [[8,10,FORCE]], misfire: "1-2", crit: "20", range: "Placed", blast: "20 ft in line or shape", dc: "flexible sheet (cut/shape to target geometry)", weight: 1 },
    tnt_block_05_lb:       { name: "TNT Block (0.5 lb)",    dmg: [[4,10,FORCE]], misfire: "1-2", crit: "20", range: "Placed", blast: "15 ft", dc: "", weight: 0.23 },
    // Detonation Cord
    g1_ft_det_cord:        { name: "1 ft Det Cord",         dmg: [[2,10,FORCE]], dmgScale: "per ft", misfire: "1-2", crit: "20", range: "Placed", blast: "10 ft in line", dc: "", weight: 0.1 },
    // Directional Mines
    c19_mine_can:          { name: "C19 Mine (CAN)",        dmg: [[5,8,PIERCING]], misfire: "1-2", crit: "20", range: "Placed", blast: "", dc: "Engulf 30 ft, command-detonated or tripwire, long-range", weight: 3.4 },
    l105a1_uk:             { name: "L105A1 (UK)",           dmg: [[5,8,PIERCING]], misfire: "1-2", crit: "20", range: "Placed", blast: "", dc: "Engulf 30 ft, command-detonated or tripwire", weight: 1.6 },
    m18a1_claymore:        { name: "M18A1 Claymore",        dmg: [[5,8,PIERCING]], misfire: "1-2", crit: "20", range: "Placed", blast: "", dc: "Engulf 30 ft, command-detonated or tripwire", weight: 1.6 },
    mon_50_soviet:         { name: "MON-50 (Soviet)",       dmg: [[5,8,PIERCING]], misfire: "1-2", crit: "20", range: "Placed", blast: "", dc: "Engulf 30 ft, command-detonated or tripwire", weight: 2 },
    // Anti-Personnel Mines
    m14_ap_mine:           { name: "M14 AP Mine",           dmg: [[3,8,PIERCING]], misfire: "1-2", crit: "20", range: "Placed", blast: "5 ft",  dc: "pressure-triggered", weight: 0.1 },
    m16_bouncing_betty:    { name: "M16 Bouncing Betty",    dmg: [[4,8,FORCE],[4,8,PIERCING]], misfire: "1-2", crit: "20", range: "Placed", blast: "20 ft", dc: "pressure-triggered, bounds to 4 ft", weight: 3.6 },
    pmn_mine_soviet:       { name: "PMN Mine (Soviet)",     dmg: [[4,8,PIERCING]], misfire: "1-2", crit: "20", range: "Placed", blast: "5 ft",  dc: "pressure-triggered", weight: 0.55 },
    // Anti-Tank Mines
    l9_bar_mine:           { name: "L9 Bar Mine",           dmg: [[10,10,FORCE]], misfire: "1-2", crit: "20", range: "Placed", blast: "15 ft", dc: "heavy-pressure-triggered (150 kg+), wide-bar (larger footprint)", weight: 11 },
    m15_at_mine:           { name: "M15 AT Mine",           dmg: [[10,10,FORCE]], misfire: "1-2", crit: "20", range: "Placed", blast: "20 ft", dc: "heavy-pressure-triggered (150 kg+)", weight: 13.6 },
    m19_at_mine:           { name: "M19 AT Mine",           dmg: [[10,10,FORCE]], misfire: "1-2", crit: "20", range: "Placed", blast: "20 ft", dc: "heavy-pressure-triggered (150 kg+), all-plastic (low signature)", weight: 12.5 },
    // Satchel Charges
    m183_satchel_charge:   { name: "M183 Satchel Charge",   dmg: [[12,10,FORCE]], misfire: "1-2", crit: "20", range: "Placed", blast: "30 ft", dc: "command-detonated", weight: 9 },
    // Breaching Charges
    m1a2_bangalore_torpedo:{ name: "M1A2 Bangalore Torpedo",dmg: [[8,10,FORCE]], misfire: "1-2", crit: "20", range: "Placed", blast: "10 ft in line", dc: "5 ft section, clears barbed wire and minefields", weight: 6.1 },
    m2a4_shaped_charge:    { name: "M2A4 Shaped Charge",    dmg: [[15,10,FORCE],[10,10,PIERCING]], misfire: "1-2", crit: "20", range: "Placed", blast: "20 ft", dc: "directional (shaped charge), 30 lb breaching charge", weight: 13.6 },
    // Improvised Throwables
    molotov_cocktail:      { name: "Molotov Cocktail",      dmg: [[3,6,FIRE]],   misfire: "1-4", crit: "20", range: "20 ft", blast: "5 ft",  dc: "Duration 3 rounds, Ignite", weight: 1 },
    sticky_grenade:        { name: "Sticky Grenade",        dmg: [[4,10,FORCE]], misfire: "1-3", crit: "20", range: "30 ft", blast: "15 ft", dc: "", weight: 0.5 },
  };

  on("change:repeating_grenades:gpreset", (info) => {
    const src = (info && info.sourceAttribute) || "";
    const match = /^(repeating_grenades_[^_]+)_/i.exec(src);
    if (!match) return;
    const rowPrefix = match[1];
    getAttrs([src], (v) => {
      const key = v[src];
      if (!key || key === "custom") return;
      const p = GRENADE_PRESETS[key];
      if (!p) return;
      setAttrs({
        [`${rowPrefix}_gname`]:        p.name,
        [`${rowPrefix}_gdamage`]:      fmtDmgDisplay(p.dmg, p.dmgScale),
        [`${rowPrefix}_gdamage_roll`]: fmtDmgRoll(p.dmg),
        [`${rowPrefix}_grange`]:       p.range,
        [`${rowPrefix}_gblast`]:       p.blast,
        [`${rowPrefix}_gdc`]:          p.dc,
        [`${rowPrefix}_gweight`]:      p.weight || 0,
      });
    });
  });

  // ---- Grenade Throw Handler (Action Button + startRoll) ----
  on("clicked:repeating_grenades:gthrow", (info) => {
    const src = (info && info.sourceAttribute) || "";
    const match = /^(repeating_grenades_[^_]+)_/i.exec(src);
    if (!match) return;
    const rowPrefix = match[1];

    const attrsNeeded = [
      `${rowPrefix}_gpreset`,
      `${rowPrefix}_gname`,
      `${rowPrefix}_gdamage`,
      `${rowPrefix}_gdamage_roll`,
      `${rowPrefix}_gdmg_bonus`,
      `${rowPrefix}_grange`,
      `${rowPrefix}_gblast`,
      `${rowPrefix}_gdc`,
      `${rowPrefix}_gcount`,
      "dexterity_mod",
      "prof_bonus",
      "character_name",
    ];

    getAttrs(attrsNeeded, (v) => {
      // For preset rows, derive the roll from the live preset table at
      // throw time. Stored gdamage/gdamage_roll attrs are display caches;
      // trusting them silently strands rows on stale data when the
      // preset table changes (or when older sheet versions wrote bad
      // defaults). Custom rows fall back to the typed value.
      const presetKey = v[`${rowPrefix}_gpreset`] || "";
      const preset = (presetKey && presetKey !== "custom") ? GRENADE_PRESETS[presetKey] : null;
      const gname = preset ? preset.name : (v[`${rowPrefix}_gname`] || "Grenade");
      const gdamage = preset ? fmtDmgDisplay(preset.dmg, preset.dmgScale) : (v[`${rowPrefix}_gdamage`] || "1d6");
      const gdamage_roll = preset ? fmtDmgRoll(preset.dmg) : (v[`${rowPrefix}_gdamage_roll`] || v[`${rowPrefix}_gdamage`] || "");
      const gdmg_bonus = parseInt(v[`${rowPrefix}_gdmg_bonus`]) || 0;
      const grange = v[`${rowPrefix}_grange`] || "";
      const gblast = v[`${rowPrefix}_gblast`] || "";
      const gdc = v[`${rowPrefix}_gdc`] || "";
      const gcount = parseInt(v[`${rowPrefix}_gcount`]) || 0;
      const dexMod = parseInt(v.dexterity_mod) || 0;
      const prof = parseInt(v.prof_bonus) || 0;
      const charName = v.character_name || "Operator";

      // Bail wenn keine Granaten mehr - Chat-Hinweis statt leerer Klick.
      if (gcount <= 0) {
        startRoll(
          `&{template:check} {{title=${gname} - aus!}} {{who=${charName}}} {{result=Keine ${gname} mehr im Loadout}}`,
          (results) => finishRoll(results.rollId)
        );
        return;
      }

      const countAfter = Math.max(0, gcount - 1);
      const countDisplay = `${gcount} &rarr; ${countAfter}`;
      // No-damage throws (smokes, signal markers, custom rows without a
      // damage value) -- gdamage is "-", "", or has no NdN dice pattern.
      // Roll20 cannot evaluate `[[- + 0]]` and silently drops the entire
      // chat message, which also prevents the count decrement in the
      // startRoll callback. Detect and omit the damage field instead.
      const hasDamage = /\d+\s*d\s*\d+/i.test(gdamage_roll);
      const noteParts = [];
      if (grange) noteParts.push(`Range ${grange}`);
      if (gblast) noteParts.push(`Blast ${gblast}`);
      if (gdc) noteParts.push(gdc);
      if (!hasDamage) noteParts.push("Kein Schaden - reine Effekt-Granate");
      const note = noteParts.join(" | ");

      const jsonPayload = buildJsonField({
        type: "grenade_throw",
        actor: charName,
        name: gname,
        mode: "Throw / Deviation",
        attack_bonus: dexMod + prof,
        dex_mod: dexMod,
        prof_bonus: prof,
        damage_formula: hasDamage ? `${gdamage_roll} + ${gdmg_bonus}` : null,
        range: grange,
        blast: gblast,
        dc: gdc || null,
        count_before: gcount,
        count_after: countAfter,
      });

      const rollText = `&{template:attack} ` +
        `{{title=${gname}}} ` +
        `{{mode=Throw / Deviation}} ` +
        `{{attack=[[1d20 + ${dexMod} + ${prof}]]}} ` +
        (hasDamage ? `{{damage=[[${gdamage_roll} + ${gdmg_bonus}]]}} ` : "") +
        (note ? `{{note=${note}}} ` : "") +
        `{{ammo=${countDisplay}}} ` +
        `{{who=${charName}}} ` +
        `{{json_link=${CHAT_JSON_LINK}}}`;

      startRoll(rollText, (results) => {
        setAttrs({
          [`${rowPrefix}_gcount`]: countAfter,
          last_chat_json: jsonPayload,
        });
        finishRoll(results.rollId);
      });
    });
  });

