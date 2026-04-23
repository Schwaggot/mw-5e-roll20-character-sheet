  // ---- Save / Skill / Check Training Level + Shaken Auto-Apply ----
  // Level-Werte -> (Prof-Bonus + Extra-Bonus) + Advantage-Die.
  //   L0: d20, kein Bonus
  //   L1: d20, +prof
  //   L2: d20, +prof +1
  //   L3: d20, +prof +2
  //   L4: 2d20kh1 (Advantage), +prof +2
  //
  // Shaken-Level imposed Disadvantage (pro Ability):
  //   L1: Disadv auf INT/WIS/CHA Checks (ability checks und skills)
  //   L2: + Disadv auf INT/WIS/CHA Saves
  //   L3: + Disadv auf Initiative
  //   L4: + Disadv auf STR/DEX Checks und Saves
  //   L5: + Disadv auf alle Attacks und CON-Checks/Saves (Attacks via Worker)
  //
  // D&D-5E Rule: Advantage + Disadvantage cancel to normal 1d20.
  const SAVE_ABILITIES = ["str", "dex", "con", "int", "wis", "cha"];

  function saveBonusForLevel(level, profBonus) {
    if (level <= 0) return 0;
    if (level === 1) return profBonus;
    if (level === 2) return profBonus + 1;
    return profBonus + 2; // Level 3 and 4
  }

  // kind = "check" (ability check) / "save" / "skill" (uses ability for check)
  // abil = "str" | "dex" | "con" | "int" | "wis" | "cha"
  function shakenImposesDisadv(kind, abil, shaken) {
    if (kind === "check" || kind === "skill") {
      // Ability checks (incl. skills): INT/WIS/CHA at L1, STR/DEX at L4, CON at L5
      if (shaken >= 1 && (abil === "int" || abil === "wis" || abil === "cha")) return true;
      if (shaken >= 4 && (abil === "str" || abil === "dex")) return true;
      if (shaken >= 5 && abil === "con") return true;
      return false;
    }
    if (kind === "save") {
      // Saves: INT/WIS/CHA at L2, STR/DEX at L4, CON at L5
      if (shaken >= 2 && (abil === "int" || abil === "wis" || abil === "cha")) return true;
      if (shaken >= 4 && (abil === "str" || abil === "dex")) return true;
      if (shaken >= 5 && abil === "con") return true;
      return false;
    }
    if (kind === "init") {
      // Initiative: disadv at Shaken L3+
      return shaken >= 3;
    }
    return false;
  }

  // Kombiniert Training-Level-Advantage mit Shaken-Disadvantage.
  // Advantage + Disadvantage = normal 1d20 (cancel).
  function dieForState(trainLevel, disadv) {
    const hasAdv = trainLevel >= 4;
    if (hasAdv && disadv) return "1d20";       // Cancel
    if (hasAdv)           return "2d20kh1";
    if (disadv)           return "2d20kl1";
    return "1d20";
  }

  // Skill slug -> primary ability (for Shaken-Disadv-Check)
  const SKILL_ABILITY_MAP = {
    acrobatics: "dex", animal: "wis", athletics: "str", deception: "cha",
    history: "int", insight: "wis", intimidation: "cha", investigation: "int",
    medicine: "wis", nature: "int", perception: "wis", performance: "cha",
    persuasion: "cha", science: "int", sleight: "dex", stealth: "dex",
    survival: "wis", technology: "int",
  };

  function recalcAllSaves(prof, shaken) {
    const lvlAttrs = [];
    SAVE_ABILITIES.forEach((a) => {
      lvlAttrs.push(`save_${a}_level`);
      lvlAttrs.push(`save_${a}_train_level`);
    });
    getAttrs(lvlAttrs, (v) => {
      const upd = {};
      for (const a of SAVE_ABILITIES) {
        const manual = parseInt(v[`save_${a}_level`]) || 0;
        const train  = parseInt(v[`save_${a}_train_level`]) || 0;
        const lvl    = Math.max(manual, train);
        const disadv = shakenImposesDisadv("save", a, shaken);
        upd[`save_${a}_bonus`] = saveBonusForLevel(lvl, prof);
        upd[`save_${a}_die`]   = dieForState(lvl, disadv);
      }
      setAttrs(upd);
    });
  }

  // Bei jeder Level-Aenderung (manuell ODER training): nur das eine Save neu rechnen.
  SAVE_ABILITIES.forEach((a) => {
    const handler = () => {
      getAttrs([`save_${a}_level`, `save_${a}_train_level`, "prof_bonus", "shaken_level"], (v) => {
        const manual = parseInt(v[`save_${a}_level`]) || 0;
        const train  = parseInt(v[`save_${a}_train_level`]) || 0;
        const lvl    = Math.max(manual, train);
        const prof   = parseInt(v.prof_bonus) || 2;
        const shaken = parseInt(v.shaken_level) || 0;
        setAttrs({
          [`save_${a}_bonus`]: saveBonusForLevel(lvl, prof),
          [`save_${a}_die`]:   dieForState(lvl, shakenImposesDisadv("save", a, shaken)),
        });
      });
    };
    on(`change:save_${a}_level`, handler);
    on(`change:save_${a}_train_level`, handler);
  });

  // Bei Prof-Bonus / Shaken-Aenderung (Level-Up oder Stress) alle Dice neu rechnen.
  on("change:prof_bonus change:shaken_level sheet:opened", () => {
    getAttrs(["prof_bonus", "shaken_level"], (v) => {
      const prof = parseInt(v.prof_bonus) || 2;
      const shaken = parseInt(v.shaken_level) || 0;
      recalcAllSaves(prof, shaken);
      recalcAllSkills(prof, shaken);
      recalcAllChecks(shaken);
    });
  });

  // ---- Skill Training Level Auto-Apply ----
  const SKILL_SLUGS = [
    "acrobatics", "animal", "athletics", "deception", "history", "insight",
    "intimidation", "investigation", "medicine", "nature", "perception",
    "performance", "persuasion", "science", "sleight", "stealth", "survival",
    "technology",
  ];

  function recalcAllSkills(prof, shaken) {
    const lvlAttrs = [];
    SKILL_SLUGS.forEach((s) => {
      lvlAttrs.push(`skill_${s}_level`);
      lvlAttrs.push(`skill_${s}_train_level`);
    });
    getAttrs(lvlAttrs, (v) => {
      const upd = {};
      for (const s of SKILL_SLUGS) {
        const manual = parseInt(v[`skill_${s}_level`]) || 0;
        const train  = parseInt(v[`skill_${s}_train_level`]) || 0;
        const lvl    = Math.max(manual, train);
        const abil = SKILL_ABILITY_MAP[s];
        const disadv = shakenImposesDisadv("skill", abil, shaken);
        upd[`skill_${s}_bonus`] = saveBonusForLevel(lvl, prof);
        upd[`skill_${s}_die`]   = dieForState(lvl, disadv);
      }
      setAttrs(upd);
    });
  }

  // Pro Skill: Level-Aenderung (manuell ODER training) -> nur dieses Skill neu rechnen.
  SKILL_SLUGS.forEach((s) => {
    const handler = () => {
      getAttrs([`skill_${s}_level`, `skill_${s}_train_level`, "prof_bonus", "shaken_level"], (v) => {
        const manual = parseInt(v[`skill_${s}_level`]) || 0;
        const train  = parseInt(v[`skill_${s}_train_level`]) || 0;
        const lvl    = Math.max(manual, train);
        const prof   = parseInt(v.prof_bonus) || 2;
        const shaken = parseInt(v.shaken_level) || 0;
        const abil   = SKILL_ABILITY_MAP[s];
        setAttrs({
          [`skill_${s}_bonus`]: saveBonusForLevel(lvl, prof),
          [`skill_${s}_die`]:   dieForState(lvl, shakenImposesDisadv("skill", abil, shaken)),
        });
      });
    };
    on(`change:skill_${s}_level`, handler);
    on(`change:skill_${s}_train_level`, handler);
  });

  // Ability-Check-Dice (keine Trainings-Levels, nur Shaken-Disadv).
  // Genutzt von den 6 Attribut-Roll-Buttons oben rechts.
  function recalcAllChecks(shaken) {
    const upd = {};
    for (const a of SAVE_ABILITIES) {
      const disadv = shakenImposesDisadv("check", a, shaken);
      upd[`check_${a}_die`] = disadv ? "2d20kl1" : "1d20";
    }
    // Initiative-Die (Shaken 3+)
    upd.init_die = shakenImposesDisadv("init", null, shaken) ? "2d20kl1" : "1d20";
    setAttrs(upd);
  }

