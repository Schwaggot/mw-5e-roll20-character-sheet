  // ---- Drone Upgrade Auto-Apply ----
  // Armor Kit: AC 15 -> 18 (readonly drone_ac).
  // Structural Support: HP-Max 10 + Operator-Level (readonly drone_hp_max).
  // Pistol Mount: Flag fuer Pistol-Button-Sichtbarkeit.
  // Upgrade-Slot-Counter: Basis 1 Slot, Enhanced B1-RD (L10) 2 Slots.
  // MacGyver (L15): schaltet MacGyver-Button frei.
  const DRONE_UPGRADE_KEYS = [
    "drone_nightvision", "drone_thermal", "drone_mic", "drone_pistolmount",
    "drone_stealth", "drone_armor", "drone_structure",
  ];

  // Gemeinsame Recalc-Funktion, damit beide Trigger (Upgrade-Change und
  // Level-Change) denselben Code ausfuehren.
  function recalcDroneUpgrades() {
    getAttrs([...DRONE_UPGRADE_KEYS, "level"], (v) => {
      const armor = parseInt(v.drone_armor) === 1;
      const structural = parseInt(v.drone_structure) === 1;
      const pistol = parseInt(v.drone_pistolmount) === 1;
      const lvl = Math.max(1, parseInt(v.level) || 1);
      let active = 0;
      for (const k of DRONE_UPGRADE_KEYS) {
        if (parseInt(v[k]) === 1) active++;
      }
      const slotMax = lvl >= 10 ? 2 : 1;
      const overloaded = active > slotMax;
      setAttrs({
        drone_ac: armor ? 18 : 15,
        drone_hp_max: structural ? 10 + lvl : 10,
        drone_pistol_available: pistol ? "1" : "0",
        drone_macgyver_available: lvl >= 15 ? "1" : "0",
        tech_package_available: lvl >= 7 ? "1" : "0",
        drone_slot_display: `${active} / ${slotMax}${lvl >= 10 ? " (E B1-RD)" : ""}`,
        drone_slot_overloaded: overloaded ? "1" : "0",
      });
    });
  }

  // Separate Handler pro Event-Quelle. Multi-Event-Strings koennen mit
  // parallelen change:level-Handlern kollidieren (z.B. Prof-Bonus-Recalc);
  // einzelne on()-Calls stellen sicher dass JEDER Trigger einzeln feuert.
  on("change:drone_armor",       recalcDroneUpgrades);
  on("change:drone_structure",   recalcDroneUpgrades);
  on("change:drone_pistolmount", recalcDroneUpgrades);
  on("change:drone_nightvision", recalcDroneUpgrades);
  on("change:drone_thermal",     recalcDroneUpgrades);
  on("change:drone_mic",         recalcDroneUpgrades);
  on("change:drone_stealth",     recalcDroneUpgrades);
  on("change:level",             recalcDroneUpgrades);
  on("sheet:opened",             recalcDroneUpgrades);

  // ---- B-1 Recon Drone ----
  // Operator steuert die Drohne mit eigenem DEX + Proficiency.
  // Tech Master (18th): kein Move-Test noetig, Auto-Success.
  // Tech Master (18th): Doppelter Prof-Bonus auf alle Drohnen-Dex-Checks.
  function droneCheck(dc, label) {
    getAttrs(["dexterity_mod", "prof_bonus", "level", "character_name"], (v) => {
      const dexMod = parseInt(v.dexterity_mod) || 0;
      const prof = parseInt(v.prof_bonus) || 2;
      const lvl = parseInt(v.level) || 1;
      const charName = v.character_name || "Operator";
      // Tech Master L18: keine Movement-Tests noetig.
      if (lvl >= 18) {
        const rollText = `&{template:check} ` +
          `{{title=B1-RD ${label}}} ` +
          `{{who=${charName}}} ` +
          `{{result=Auto-Success (Tech Master L18)}} ` +
          `{{note=No movement test required.}}`;
        startRoll(rollText, (r) => finishRoll(r.rollId));
        return;
      }
      const rollText = `&{template:check} ` +
        `{{title=B1-RD ${label}}} ` +
        `{{who=${charName}}} ` +
        `{{result=[[1d20 + ${dexMod} + ${prof}]] vs DC ${dc}}}`;
      startRoll(rollText, (r) => finishRoll(r.rollId));
    });
  }

  on("clicked:drone_move", () => droneCheck(15, "Bewegung (60ft)"));
  on("clicked:drone_dash", () => droneCheck(20, "Bewegung-Dash (120ft)"));

  on("clicked:drone_pistol", () => {
    getAttrs(["dexterity_mod", "prof_bonus", "level", "character_name"], (v) => {
      const dexMod = parseInt(v.dexterity_mod) || 0;
      const prof = parseInt(v.prof_bonus) || 2;
      const lvl = parseInt(v.level) || 1;
      const charName = v.character_name || "Operator";
      // Tech Master L18: doppelter Prof-Bonus
      const techMaster = lvl >= 18;
      const effProf = techMaster ? prof * 2 : prof;
      const note = techMaster
        ? `Pistol-Mount: nur wenn Drohne diesen Zug <= 60 ft. Tech Master L18: doppelter Prof-Bonus (${effProf} statt ${prof}).`
        : `Pistol-Mount: nur wenn Drohne diesen Zug <= 60 ft bewegt. Angriff gegen markiertes Ziel hat Advantage.`;
      const rollText = `&{template:attack} ` +
        `{{title=B1-RD Pistol Mount}} ` +
        `{{who=${charName}}} ` +
        `{{mode=Drohnen-Angriff}} ` +
        `{{attack=[[1d20 + ${dexMod} + ${effProf}]]}} ` +
        `{{damage=[[1d10 + 1]]}} ` +
        `{{note=${note}}}`;
      startRoll(rollText, (r) => finishRoll(r.rollId));
    });
  });

  // Mark Target (3rd Level, bei L10+ bis zu INT-Mod Ziele)
  on("clicked:drone_mark", () => {
    getAttrs(["level", "intelligence_mod", "character_name"], (v) => {
      const lvl = parseInt(v.level) || 1;
      const intMod = parseInt(v.intelligence_mod) || 0;
      const charName = v.character_name || "Operator";
      const enhanced = lvl >= 10;
      const count = enhanced ? Math.max(1, intMod) : 1;
      const label = enhanced
        ? `Bis zu ${count} Ziele markiert (Enhanced B1-RD L10, INT-Mod ${intMod})`
        : `1 Ziel markiert (B1-RD L3)`;
      const rollText = `&{template:check} ` +
        `{{title=B1-RD Mark Target}} ` +
        `{{who=${charName}}} ` +
        `{{result=${label}}} ` +
        `{{note=Innerhalb 120 ft von der Drohne. Ranged-Attacks gegen markierte Ziele haben Advantage.}}`;
      startRoll(rollText, (r) => finishRoll(r.rollId));
    });
  });

  // MacGyver (15th Level): Technology-Check gegen GM-DC fuer Ad-hoc Tech-Device
  on("clicked:drone_macgyver", () => {
    getAttrs(
      ["intelligence_mod", "skill_technology_bonus", "skill_technology_extra",
       "skill_technology_die", "level", "character_name"],
      (v) => {
        const intMod = parseInt(v.intelligence_mod) || 0;
        const bonus = parseInt(v.skill_technology_bonus) || 0;
        const extra = parseInt(v.skill_technology_extra) || 0;
        const die = v.skill_technology_die || "1d20";
        const lvl = parseInt(v.level) || 1;
        const charName = v.character_name || "Operator";
        // Tech Master (18th): Advantage auf alle Tech-Checks
        const effDie = lvl >= 18 ? "2d20kh1" : die;
        const note = lvl >= 18
          ? "Tech Master L18: Advantage auf alle Tech-Checks. DC vom GM. Benoetigt Drone Repair Kit im Inventar."
          : "DC vom GM. Benoetigt Drone Repair Kit im Inventar. Beispiele: Audio-Bug, Basic-Comms, Radio-Fix.";
        const rollText = `&{template:check} ` +
          `{{title=MacGyver Tech-Check}} ` +
          `{{who=${charName}}} ` +
          `{{result=Technology [[${effDie} + ${intMod} + ${bonus} + ${extra}]]}} ` +
          `{{note=${note}}}`;
        startRoll(rollText, (r) => finishRoll(r.rollId));
      }
    );
  });

