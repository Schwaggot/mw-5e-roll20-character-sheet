  // ---- Grenade/Explosive Presets (aus Compendium generiert) ----
  // weight = kg pro Einzel-Item (fuer Encumbrance-Sum, multipliziert mit gcount).
  // Generiert via scripts/gen-grenades.mjs aus compendium/weapons/grenades-and-explosives.md.
  const GRENADE_PRESETS = {
    // Fragmentation Grenades
    arges_hg_85_austria: { name: "ARGES HG 85 (Austria)", damage: "2d8 Force + 2d8 Piercing", misfire: "1-3", crit: "19-20", range: "30 ft", blast: "10 ft", dc: "", weight: 0.4 },
    dm51_german: { name: "DM51 (German)", damage: "2d8 Force + 2d8 Piercing", misfire: "1-3", crit: "19-20", range: "30 ft", blast: "10 ft", dc: "", weight: 0.45 },
    dm61_german: { name: "DM61 (German)", damage: "2d8 Force + 2d8 Piercing", misfire: "1-3", crit: "19-20", range: "30 ft", blast: "10 ft", dc: "removable frag sleeve (concussion-only without sleeve)", weight: 0.45 },
    f1_soviet: { name: "F1 (Soviet)", damage: "3d8 Force + 3d8 Piercing", misfire: "1-3", crit: "19-20", range: "25 ft", blast: "15 ft", dc: "", weight: 0.6 },
    l109a1_uk: { name: "L109A1 (UK)", damage: "2d8 Force + 2d8 Piercing", misfire: "1-3", crit: "19-20", range: "30 ft", blast: "10 ft", dc: "", weight: 0.45 },
    l111a1_uk: { name: "L111A1 (UK)", damage: "2d8 Force + 2d8 Piercing", misfire: "1-3", crit: "19-20", range: "30 ft", blast: "10 ft", dc: "", weight: 0.45 },
    m26_fragmentation: { name: "M26 Fragmentation", damage: "2d8 Force + 2d8 Piercing", misfire: "1-3", crit: "19-20", range: "30 ft", blast: "10 ft", dc: "", weight: 0.45 },
    m67_fragmentation: { name: "M67 Fragmentation", damage: "2d8 Force + 2d8 Piercing", misfire: "1-3", crit: "19-20", range: "30 ft", blast: "10 ft", dc: "", weight: 0.4 },
    mk_2_pineapple_us: { name: "Mk 2 \"Pineapple\" (US)", damage: "2d8 Force + 2d8 Piercing", misfire: "1-3", crit: "19-20", range: "25 ft", blast: "10 ft", dc: "", weight: 0.6 },
    rgd_5_soviet: { name: "RGD-5 (Soviet)", damage: "2d8 Force + 2d8 Piercing", misfire: "1-3", crit: "19-20", range: "30 ft", blast: "10 ft", dc: "", weight: 0.31 },
    v40_mini_dutch: { name: "V40 Mini (Dutch)", damage: "1d8 Force + 1d8 Piercing", misfire: "1-3", crit: "19-20", range: "30 ft", blast: "5 ft", dc: "", weight: 0.13 },
    // Offensive/Concussion Grenades
    mk3a2_offensive: { name: "Mk3A2 Offensive", damage: "4d8 Force", misfire: "1-3", crit: "20", range: "30 ft", blast: "10 ft", dc: "", weight: 0.44 },
    // Incendiary Grenades
    an_m14_th3_incendiary: { name: "AN-M14 TH3 Incendiary", damage: "6d6 Fire", misfire: "1-3", crit: "20", range: "30 ft", blast: "5 ft", dc: "Duration 4 rounds, Ignite", weight: 0.9 },
    m34_wp: { name: "M34 WP", damage: "5d6 Fire", misfire: "1-3", crit: "20", range: "30 ft", blast: "15 ft", dc: "Duration 3 rounds, Ignite", weight: 0.68 },
    // Stun/Flashbang Grenades
    als_1007_flashbang: { name: "ALS 1007 Flashbang", damage: "5d6 Bang + 5d6 Flash", misfire: "1-3", crit: "20", range: "30 ft", blast: "10 ft", dc: "", weight: 0.22 },
    g60_stun_grenade_uk: { name: "G60 Stun Grenade (UK)", damage: "5d6 Bang + 5d6 Flash", misfire: "1-3", crit: "20", range: "30 ft", blast: "10 ft", dc: "", weight: 0.23 },
    m84_flashbang: { name: "M84 Flashbang", damage: "5d6 Bang + 5d6 Flash", misfire: "1-3", crit: "20", range: "30 ft", blast: "10 ft", dc: "", weight: 0.23 },
    mk141_mod_0_us_seal: { name: "Mk141 Mod 0 (US SEAL)", damage: "5d6 Bang + 5d6 Flash", misfire: "1-3", crit: "20", range: "30 ft", blast: "10 ft", dc: "", weight: 0.2 },
    model_7290_flashbang: { name: "Model 7290 Flashbang", damage: "4d6 Bang + 4d6 Flash", misfire: "1-3", crit: "20", range: "30 ft", blast: "10 ft", dc: "", weight: 0.18 },
    // Smoke Grenades
    an_m8_hc_white_smoke: { name: "AN-M8 HC White Smoke", damage: "-", misfire: "1-3", crit: "-", range: "30 ft", blast: "20 ft", dc: "Duration 10 rounds, Obscures", weight: 0.66 },
    m18_signal_smoke: { name: "M18 Signal Smoke", damage: "-", misfire: "1-3", crit: "-", range: "30 ft", blast: "15 ft", dc: "Duration 8 rounds, Obscures", weight: 0.54 },
    m83_ir_smoke: { name: "M83 IR Smoke", damage: "-", misfire: "1-3", crit: "-", range: "30 ft", blast: "15 ft", dc: "Duration 10 rounds, Obscures (also blocks IR/thermal optics)", weight: 0.55 },
    rdg_2_smoke_russian: { name: "RDG-2 Smoke (Russian)", damage: "-", misfire: "1-3", crit: "-", range: "30 ft", blast: "15 ft", dc: "Duration 8 rounds, Obscures", weight: 0.5 },
    // Less-Lethal / Riot Control Grenades
    m7a3_cs: { name: "M7A3 CS", damage: "2d6 Poison", misfire: "1-3", crit: "20", range: "30 ft", blast: "15 ft", dc: "Duration 6 rounds", weight: 0.45 },
    stingball: { name: "Stingball", damage: "3d4 Bludgeoning", misfire: "1-3", crit: "20", range: "30 ft", blast: "15 ft", dc: "rubber shrapnel + flash, less-lethal", weight: 0.3 },
    // Plastic Explosives
    g01_kg_c4: { name: "0.1 kg C4", damage: "2d10 Force per 0.1 kg", misfire: "1-2", crit: "20", range: "Placed", blast: "10 ft + 5 ft per 0.1 kg", dc: "", weight: 0.1 },
    g01_kg_pe_4: { name: "0.1 kg PE-4", damage: "2d10 Force per 0.1 kg", misfire: "1-2", crit: "20", range: "Placed", blast: "10 ft + 5 ft per 0.1 kg", dc: "", weight: 0.1 },
    g01_kg_semtex: { name: "0.1 kg Semtex", damage: "2d10 Force per 0.1 kg", misfire: "1-2", crit: "20", range: "Placed", blast: "10 ft + 5 ft per 0.1 kg", dc: "", weight: 0.1 },
    m112_c4_block: { name: "M112 C4 Block", damage: "6d10 Force", misfire: "1-2", crit: "20", range: "Placed", blast: "15 ft + 5 ft per 0.1 kg over 0.57 kg", dc: "standardized 1.25 lb demo block", weight: 0.57 },
    m118_demo_sheet: { name: "M118 Demo Sheet", damage: "8d10 Force", misfire: "1-2", crit: "20", range: "Placed", blast: "20 ft in line or shape", dc: "flexible sheet (cut/shape to target geometry)", weight: 1 },
    tnt_block_05_lb: { name: "TNT Block (0.5 lb)", damage: "4d10 Force", misfire: "1-2", crit: "20", range: "Placed", blast: "15 ft", dc: "", weight: 0.23 },
    // Detonation Cord
    g1_ft_det_cord: { name: "1 ft Det Cord", damage: "2d10 Force per ft", misfire: "1-2", crit: "20", range: "Placed", blast: "10 ft in line", dc: "", weight: 0.1 },
    // Directional Mines
    c19_mine_can: { name: "C19 Mine (CAN)", damage: "5d8 Piercing", misfire: "1-2", crit: "20", range: "Placed", blast: "", dc: "Engulf 30 ft, command-detonated or tripwire, long-range", weight: 3.4 },
    l105a1_uk: { name: "L105A1 (UK)", damage: "5d8 Piercing", misfire: "1-2", crit: "20", range: "Placed", blast: "", dc: "Engulf 30 ft, command-detonated or tripwire", weight: 1.6 },
    m18a1_claymore: { name: "M18A1 Claymore", damage: "5d8 Piercing", misfire: "1-2", crit: "20", range: "Placed", blast: "", dc: "Engulf 30 ft, command-detonated or tripwire", weight: 1.6 },
    mon_50_soviet: { name: "MON-50 (Soviet)", damage: "5d8 Piercing", misfire: "1-2", crit: "20", range: "Placed", blast: "", dc: "Engulf 30 ft, command-detonated or tripwire", weight: 2 },
    // Anti-Personnel Mines
    m14_ap_mine: { name: "M14 AP Mine", damage: "3d8 Piercing", misfire: "1-2", crit: "20", range: "Placed", blast: "5 ft", dc: "pressure-triggered", weight: 0.1 },
    m16_bouncing_betty: { name: "M16 Bouncing Betty", damage: "4d8 Force + 4d8 Piercing", misfire: "1-2", crit: "20", range: "Placed", blast: "20 ft", dc: "pressure-triggered, bounds to 4 ft", weight: 3.6 },
    pmn_mine_soviet: { name: "PMN Mine (Soviet)", damage: "4d8 Piercing", misfire: "1-2", crit: "20", range: "Placed", blast: "5 ft", dc: "pressure-triggered", weight: 0.55 },
    // Anti-Tank Mines
    l9_bar_mine: { name: "L9 Bar Mine", damage: "10d10 Force", misfire: "1-2", crit: "20", range: "Placed", blast: "15 ft", dc: "heavy-pressure-triggered (150 kg+), wide-bar (larger footprint)", weight: 11 },
    m15_at_mine: { name: "M15 AT Mine", damage: "10d10 Force", misfire: "1-2", crit: "20", range: "Placed", blast: "20 ft", dc: "heavy-pressure-triggered (150 kg+)", weight: 13.6 },
    m19_at_mine: { name: "M19 AT Mine", damage: "10d10 Force", misfire: "1-2", crit: "20", range: "Placed", blast: "20 ft", dc: "heavy-pressure-triggered (150 kg+), all-plastic (low signature)", weight: 12.5 },
    // Satchel Charges
    m183_satchel_charge: { name: "M183 Satchel Charge", damage: "12d10 Force", misfire: "1-2", crit: "20", range: "Placed", blast: "30 ft", dc: "command-detonated", weight: 9 },
    // Breaching Charges
    m1a2_bangalore_torpedo: { name: "M1A2 Bangalore Torpedo", damage: "8d10 Force", misfire: "1-2", crit: "20", range: "Placed", blast: "10 ft in line", dc: "5 ft section, clears barbed wire and minefields", weight: 6.1 },
    m2a4_shaped_charge: { name: "M2A4 Shaped Charge", damage: "15d10 Force + 10d10 Piercing", misfire: "1-2", crit: "20", range: "Placed", blast: "20 ft", dc: "directional (shaped charge), 30 lb breaching charge", weight: 13.6 },
    // Improvised Throwables
    molotov_cocktail: { name: "Molotov Cocktail", damage: "3d6 Fire", misfire: "1-4", crit: "20", range: "20 ft", blast: "5 ft", dc: "Duration 3 rounds, Ignite", weight: 1 },
    sticky_grenade: { name: "Sticky Grenade", damage: "4d10 Force", misfire: "1-3", crit: "20", range: "30 ft", blast: "15 ft", dc: "", weight: 0.5 },
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
        [`${rowPrefix}_gname`]:   p.name,
        [`${rowPrefix}_gdamage`]: p.damage,
        [`${rowPrefix}_grange`]:  p.range,
        [`${rowPrefix}_gblast`]:  p.blast,
        [`${rowPrefix}_gdc`]:     p.dc,
        [`${rowPrefix}_gweight`]: p.weight || 0,
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
      `${rowPrefix}_gname`,
      `${rowPrefix}_gdamage`,
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
      const gname = v[`${rowPrefix}_gname`] || "Grenade";
      const gdamage = v[`${rowPrefix}_gdamage`] || "1d6";
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
      const noteParts = [];
      if (gblast) noteParts.push(`Blast ${gblast}`);
      if (gdc) noteParts.push(gdc);
      const note = noteParts.join(" | ");

      const jsonPayload = buildJsonField({
        type: "grenade_throw",
        actor: charName,
        name: gname,
        mode: "Throw / Deviation",
        attack_bonus: dexMod + prof,
        dex_mod: dexMod,
        prof_bonus: prof,
        damage_formula: `${gdamage} + ${gdmg_bonus}`,
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
        `{{damage=[[${gdamage} + ${gdmg_bonus}]]}} ` +
        (note ? `{{note=${note}}} ` : "") +
        `{{ammo=${countDisplay}}} ` +
        `{{who=${charName}}} ` +
        `{{json=${jsonPayload}}}`;

      startRoll(rollText, (results) => {
        setAttrs({ [`${rowPrefix}_gcount`]: countAfter });
        finishRoll(results.rollId);
      });
    });
  });

