  // ---- Grenade/Explosive Presets ----
  // weight = kg pro Einzel-Item (fuer Encumbrance-Sum, multipliziert mit gcount).
  const GRENADE_PRESETS = {
    m67:         { name: "M67 Fragmentation",    damage: "2d8 + 2d8",  range: "30 ft", blast: "10 ft",       dc: "DC 8 + Prof + Dex (Dex-Save, half)",       weight: 0.4 },
    anm14:       { name: "AN-M14 TH3 Incendiary",damage: "6d6",        range: "30 ft", blast: "5 ft",        dc: "4 Rd Duration, Ignite cloth 1d6/Rd",       weight: 0.9 },
    m84:         { name: "M84 Flashbang",        damage: "5d6 + 5d6",  range: "30 ft", blast: "10 ft",       dc: "Con-Save Flash (Blind 1d4), Sound (Deaf 1d4)", weight: 0.2 },
    c4_quarter:  { name: "0.1 kg C4",            damage: "2d10",       range: "Placed",blast: "10 ft + 0.6 kg",dc: "Demolitions Tools zum Setzen",             weight: 0.1 },
    detcord:     { name: "1 ft Det Cord",        damage: "2d10",       range: "Placed",blast: "10 ft (Line)", dc: "Linear Blast, pro ft stackbar",            weight: 0.05 },
    sticky:      { name: "Sticky Grenade",       damage: "4d10",       range: "30 ft", blast: "15 ft",       dc: "Thrown + klebt (kein Deviation wenn haftet)", weight: 0.5 },
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

      const rollText = `&{template:attack} ` +
        `{{title=${gname}}} ` +
        `{{mode=Throw / Deviation}} ` +
        `{{attack=[[1d20 + ${dexMod} + ${prof}]]}} ` +
        `{{damage=[[${gdamage} + ${gdmg_bonus}]]}} ` +
        (note ? `{{note=${note}}} ` : "") +
        `{{ammo=${countDisplay}}} ` +
        `{{who=${charName}}}`;

      startRoll(rollText, (results) => {
        setAttrs({ [`${rowPrefix}_gcount`]: countAfter });
        finishRoll(results.rollId);
      });
    });
  });

