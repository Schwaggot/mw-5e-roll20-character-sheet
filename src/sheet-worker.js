  // ---- Attribute Modifier ----
  const ATTRS = ["strength","dexterity","constitution","intelligence","wisdom","charisma"];

  ATTRS.forEach(attr => {
    on(`change:${attr}`, () => {
      getAttrs([attr], (v) => {
        const score = parseInt(v[attr]) || 10;
        const mod = Math.floor((score - 10) / 2);
        const upd = {};
        upd[`${attr}_mod`] = mod;
        setAttrs(upd);
      });
    });
  });

  // ---- Proficiency Bonus from Level ----
  on("change:level sheet:opened", () => {
    getAttrs(["level"], (v) => {
      const lvl = Math.max(1, Math.min(20, parseInt(v.level) || 1));
      let prof = 2;
      if (lvl >= 17) prof = 6;
      else if (lvl >= 13) prof = 5;
      else if (lvl >= 9) prof = 4;
      else if (lvl >= 5) prof = 3;
      setAttrs({ prof_bonus: prof });
    });
  });

  // ---- Encumbrance (Weight-Sum + Status-Indicator) ----
  // Summiert Weapons (wweight) + equipped Armor (aweight) + Inventory
  // (iweight * iqty). Max = STR * 7 kg. Status als 3 kumulative Checkboxen
  // die CSS via :has(:checked) in Hintergrund-Farben uebersetzt.
  const WEIGHT_FACTOR_MAX = 7; // STR * 7 kg Carry Capacity (D&D x15 lbs)

  function parseKg(str) {
    if (!str) return 0;
    const m = /^\s*([\d.,]+)\s*kg/i.exec(String(str));
    return m ? parseFloat(m[1].replace(",", ".")) : 0;
  }

  // Fest-Gewichte fuer Companion-/Designation-spezifische Items.
  // Werden addiert wenn die jeweilige Designation aktiv ist.
  const DRONE_WEIGHT = 3.6;  // B-1 Recon Drone + Command Console (Compendium)

  function recalcEncumbrance() {
    getSectionIDs("repeating_weapons", (weaponIds) => {
      getSectionIDs("repeating_armor", (armorIds) => {
        getSectionIDs("repeating_gear", (gearIds) => {
          getSectionIDs("repeating_grenades", (grenadeIds) => {
            const attrs = ["strength", "desig_tech"];
            for (const id of weaponIds) {
              attrs.push(`repeating_weapons_${id}_wweight`);
            }
            for (const id of armorIds) {
              attrs.push(`repeating_armor_${id}_aweight`);
              attrs.push(`repeating_armor_${id}_aequipped`);
            }
            for (const id of gearIds) {
              attrs.push(`repeating_gear_${id}_iweight`);
              attrs.push(`repeating_gear_${id}_iqty`);
            }
            for (const id of grenadeIds) {
              attrs.push(`repeating_grenades_${id}_gweight`);
              attrs.push(`repeating_grenades_${id}_gcount`);
            }
            getAttrs(attrs, (v) => {
              let total = 0;
              for (const id of weaponIds) {
                total += parseFloat(v[`repeating_weapons_${id}_wweight`]) || 0;
              }
              for (const id of armorIds) {
                const equipped = parseInt(v[`repeating_armor_${id}_aequipped`]) || 0;
                if (!equipped) continue;
                total += parseKg(v[`repeating_armor_${id}_aweight`]);
              }
              for (const id of gearIds) {
                const qty = parseInt(v[`repeating_gear_${id}_iqty`]) || 1;
                total += parseKg(v[`repeating_gear_${id}_iweight`]) * qty;
              }
              for (const id of grenadeIds) {
                const count = parseInt(v[`repeating_grenades_${id}_gcount`]) || 0;
                const w = parseFloat(v[`repeating_grenades_${id}_gweight`]) || 0;
                total += w * count;
              }
              // Tech Specialist traegt die B-1 Recon Drone (~3.6 kg inkl. Console)
              if (parseInt(v.desig_tech) === 1) total += DRONE_WEIGHT;
              const str = Math.max(1, parseInt(v.strength) || 10);
              const max = str * WEIGHT_FACTOR_MAX;
              const isOver = total > max;
              const isHeavy = !isOver && total > max * 2 / 3;
              const isEnc = !isOver && !isHeavy && total > max / 3;
              setAttrs({
                weight_total: total.toFixed(1),
                weight_max: max.toFixed(1),
                weight_display: `${total.toFixed(1)} / ${max.toFixed(1)} kg`,
                weight_status_encumbered: isEnc ? "1" : "0",
                weight_status_heavy:      isHeavy ? "1" : "0",
                weight_status_overloaded: isOver ? "1" : "0",
              });
            });
          });
        });
      });
    });
  }

  on(
    "change:strength change:desig_tech " +
    "change:repeating_weapons:wweight change:repeating_weapons remove:repeating_weapons " +
    "change:repeating_armor:aweight change:repeating_armor:aequipped " +
    "change:repeating_armor remove:repeating_armor " +
    "change:repeating_gear:iweight change:repeating_gear:iqty " +
    "change:repeating_gear remove:repeating_gear " +
    "change:repeating_grenades:gweight change:repeating_grenades:gcount " +
    "change:repeating_grenades remove:repeating_grenades " +
    "sheet:opened",
    () => recalcEncumbrance()
  );

  // ---- Sharpshooter-Sichtbarkeit (Marksmanship Level >= 3) ----
  // Hidden-Checkbox attr_sharpshooter_available wird vom Worker gesetzt;
  // CSS :has() blendet pro Weapon die Sharpshooter-Checkbox ein/aus.
  on("change:train_marksmanship sheet:opened", () => {
    getAttrs(["train_marksmanship"], (v) => {
      const level = parseInt(v.train_marksmanship) || 0;
      setAttrs({ sharpshooter_available: level >= 3 ? "1" : "0" });
    });
  });

  // ---- CQB-Sichtbarkeit (Melee-Button ab CQB Training Level 1) ----
  on("change:train_cqb sheet:opened", () => {
    getAttrs(["train_cqb"], (v) => {
      const level = parseInt(v.train_cqb) || 0;
      setAttrs({ cqb_available: level >= 1 ? "1" : "0" });
    });
  });

  // ---- Brawler-Sichtbarkeit (Brawler Points Section ab brawler_max > 0) ----
  on("change:brawler_max sheet:opened", () => {
    getAttrs(["brawler_max"], (v) => {
      const max = parseInt(v.brawler_max) || 0;
      setAttrs({ brawler_available: max > 0 ? "1" : "0" });
    });
  });

  // ---- Unarmed-Combat-Sichtbarkeit + Display-Level-Mirror ----
  on("change:train_unarmed sheet:opened", () => {
    getAttrs(["train_unarmed"], (v) => {
      const level = parseInt(v.train_unarmed) || 0;
      setAttrs({
        unarmed_available: level >= 1 ? "1" : "0",
        train_unarmed_display: String(level),
      });
    });
  });

  // ---- Inspiring Leader Freischaltung (Unit Leader 7th Level) ----
  on("change:level", () => {
    getAttrs(["level"], (v) => {
      const level = parseInt(v.level) || 1;
      setAttrs({ inspire_available: level >= 7 ? "1" : "0" });
    });
  });
  on("sheet:opened", () => {
    getAttrs(["level"], (v) => {
      const level = parseInt(v.level) || 1;
      setAttrs({ inspire_available: level >= 7 ? "1" : "0" });
    });
  });

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

  // ---- Unarmed Strike Roll ----
  // Damage-Die skaliert mit Training-Level. Worker waehlt STR oder DEX
  // (jeweils den hoeheren Mod) fuer Attack und Damage.
  on("clicked:unarmed_strike", () => {
    getAttrs(
      ["train_unarmed", "strength_mod", "dexterity_mod", "prof_bonus",
       "character_name", "shaken_level"],
      (v) => {
        const lvl = Math.max(0, Math.min(5, parseInt(v.train_unarmed) || 0));
        const strMod = parseInt(v.strength_mod) || 0;
        const dexMod = parseInt(v.dexterity_mod) || 0;
        const prof = parseInt(v.prof_bonus) || 2;
        const charName = v.character_name || "Operator";
        const shakenLevel = parseInt(v.shaken_level) || 0;
        const shakenDisadv = shakenLevel >= 5;

        // L1/2: 1d4, L3/4: 1d6, L5: 1d8
        let die = "1d4";
        if (lvl >= 5)      die = "1d8";
        else if (lvl >= 3) die = "1d6";

        const abilMod = Math.max(strMod, dexMod);
        const abilLabel = abilMod === strMod ? "STR" : "DEX";
        const proficient = lvl >= 1;
        const profApplied = proficient ? prof : 0;

        const d20a = Math.floor(Math.random() * 20) + 1;
        const d20b = Math.floor(Math.random() * 20) + 1;
        const d20 = shakenDisadv ? Math.min(d20a, d20b) : d20a;
        const atkBonus = abilMod + profApplied;
        const damageFormula = `${die} + ${abilMod}`;

        let note = `Unarmed L${lvl}: ${die} + ${abilLabel}-Mod ${abilMod >= 0 ? "+" : ""}${abilMod}. Attack +${atkBonus} (${abilLabel}${proficient ? ` + Prof ${prof}` : ""}).`;
        if (!proficient) note += ` NICHT proficient (L0) - GM pruefen.`;
        if (lvl >= 2)    note += ` L2: Grapple als Bonus-Action nach Hit.`;
        if (lvl >= 4)    note += ` L4: Advantage vs grappled, Pin-Aktion moeglich.`;
        if (lvl >= 5)    note += ` L5: 1d10 wenn beide Haende frei (manuell).`;
        if (shakenDisadv) note += ` Shaken 5/Broken (Disadv: ${d20a}/${d20b} -> ${d20}).`;

        startRoll(
          `&{template:attack} ` +
          `{{title=Unarmed Strike}} ` +
          `{{mode=Unarmed (${abilLabel})}} ` +
          `{{attack=[[${d20} + ${atkBonus}]]}} ` +
          `{{damage=[[${damageFormula}]]}} ` +
          `{{who=${charName}}} ` +
          `{{note=${note}}}`,
          (r) => finishRoll(r.rollId)
        );
      }
    );
  });

  // ---- Designation-Sichtbarkeit (Leadership / Medic / Demo / Tech / Dog) ----
  // Mapping Designation-Value -> Flag-Attribute. Leere Flags = Sektion versteckt.
  on("change:combat_designation sheet:opened", () => {
    getAttrs(["combat_designation"], (v) => {
      const d = (v.combat_designation || "").trim();
      setAttrs({
        desig_unit_leader: d === "Unit Leader"            ? "1" : "0",
        desig_medic:       d === "Combat Medic"           ? "1" : "0",
        desig_demo:        d === "Demolitions Specialist" ? "1" : "0",
        desig_tech:        d === "Tech Specialist"        ? "1" : "0",
        desig_dog:         d === "Dog Handler"            ? "1" : "0",
      });
    });
  });

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
    const lvlAttrs = SAVE_ABILITIES.map((a) => `save_${a}_level`);
    getAttrs(lvlAttrs, (v) => {
      const upd = {};
      for (const a of SAVE_ABILITIES) {
        const lvl = parseInt(v[`save_${a}_level`]) || 0;
        const disadv = shakenImposesDisadv("save", a, shaken);
        upd[`save_${a}_bonus`] = saveBonusForLevel(lvl, prof);
        upd[`save_${a}_die`]   = dieForState(lvl, disadv);
      }
      setAttrs(upd);
    });
  }

  // Bei jeder Level-Aenderung: nur das eine Save neu rechnen.
  SAVE_ABILITIES.forEach((a) => {
    on(`change:save_${a}_level`, () => {
      getAttrs([`save_${a}_level`, "prof_bonus", "shaken_level"], (v) => {
        const lvl = parseInt(v[`save_${a}_level`]) || 0;
        const prof = parseInt(v.prof_bonus) || 2;
        const shaken = parseInt(v.shaken_level) || 0;
        setAttrs({
          [`save_${a}_bonus`]: saveBonusForLevel(lvl, prof),
          [`save_${a}_die`]:   dieForState(lvl, shakenImposesDisadv("save", a, shaken)),
        });
      });
    });
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
    const lvlAttrs = SKILL_SLUGS.map((s) => `skill_${s}_level`);
    getAttrs(lvlAttrs, (v) => {
      const upd = {};
      for (const s of SKILL_SLUGS) {
        const lvl = parseInt(v[`skill_${s}_level`]) || 0;
        const abil = SKILL_ABILITY_MAP[s];
        const disadv = shakenImposesDisadv("skill", abil, shaken);
        upd[`skill_${s}_bonus`] = saveBonusForLevel(lvl, prof);
        upd[`skill_${s}_die`]   = dieForState(lvl, disadv);
      }
      setAttrs(upd);
    });
  }

  // Pro Skill: Level-Aenderung -> nur dieses Skill neu rechnen.
  SKILL_SLUGS.forEach((s) => {
    on(`change:skill_${s}_level`, () => {
      getAttrs([`skill_${s}_level`, "prof_bonus", "shaken_level"], (v) => {
        const lvl = parseInt(v[`skill_${s}_level`]) || 0;
        const prof = parseInt(v.prof_bonus) || 2;
        const shaken = parseInt(v.shaken_level) || 0;
        const abil = SKILL_ABILITY_MAP[s];
        setAttrs({
          [`skill_${s}_bonus`]: saveBonusForLevel(lvl, prof),
          [`skill_${s}_die`]:   dieForState(lvl, shakenImposesDisadv("skill", abil, shaken)),
        });
      });
    });
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

  // ---- Stress / Shaken Automation ----
  // Stress akkumuliert separat vom HP. Pro Treffer += (Dmg - WIS, min 1).
  // Jedes Vielfache von WIS triggert einen Save (DCs 12/15/20/25/30).
  // Fail = Shaken Level steigt. Heilung senkt Stress und ggf. Shaken-Level.
  const STRESS_DCS = [12, 15, 20, 25, 30]; // [threshold 1x .. 5x WIS]

  function thresholdCount(stress, wis) {
    if (wis <= 0) return 0;
    return Math.max(0, Math.min(5, Math.floor(stress / wis)));
  }

  function nextDcLabel(currentLevel, stress, wis) {
    const nextLvl = Math.min(5, currentLevel + 1);
    if (nextLvl > 5) return "-";
    const toCross = nextLvl * wis;
    const remaining = Math.max(0, toCross - stress);
    return `DC ${STRESS_DCS[nextLvl - 1]} (bei ${toCross} Stress, noch ${remaining})`;
  }

  // Auto-Save + Shaken-Update bei aendernder Stress-Anzeige.
  on("change:stress_total change:wisdom sheet:opened", (info) => {
    getAttrs(
      ["stress_total", "shaken_level", "stress_last_threshold",
       "wisdom", "wisdom_mod", "character_name"],
      (v) => {
        const stress = Math.max(0, parseInt(v.stress_total) || 0);
        const wis = Math.max(1, parseInt(v.wisdom) || 10);
        const wisMod = parseInt(v.wisdom_mod) || 0;
        let shaken = parseInt(v.shaken_level) || 0;
        const lastT = parseInt(v.stress_last_threshold) || 0;
        const charName = v.character_name || "Operator";

        const newT = thresholdCount(stress, wis);

        // Nach oben ueberschritten: Save triggern am HOECHSTEN neuen Breakpoint.
        // Fuer RAW-Puristen: manuell den Stress-Save-Button fuer jeden weiteren Breakpoint klicken.
        const eventChangedStress = info && info.sourceAttribute === "stress_total";
        if (eventChangedStress && newT > lastT && newT > 0) {
          const targetLevel = newT;
          const dc = STRESS_DCS[targetLevel - 1];
          const d20 = Math.floor(Math.random() * 20) + 1;
          const total = d20 + wisMod;
          const passed = total >= dc;
          if (!passed) shaken = Math.max(shaken, targetLevel);
          const note = passed
            ? `Bestanden. Shaken bleibt bei ${shaken}.`
            : `FAIL. Shaken steigt auf ${targetLevel}${lastT > 0 ? ` (von ${Math.max(lastT, shaken)})` : ""}.`;
          startRoll(
            `&{template:check} {{title=Stress Save (Breakpoint ${targetLevel}x WIS)}} ` +
            `{{who=${charName}}} ` +
            `{{result=[[${d20} + ${wisMod}]] vs DC ${dc}}} ` +
            `{{note=${note}}}`,
            (r) => finishRoll(r.rollId)
          );
        }

        // Nach unten unter aktuellen Shaken-Level: Shaken floor auf neuen Threshold.
        if (newT < shaken) shaken = newT;

        const upd = {
          stress_last_threshold: String(newT),
          shaken_level: String(shaken),
          stress_next_dc: (shaken >= 5) ? "Max (Broken)" : nextDcLabel(shaken, stress, wis),
        };
        setAttrs(upd);
      }
    );
  });

  // Next-DC-Label aktualisieren wenn Shaken-Level manuell geaendert wird.
  on("change:shaken_level", () => {
    getAttrs(["stress_total", "shaken_level", "wisdom"], (v) => {
      const stress = parseInt(v.stress_total) || 0;
      const wis = Math.max(1, parseInt(v.wisdom) || 10);
      const shaken = parseInt(v.shaken_level) || 0;
      setAttrs({
        stress_next_dc: (shaken >= 5) ? "Max (Broken)" : nextDcLabel(shaken, stress, wis),
      });
    });
  });

  // Manueller Stress-Save (Button): rollt gegen aktuellen Next-DC.
  on("clicked:stress_save", () => {
    getAttrs(
      ["stress_total", "shaken_level", "wisdom", "wisdom_mod", "character_name"],
      (v) => {
        const stress = parseInt(v.stress_total) || 0;
        const wis = Math.max(1, parseInt(v.wisdom) || 10);
        const wisMod = parseInt(v.wisdom_mod) || 0;
        let shaken = parseInt(v.shaken_level) || 0;
        const charName = v.character_name || "Operator";

        if (shaken >= 5) {
          startRoll(
            `&{template:check} {{title=Stress Save}} {{who=${charName}}} {{result=Broken - kein weiterer Save moeglich}}`,
            (r) => finishRoll(r.rollId)
          );
          return;
        }

        const targetLevel = Math.min(5, shaken + 1);
        const dc = STRESS_DCS[targetLevel - 1];
        const d20 = Math.floor(Math.random() * 20) + 1;
        const total = d20 + wisMod;
        const passed = total >= dc;
        if (!passed) shaken = targetLevel;
        startRoll(
          `&{template:check} {{title=Stress Save (Manuell, DC ${dc})}} ` +
          `{{who=${charName}}} ` +
          `{{result=[[${d20} + ${wisMod}]] vs DC ${dc}}} ` +
          `{{note=${passed ? "Bestanden." : `FAIL - Shaken steigt auf ${shaken}.`}}}`,
          (r) => {
            setAttrs({
              shaken_level: String(shaken),
              stress_next_dc: (shaken >= 5) ? "Max (Broken)" : nextDcLabel(shaken, stress, wis),
            });
            finishRoll(r.rollId);
          }
        );
      }
    );
  });

  // Heal-Buttons (Short / Long Rest). Heal-Dice haengen vom aktuellen
  // Shaken-Level ab. Wird von Stress abgezogen, Shaken-Level floort auto
  // via change:stress_total-Handler.
  function rollFormula(formula) {
    // Parst "NdX + M" oder "NdX" oder "N". Rollt die Dice in JS.
    const m = /^\s*(\d+)d(\d+)\s*(?:\+\s*(-?\d+))?\s*$/.exec(formula);
    if (m) {
      const count = parseInt(m[1]);
      const sides = parseInt(m[2]);
      const mod = m[3] !== undefined ? parseInt(m[3]) : 0;
      let sum = 0;
      for (let i = 0; i < count; i++) sum += Math.floor(Math.random() * sides) + 1;
      return sum + mod;
    }
    const n = parseInt(formula);
    return isNaN(n) ? 0 : n;
  }

  function stressHeal(mode) {
    getAttrs(
      ["stress_total", "shaken_level", "wisdom_mod", "character_name"],
      (v) => {
        const stress = parseInt(v.stress_total) || 0;
        const shaken = parseInt(v.shaken_level) || 0;
        const wisMod = parseInt(v.wisdom_mod) || 0;
        const charName = v.character_name || "Operator";

        // Heal-Tabelle [short, long] je Shaken-Level 0-5.
        // MED = Medical Help erforderlich, kein Self-Heal.
        const table = [
          [`1d10 + ${wisMod}`,  `${stress}`],     // Shaken 0: generic
          [`1d6 + ${wisMod}`,   `1d12 + ${wisMod}`],
          [`1d4 + ${wisMod}`,   `1d8 + ${wisMod}`],
          [`1`,                  `1d4 + ${wisMod}`],
          [`MED`,                `1 + ${wisMod}`],
          [`MED`,                `MED`],
        ];
        const formula = table[shaken][mode === "long" ? 1 : 0];
        const restLabel = mode === "long" ? "Long Rest" : "Short Rest";

        if (formula === "MED") {
          startRoll(
            `&{template:check} {{title=Stress-Heilung ${restLabel}}} ` +
            `{{who=${charName}}} ` +
            `{{result=Medical Help erforderlich}} ` +
            `{{note=Shaken ${shaken} heilt bei ${restLabel} NICHT selbst. Combat Medic / I.V. / Morphine noetig.}}`,
            (r) => finishRoll(r.rollId)
          );
          return;
        }

        const amount = Math.max(0, rollFormula(formula));
        const newStress = Math.max(0, stress - amount);
        setAttrs({ stress_total: String(newStress) });
        startRoll(
          `&{template:check} {{title=Stress-Heilung ${restLabel}}} ` +
          `{{who=${charName}}} ` +
          `{{result=-${amount} Stress (Formel ${formula})}} ` +
          `{{note=Stress ${stress} -> ${newStress}. Shaken-Level floort automatisch wenn unter Breakpoint.}}`,
          (r) => finishRoll(r.rollId)
        );
      }
    );
  }

  on("clicked:stress_heal_short", () => stressHeal("short"));
  on("clicked:stress_heal_long",  () => stressHeal("long"));

  // ---- Triage Code from HP ----
  on("change:hp change:hp_max sheet:opened", () => {
    getAttrs(["hp", "hp_max"], (v) => {
      const hp = parseInt(v.hp) || 0;
      const max = parseInt(v.hp_max) || 1;
      const pct = (hp / max) * 100;
      let label = "Green";
      if (hp <= 0) label = "Black";
      else if (pct <= 25) label = "Red";
      else if (pct <= 50) label = "Orange";
      else if (pct <= 75) label = "Yellow";
      setAttrs({ triage_label: label });
    });
  });

  // ---- Init: make sure mods exist on sheet open ----
  on("sheet:opened", () => {
    getAttrs(ATTRS, (v) => {
      const upd = {};
      ATTRS.forEach(a => {
        const score = parseInt(v[a]) || 10;
        upd[`${a}_mod`] = Math.floor((score - 10) / 2);
      });
      setAttrs(upd);
    });
  });

  // ---- Weapon Fire Handler (Action Buttons + startRoll API) ----
  // Da type="roll"-Buttons in Repeating-Sections keine clicked-Events
  // feuern, sind die Weapon-Buttons jetzt type="action". Der Sheet-
  // Worker liest die Waffendaten, baut den Roll-Template-String
  // selbst und schickt ihn via startRoll an den Chat. Im Callback
  // wird die Ammo dekrementiert.
  const WEAPON_MODES = {
    wsingle: { mode: "Single (1 rd)",      ammo: 1,       usePen: "single" },
    wburst:  { mode: "Burst (3 rd)",       ammo: 3,       usePen: "auto"   },
    wauto:   { mode: "Full Auto Volley",   ammo: "1d4+2", usePen: "auto"   },
    waimed:  { mode: "Aimed (+2, 1 rd)",   ammo: 1,       usePen: "single", aimBonus: 2 },
  };

  // Parst Range-Strings wie "1-3", "20", "19-20". Gibt {min,max} zurück,
  // oder null wenn ungueltig. Wird für Misfire- und Crit-Range genutzt.
  function parseRange(str) {
    if (!str) return null;
    const m = /^\s*(\d+)(?:\s*-\s*(\d+))?\s*$/.exec(String(str));
    if (!m) return null;
    const a = parseInt(m[1]);
    const b = m[2] ? parseInt(m[2]) : a;
    return { min: Math.min(a, b), max: Math.max(a, b) };
  }

  // Multipliziert die Würfel-Count in einer Damage-Formel wie "4d4 + 2".
  // Beispiel: multiplyDiceCount("4d4 + 2", 2) = "8d4 + 2".
  // Nur der NdX-Teil wird skaliert, flache Boni bleiben unverändert
  // (D&D-Crit-Regel: nur Dice verdoppeln, nicht Modifier).
  function multiplyDiceCount(formula, multiplier) {
    if (multiplier <= 1) return formula;
    return String(formula).replace(/(\d+)d(\d+)/g, (m, count, sides) => {
      return `${parseInt(count) * multiplier}d${sides}`;
    });
  }

  // Zielzonen (Body-Part-Targeting) aus dem Compendium.
  // pen = to-hit-Penalty die vom Attack abgezogen wird.
  // effect = kurze Beschreibung der Con-Save-Konsequenz (DC = Dmg).
  const TARGET_ZONES = {
    torso:  { label: "Torso",  pen: 0,  effect: "" },
    head:   { label: "Kopf",   pen: 10, effect: "Jeder Hit = Crit: Schadens-Dice x2 selbst nachwürfeln. Nat. 20: x3 statt x2." },
    arms:   { label: "Arme",   pen: 6,  effect: "Bei Hit: Ziel Con-Save DC=Dmg. Fail = Item fallt, Arm 1d4 Rd unbrauchbar." },
    hands:  { label: "Hände", pen: 8,  effect: "Bei Hit: Ziel Con-Save DC=Dmg. Fail = Item fallt, Hand 1d4 Rd unbrauchbar." },
    pelvis: { label: "Becken", pen: 4,  effect: "Bei Hit: Ziel Con-Save DC=Dmg. Fail = Prone, 1d4 Rd nicht aufstehen." },
    legs:   { label: "Beine",  pen: 5,  effect: "Bei Hit: Ziel Con-Save DC=Dmg. Fail = Slowed 1d4 Rd." },
    feet:   { label: "Füße", pen: 7,  effect: "Bei Hit: Ziel Con-Save DC=Dmg. Fail = kein DEX-Bonus 1d4 Rd." },
  };

  // ---- Weapon-Status (FUBAR / Jammed / Broken / Destroyed) ----
  // Labels fuer Chat-Anzeige, Rule-Hints fuer Block-Message.
  const FUBAR_STATUS_LABELS = {
    ok:            "OK",
    jammed:        "Jammed",
    broken_short:  "Broken (Short)",
    broken_long:   "Broken (Long)",
    needs_repair:  "Needs Repair",
    destroyed:     "Destroyed / FUBAR",
  };
  const FUBAR_STATUS_HINTS = {
    jammed:        "Action + DC 10 DEX (Clear Jam).",
    broken_short:  "Field Repair DC 10 DEX nach Short Rest.",
    broken_long:   "Bench Repair DC 15 DEX nach Long Rest.",
    needs_repair:  "Parts + 1 Tag Arbeit + DC 15 (DM).",
    destroyed:     "FUBAR - zerstoert, Vollersatz noetig. Row manuell loeschen.",
  };

  // Mapping d100 bei misfire_yes -> wstatus.
  function fubarStatusForD100(d100) {
    if (d100 <= 1)  return "destroyed";
    if (d100 <= 5)  return "needs_repair";
    if (d100 <= 10) return "broken_long";
    if (d100 <= 15) return "broken_short";
    return "jammed"; // 16-60
  }

  // Baut die setAttrs-Updates fuer einen Status-Wechsel ein: schreibt
  // wstatus (truth) und togglet die 5 Hidden-Checkbox-Flags entsprechend.
  // CSS :has(:checked) liest die Flags und schaltet Badge + Repair-Row.
  const WSTATUS_FLAGS = ["jammed", "broken_short", "broken_long", "needs_repair", "destroyed"];
  function applyWeaponStatus(rowPrefix, status, targetUpd) {
    const upd = targetUpd || {};
    upd[`${rowPrefix}_wstatus`] = status;
    for (const s of WSTATUS_FLAGS) {
      upd[`${rowPrefix}_wstatus_${s}`] = (status === s) ? "1" : "0";
    }
    return upd;
  }

  // Chat-Message wenn Attack-Button auf defekte Waffe geklickt wird.
  function weaponStatusBlockRoll(wname, wstatus, charName) {
    const label = FUBAR_STATUS_LABELS[wstatus] || wstatus;
    const hint = FUBAR_STATUS_HINTS[wstatus] || "";
    return `&{template:check} ` +
      `{{title=${wname} - DEFEKT}} ` +
      `{{who=${charName}}} ` +
      `{{result=${label}}} ` +
      `{{note=${hint} Angriff blockiert, Ammo nicht verbraucht.}}`;
  }

  function fireWeapon(info, modeKey) {
    const src = (info && info.sourceAttribute) || "";
    const match = /^(repeating_weapons_[^_]+)_/i.exec(src);
    if (!match) return;
    const rowPrefix = match[1];
    const cfg = WEAPON_MODES[modeKey];
    if (!cfg) return;

    const attrsNeeded = [
      `${rowPrefix}_wname`,
      `${rowPrefix}_wcaliber`,
      `${rowPrefix}_wdamage`,
      `${rowPrefix}_wattack`,
      `${rowPrefix}_wdmg_bonus`,
      `${rowPrefix}_wmisfire`,
      `${rowPrefix}_wcrit`,
      `${rowPrefix}_wammo`,
      `${rowPrefix}_wammo_max`,
      `${rowPrefix}_wrecoil`,
      `${rowPrefix}_wtarget`,
      `${rowPrefix}_wmod_muzzle_slot`,
      `${rowPrefix}_wmod_stock_slot`,
      `${rowPrefix}_wmod_underbarrel_slot`,
      `${rowPrefix}_wmod_sight_slot`,
      `${rowPrefix}_wmod_magazine_slot`,
      `${rowPrefix}_wmod_receiver_slot`,
      `${rowPrefix}_wmod_barrel_slot`,
      `${rowPrefix}_wmod_trigger_slot`,
      `${rowPrefix}_wmod_siderails_slot`,
      `${rowPrefix}_wrange_mode`,
      `${rowPrefix}_wsharpshooter`,
      `${rowPrefix}_wgroup`,
      "strength",
      "character_name",
      "train_burst_fire",
      "train_close_marksmanship",
      "train_long_marksmanship",
      "train_marksmanship",
      "train_rwt_pistols",
      "train_rwt_smg",
      "train_rwt_assault_rifles",
      "train_rwt_dmr",
      "train_rwt_bolt_action",
      "train_rwt_shotguns",
      "train_rwt_saw_mg",
      "train_rwt_launchers",
      "shaken_level",
      `${rowPrefix}_wstatus`
    ];

    getAttrs(attrsNeeded, (v) => {
      const wname = v[`${rowPrefix}_wname`] || "Weapon";
      const wcaliber = v[`${rowPrefix}_wcaliber`] || "";
      const wdamage = v[`${rowPrefix}_wdamage`] || "1d4";
      const wattack = parseInt(v[`${rowPrefix}_wattack`]) || 0;
      const wdmg_bonus = parseInt(v[`${rowPrefix}_wdmg_bonus`]) || 0;
      const wmisfire = v[`${rowPrefix}_wmisfire`] || "1";
      const wcrit = v[`${rowPrefix}_wcrit`] || "20";
      const wammo = parseInt(v[`${rowPrefix}_wammo`]) || 0;
      const wammo_max = parseInt(v[`${rowPrefix}_wammo_max`]) || 0;
      const wrecoil = parseInt(v[`${rowPrefix}_wrecoil`]) || 0;
      const strength = parseInt(v.strength) || 10;
      const charName = v.character_name || "Operator";
      const wstatus = v[`${rowPrefix}_wstatus`] || "ok";

      // Status-Block: defekte Waffe feuert nicht.
      if (wstatus !== "ok") {
        startRoll(
          weaponStatusBlockRoll(wname, wstatus, charName),
          (r) => finishRoll(r.rollId)
        );
        return;
      }
      const trainBurstFire = parseInt(v.train_burst_fire) || 0;
      const trainCloseMarks = parseInt(v.train_close_marksmanship) || 0;
      const trainLongMarks = parseInt(v.train_long_marksmanship) || 0;
      const trainMarks = parseInt(v.train_marksmanship) || 0;
      const shakenLevel = parseInt(v.shaken_level) || 0;
      const rangeMode = v[`${rowPrefix}_wrange_mode`] || "normal";
      const sharpshooterOn = parseInt(v[`${rowPrefix}_wsharpshooter`]) === 1;
      const wgroup = v[`${rowPrefix}_wgroup`] || "";
      const rwtLevel = wgroup ? (parseInt(v[`train_rwt_${wgroup}`]) || 0) : 0;
      const rwtB = rwtBonus(rwtLevel);

      // CQM/LRM-Boni abhaengig von Range-Mode. Skalen: L1 +1atk, L2 +1dmg,
      // L3 +2atk, L4 +2dmg (jeweils kumulativ: L4 = +2atk +2dmg).
      function marksBonus(level) {
        return {
          atk: (level >= 3) ? 2 : (level >= 1 ? 1 : 0),
          dmg: (level >= 4) ? 2 : (level >= 2 ? 1 : 0),
        };
      }
      let cqmBonus = { atk: 0, dmg: 0 };
      let lrmBonus = { atk: 0, dmg: 0 };
      if (rangeMode === "close") cqmBonus = marksBonus(trainCloseMarks);
      if (rangeMode === "long")  lrmBonus = marksBonus(trainLongMarks);

      // Sharpshooter (Marksmanship L3): -5 Atk / +10 Dmg, nur aktiv wenn
      // Marksmanship-Level >= 3 UND User-Toggle an.
      const sharpshooterActive = sharpshooterOn && trainMarks >= 3;

      // ---- Mod-Slot-Dropdowns auslesen ----
      const mMuzzle     = v[`${rowPrefix}_wmod_muzzle_slot`]     || "none";
      const mStock      = v[`${rowPrefix}_wmod_stock_slot`]      || "none";
      const mUnderbarrel= v[`${rowPrefix}_wmod_underbarrel_slot`]|| "none";
      const mSight      = v[`${rowPrefix}_wmod_sight_slot`]      || "none";
      const mMagazine   = v[`${rowPrefix}_wmod_magazine_slot`]   || "standard";
      const mReceiver   = v[`${rowPrefix}_wmod_receiver_slot`]   || "none";
      const mBarrel     = v[`${rowPrefix}_wmod_barrel_slot`]     || "none";
      const mTrigger    = v[`${rowPrefix}_wmod_trigger_slot`]    || "none";
      const mSiderails  = v[`${rowPrefix}_wmod_siderails_slot`]  || "none";

      // ---- Effekte aus Slots ableiten ----
      const isSingle = (modeKey === "wsingle" || modeKey === "waimed");
      const isAuto   = (cfg.usePen === "auto");

      // Recoil-Reduktion: Buffer Group -4
      const bufferReduction = (mStock === "buffer") ? 4 : 0;
      const effRecoil = Math.max(0, wrecoil - bufferReduction);
      const recoilDiff = effRecoil - strength;
      const recoilPenSingle = recoilDiff > 0 ? 1 : 0;
      const recoilPenAuto   = recoilDiff > 0 ? recoilDiff : 0;

      // Damage-Bonus: Muzzle Break, Adv. Stock, Custom Receiver (alle +2, stacken)
      let effDmgBonus = wdmg_bonus;
      if (mMuzzle === "muzzle_break") effDmgBonus += 2;
      if (mStock === "adv")           effDmgBonus += 2;
      if (mReceiver === "custom")     effDmgBonus += 2;
      // Marksmanship-Trainings: CQM bei Close, LRM bei Long, Sharpshooter opt-in
      effDmgBonus += cqmBonus.dmg + lrmBonus.dmg;
      if (sharpshooterActive) effDmgBonus += 10;
      // Ranged Weapon Training: +1/+2 Dmg ab L3/L5 je nach Gruppe
      effDmgBonus += rwtB.dmg;

      // Suppressor: -1d4 Damage
      const hasSuppressor = (mMuzzle === "suppressor");

      // Attack-Bonus: Sight/Laser/Dot-Varianten + Fore Grip/Pod Grip (nur Single)
      let effAttack = wattack;
      // Sights mit Dot-Bonus (Dot, 4x Hybrid, 6x Hybrid) geben +1 within range
      if (mSight === "dot" || mSight === "scope_4x_hyb" || mSight === "scope_6x_hyb") effAttack += 1;
      // Laser / PEQ 16 auch +1 within range
      if (mSiderails === "laser" || mSiderails === "peq16") effAttack += 1;
      // Fore Grip / Pod Grip: +1 auf Single
      if (isSingle && (mUnderbarrel === "fore_grip" || mUnderbarrel === "pod_grip")) effAttack += 1;
      // Marksmanship-Trainings: Atk-Bonus abhaengig von Range-Mode
      effAttack += cqmBonus.atk + lrmBonus.atk;
      if (sharpshooterActive) effAttack -= 5;
      // Ranged Weapon Training: +1/+2 Atk ab L2/L4 je nach Gruppe
      effAttack += rwtB.atk;

      // Burst/Auto-Pen-Reduction: Compensator, Auto Stock, Angled Short Grip (alle -1, stacken)
      let compReduction = 0;
      if (isAuto) {
        if (mMuzzle === "compensator")         compReduction += 1;
        if (mStock === "auto")                 compReduction += 1;
        if (mUnderbarrel === "angled_short")   compReduction += 1;
      }

      // Crit-Range: Precision Barrel +1
      let effCritStr = wcrit;
      if (mBarrel === "precision") {
        const r = parseRange(wcrit);
        if (r) {
          const newMin = Math.max(1, r.min - 1);
          effCritStr = (newMin === r.max) ? `${newMin}` : `${newMin}-${r.max}`;
        }
      }

      // Scope / Barrel: Range-Multiple-Änderungen. Nur als Info im Chat,
      // keine Auto-Berechnung (Sheet kennt Target-Distanz nicht).
      const rangeMultMods = [];
      if (mSight === "scope_4x" || mSight === "scope_4x_hyb") rangeMultMods.push("Scope: Range-Mult -1");
      if (mSight === "scope_6x" || mSight === "scope_6x_hyb") rangeMultMods.push("Scope: R-M -1, +2 fern, -2/-4 nah");
      if (mSight === "scope_8x")                              rangeMultMods.push("Scope: R-M -2, +4 fern, -4/-8 nah");
      if (mBarrel === "short") rangeMultMods.push("Short Barrel: +1 bei 1× R-M, Range-1/4");
      if (mBarrel === "long")  rangeMultMods.push("Long Barrel: -1 jenseits 1× R-M, Range+1/4");

      const zoneKey = v[`${rowPrefix}_wtarget`] || "torso";
      const zone = TARGET_ZONES[zoneKey] || TARGET_ZONES.torso;

      // Bail out wenn leeres Magazin - Chat-Hinweis statt leerer Klick.
      if (wammo <= 0) {
        startRoll(
          `&{template:check} {{title=${wname} - leer!}} {{who=${charName}}} {{result=Keine Munition - nachladen nötig}}`,
          (results) => finishRoll(results.rollId)
        );
        return;
      }

      // Ammo-Verbrauch vorab bestimmen, damit wir vorher/nachher im
      // Chat anzeigen können und der 1d4+2-Roll für Auto nur EINMAL
      // geworfen wird (sonst Wert im Chat != Wert für Dekrement).
      let ammoUsed;
      if (cfg.ammo === "1d4+2") {
        ammoUsed = Math.floor(Math.random() * 4) + 3;
      } else {
        ammoUsed = cfg.ammo;
      }
      const ammoAfter = Math.max(0, wammo - ammoUsed);

      // d20 und d100 hier in JS würfeln damit wir die 3-stufige
      // Misfire-Logik (d20-Range + d100-FUBAR-Tabelle) upfront
      // auswerten und den richtigen Status-Key ins Template packen
      // können. Kostet proper Roll20-Tooltip ("1d20 + 5") auf
      // Attack, aber Tooltip zeigt "Rolling X + Y = Z" was reicht.
      // Shaken 5 (Broken): Disadvantage auf alle Attacks -> 2d20 kl1.
      const shakenDisadv = shakenLevel >= 5;
      const d20a = Math.floor(Math.random() * 20) + 1;
      const d20b = Math.floor(Math.random() * 20) + 1;
      const d20 = shakenDisadv ? Math.min(d20a, d20b) : d20a;
      const d100 = Math.floor(Math.random() * 100) + 1;

      // Recoil-Pen mit Mod-Effekten: Compensator reduziert die Auto-Penalty
      const rawPenalty = (cfg.usePen === "single" ? recoilPenSingle : recoilPenAuto);
      // Burst Fire Training zieht im wburst-Modus zusaetzlich Level vom Penalty ab
      // (L1: -1, L2: -2, ... L5: -5 = komplette Burst-Penalty neutralisiert).
      const burstFireReduction = (modeKey === "wburst") ? trainBurstFire : 0;
      const penalty = Math.max(0, rawPenalty - compReduction - burstFireReduction);
      const aimBonus = cfg.aimBonus || 0;
      const totalModifier = effAttack + aimBonus - penalty - zone.pen;
      const misfireRange = parseRange(wmisfire);
      const critRange = parseRange(effCritStr);

      const didTrigger = misfireRange
        ? (d20 >= misfireRange.min && d20 <= misfireRange.max)
        : false;
      const didCrit = critRange
        ? (d20 >= critRange.min && d20 <= critRange.max)
        : false;

      // 3-stufiger Misfire-Status:
      //   misfire_no   : d20 nicht im Range -> Nein
      //   misfire_miss : d20 im Range + d100 61-100 -> Miss, Waffe OK
      //   misfire_yes  : d20 im Range + d100 1-60 -> Waffe beschädigt
      let misfireKey;
      if (!didTrigger) misfireKey = "misfire_no";
      else if (d100 >= 61) misfireKey = "misfire_miss";
      else misfireKey = "misfire_yes";

      // Bei misfire_yes: d100 gegen FUBAR-Tabelle mappen -> neuer wstatus.
      // 1: destroyed | 2-5: needs_repair | 6-10: broken_long | 11-15: broken_short | 16-60: jammed
      const newWeaponStatus = (misfireKey === "misfire_yes")
        ? fubarStatusForD100(d100)
        : null;

      const critKey = didCrit ? "crit_yes" : "crit_no";

      // Head-Shot-Regel: jeder Hit zählt als Crit = 2x Dice.
      // Nat 20 auf Kopfschuss = 3x Dice. Wir multiplizieren die
      // Dice-Counts in der Damage-Formel entsprechend.
      let damageDice = wdamage;
      let critNote = "";
      if (zoneKey === "head") {
        if (d20 === 20) {
          damageDice = multiplyDiceCount(wdamage, 3);
          critNote = `Kopfschuss + Nat 20: 3x Damage Dice (${wdamage} -> ${damageDice})`;
        } else {
          damageDice = multiplyDiceCount(wdamage, 2);
          critNote = `Kopfschuss bei Hit = Crit: 2x Damage Dice (${wdamage} -> ${damageDice})`;
        }
      } else if (didCrit) {
        // Normaler Crit (d20 in Crit-Range): 2x Dice per 5e-Regel
        damageDice = multiplyDiceCount(wdamage, 2);
        critNote = `Crit: 2x Damage Dice (${wdamage} -> ${damageDice})`;
      }

      // Damage: Mods +2 (Muzzle Break + Adv. Stock + Custom Rcvr), Suppressor -1d4
      const baseDmgFormula = `${damageDice} + ${effDmgBonus}`;
      const damageFormula = hasSuppressor ? `${baseDmgFormula} - 1d4` : baseDmgFormula;

      const ammoDisplay = `${wammo} &rarr; ${ammoAfter} / ${wammo_max}`;
      const misfireLabel = `Misfire (${wmisfire})`;
      const critLabel = `Crit (${effCritStr})`;

      // Mod-Notiz: welche aktiven Slots relevant für diesen Roll sind
      const modNotes = [];
      if (hasSuppressor)                      modNotes.push("Suppressor (-1d4 Dmg, silent)");
      if (mMuzzle === "muzzle_break")         modNotes.push("Muzzle Break (+2)");
      if (mMuzzle === "flash_hider")          modNotes.push("Flash Hider (Perception-Disadv)");
      if (mStock === "adv")                   modNotes.push("Adv. Stock (+2)");
      if (mStock === "buffer")                modNotes.push(`Buffer Group (Recoil ${wrecoil}->${effRecoil})`);
      if (mStock === "auto" && isAuto)        modNotes.push("Auto Stock (-1 Auto-Pen)");
      if (mStock === "quick")                 modNotes.push("Quick Stock (+2 Init beim Halten)");
      if (mMuzzle === "compensator" && isAuto) modNotes.push("Compensator (-1 Auto-Pen)");
      if (isSingle && mUnderbarrel === "fore_grip") modNotes.push("Fore Grip (+1 Atk)");
      if (isSingle && mUnderbarrel === "pod_grip")  modNotes.push("Pod Grip (+1 Atk, Prone-Bonus)");
      if (mUnderbarrel === "bipods")          modNotes.push("Bipods (Prone/Braced: R-M -1, Recoil -2)");
      if (mUnderbarrel === "angled_fore")     modNotes.push("Angled Fore Grip (+2 Init)");
      if (mUnderbarrel === "angled_short" && isAuto) modNotes.push("Angled Short Grip (-1 Auto-Pen)");
      if (mSight === "dot")                   modNotes.push("Dot/Holo (+1 Atk in Range)");
      if (mSight === "scope_4x_hyb" || mSight === "scope_6x_hyb") modNotes.push("Scope Hybrid (+1 Atk in Range)");
      if (mSiderails === "laser" || mSiderails === "peq16") modNotes.push("Laser Sight (+1 Atk in Range)");
      if (mBarrel === "precision")            modNotes.push(`Precision Barrel (Crit ${wcrit}->${effCritStr})`);
      if (mReceiver === "enhanced")           modNotes.push("Enhanced Rcvr (Dependable)");
      if (mReceiver === "custom")             modNotes.push("Custom Receiver (+2)");
      if (mMagazine === "extended")           modNotes.push("Extended Mag");
      if (mMagazine === "drum")               modNotes.push("Drum Mag");
      if (mMagazine === "quick")              modNotes.push("Quick Mag (Free-Action Reload)");
      if (mTrigger === "comfort")             modNotes.push("Comfort Grip (+2 Init)");
      if (mTrigger === "no_slip")             modNotes.push("No Slip Grip (Adv vs Disarm)");
      if (burstFireReduction > 0)             modNotes.push(`Burst Fire Training L${trainBurstFire} (-${burstFireReduction} Pen)`);
      if (rangeMode === "close" && (cqmBonus.atk || cqmBonus.dmg)) modNotes.push(`Close Marksmanship L${trainCloseMarks} (+${cqmBonus.atk} Atk / +${cqmBonus.dmg} Dmg)`);
      if (rangeMode === "long" && (lrmBonus.atk || lrmBonus.dmg))  modNotes.push(`Long Marksmanship L${trainLongMarks} (+${lrmBonus.atk} Atk / +${lrmBonus.dmg} Dmg)`);
      if (rangeMode === "long" && trainMarks >= 1) modNotes.push(`Marksmanship L1 (Range-Multiplier -1)`);
      if (sharpshooterActive)                 modNotes.push(`Sharpshooter (-5 Atk / +10 Dmg)`);
      if (wgroup && rwtLevel > 0)             modNotes.push(`RWT ${WEAPON_GROUP_LABELS[wgroup] || wgroup} L${rwtLevel} (+${rwtB.atk} Atk / +${rwtB.dmg} Dmg)`);
      if (shakenDisadv)                       modNotes.push(`Shaken 5/Broken (Disadv: ${d20a}/${d20b} -> ${d20})`);
      if (newWeaponStatus)                    modNotes.push(`FUBAR d100 ${d100} -> Waffe jetzt: ${FUBAR_STATUS_LABELS[newWeaponStatus] || newWeaponStatus}`);
      for (const rm of rangeMultMods)         modNotes.push(rm);
      const modsInfo = modNotes.length ? ` Mods: ${modNotes.join(", ")}.` : "";

      let rollText = `&{template:attack} ` +
        `{{title=${wname}}} ` +
        (wcaliber ? `{{caliber=${wcaliber}}} ` : "") +
        `{{mode=${cfg.mode}}} ` +
        `{{attack=[[${d20} + ${totalModifier}]]}} ` +
        `{{misfire_label=${misfireLabel}}} ` +
        `{{crit_label=${critLabel}}} ` +
        `{{${misfireKey}=1}} ` +
        `{{${critKey}=1}} ` +
        `{{damage=[[${damageFormula}]]}} ` +
        (modeKey === "wauto" ? `{{burst_size=${ammoUsed}}} ` : "") +
        `{{recoil_pen=-${penalty}}} ` +
        (zoneKey !== "torso" ? `{{zone=${zone.label} (-${zone.pen})}} {{zone_effect=${zone.effect}}} ` : "") +
        (misfireKey === "misfire_yes" ? `{{misfire_d100=[[${d100}]]}} ` : "") +
        `{{ammo=${ammoDisplay}}} ` +
        ((critNote || modsInfo) ? `{{note=${critNote}${modsInfo}}} ` : "") +
        `{{who=${charName}}}`;

      startRoll(rollText, (results) => {
        const setUpd = { [`${rowPrefix}_wammo`]: ammoAfter };
        if (newWeaponStatus) applyWeaponStatus(rowPrefix, newWeaponStatus, setUpd);
        setAttrs(setUpd);
        finishRoll(results.rollId);
      });
    });
  }

  on("clicked:repeating_weapons:wsingle", (info) => fireWeapon(info, "wsingle"));
  on("clicked:repeating_weapons:wburst",  (info) => fireWeapon(info, "wburst"));
  on("clicked:repeating_weapons:wauto",   (info) => fireWeapon(info, "wauto"));
  on("clicked:repeating_weapons:waimed",  (info) => fireWeapon(info, "waimed"));

  // ---- CQB Melee-Angriff mit Ranged-Waffe ----
  // Nutzt CQB-Training-Level fuer Damage-Die. 1H/2H aus Property-Flags.
  // Attack = 1d20 + wattack + strength_mod, keine Misfire/Ammo/Recoil-Logik.
  function cqbMelee(info) {
    const src = (info && info.sourceAttribute) || "";
    const match = /^(repeating_weapons_[^_]+)_/i.exec(src);
    if (!match) return;
    const rowPrefix = match[1];

    getAttrs([
      `${rowPrefix}_wname`,
      `${rowPrefix}_wattack`,
      `${rowPrefix}_wdmg_bonus`,
      `${rowPrefix}_wprop_1h`,
      `${rowPrefix}_wprop_2h`,
      `${rowPrefix}_wstatus`,
      "strength_mod",
      "character_name",
      "train_cqb",
      "train_melee",
      "shaken_level",
    ], (v) => {
      const wname = v[`${rowPrefix}_wname`] || "Weapon";
      const wstatus = v[`${rowPrefix}_wstatus`] || "ok";
      const charName = v.character_name || "Operator";
      if (wstatus !== "ok") {
        startRoll(
          weaponStatusBlockRoll(wname, wstatus, charName),
          (r) => finishRoll(r.rollId)
        );
        return;
      }
      const wattack = parseInt(v[`${rowPrefix}_wattack`]) || 0;
      const wdmg_bonus = parseInt(v[`${rowPrefix}_wdmg_bonus`]) || 0;
      const is1H = parseInt(v[`${rowPrefix}_wprop_1h`]) === 1;
      const is2H = parseInt(v[`${rowPrefix}_wprop_2h`]) === 1;
      const strMod = parseInt(v.strength_mod) || 0;
      const trainCqb = Math.max(0, Math.min(4, parseInt(v.train_cqb) || 0));
      const trainMelee = Math.max(0, Math.min(5, parseInt(v.train_melee) || 0));
      const meleeB = rwtBonus(trainMelee);
      const shakenLevel = parseInt(v.shaken_level) || 0;
      const shakenDisadv = shakenLevel >= 5;

      // Damage-Die Tabelle (Blunt):
      //   L0:       1H=1d4, 2H=1d4 (default, nicht proficient)
      //   L1 / L2:  1H=1d4, 2H=1d6
      //   L3 / L4:  1H=1d6, 2H=1d8
      // Bei unklarem 1H/2H (beides oder keins) defaulten wir auf 2H-Werte.
      let dieStr = "1d4";
      if (trainCqb >= 3)      dieStr = is1H && !is2H ? "1d6" : "1d8";
      else if (trainCqb >= 1) dieStr = is1H && !is2H ? "1d4" : "1d6";
      else                    dieStr = "1d4";

      const proficient = trainCqb >= 1;
      const d20a = Math.floor(Math.random() * 20) + 1;
      const d20b = Math.floor(Math.random() * 20) + 1;
      const d20 = shakenDisadv ? Math.min(d20a, d20b) : d20a;
      const effAtkBonus = wattack + strMod + meleeB.atk;
      const effDmgBonus = wdmg_bonus + strMod + meleeB.dmg;
      const damageFormula = `${dieStr} + ${effDmgBonus}`;

      const modeLabel = (is1H && !is2H) ? "CQB Melee (1H)"
                      : (is2H && !is1H) ? "CQB Melee (2H)"
                      : "CQB Melee";
      let note = `CQB L${trainCqb}: ${dieStr} Blunt + STR-Mod ${strMod >= 0 ? "+" : ""}${strMod}.`;
      if (!proficient) note += ` NICHT proficient (L0) - ggf. Disadvantage / GM.`;
      if (trainCqb >= 2) note += ` L2: auch als Bonus-Action moeglich.`;
      if (trainCqb >= 4) note += ` L4: 2 Angriffe als Bonus-Action.`;
      if (trainMelee > 0) note += ` Melee Training L${trainMelee}: +${meleeB.atk} Atk / +${meleeB.dmg} Dmg.`;
      if (shakenDisadv)  note += ` Shaken 5/Broken (Disadv: ${d20a}/${d20b} -> ${d20}).`;

      const rollText = `&{template:attack} ` +
        `{{title=${wname}}} ` +
        `{{mode=${modeLabel}}} ` +
        `{{attack=[[${d20} + ${effAtkBonus}]]}} ` +
        `{{damage=[[${damageFormula}]]}} ` +
        `{{who=${charName}}} ` +
        `{{note=${note}}}`;

      startRoll(rollText, (r) => finishRoll(r.rollId));
    });
  }

  on("clicked:repeating_weapons:wmelee", (info) => cqbMelee(info));

  // ---- Weapon Repair (Clear Jam / Field / Bench / Mark Repaired) ----
  // DC-Check mit 1d20 + DEX-Mod. Pass: Status -> ok. Fail: bleibt.
  const REPAIR_CFG = {
    clear_jam:     { label: "Clear Jam",      dc: 10, requiredStatus: "jammed",        actionCost: "Action" },
    field_repair:  { label: "Field Repair",   dc: 10, requiredStatus: "broken_short",  actionCost: "nach Short Rest" },
    bench_repair:  { label: "Bench Repair",   dc: 15, requiredStatus: "broken_long",   actionCost: "nach Long Rest" },
  };

  function weaponRepairRoll(info, kind) {
    const src = (info && info.sourceAttribute) || "";
    const match = /^(repeating_weapons_[^_]+)_/i.exec(src);
    if (!match) return;
    const rowPrefix = match[1];
    const cfg = REPAIR_CFG[kind];
    if (!cfg) return;
    getAttrs(
      [`${rowPrefix}_wname`, `${rowPrefix}_wstatus`, "dexterity_mod", "character_name"],
      (v) => {
        const wname = v[`${rowPrefix}_wname`] || "Weapon";
        const status = v[`${rowPrefix}_wstatus`] || "ok";
        const dexMod = parseInt(v.dexterity_mod) || 0;
        const charName = v.character_name || "Operator";
        if (status !== cfg.requiredStatus) {
          startRoll(
            `&{template:check} {{title=${wname} - ${cfg.label}}} {{who=${charName}}} ` +
            `{{result=Nicht anwendbar}} {{note=Aktueller Status: ${FUBAR_STATUS_LABELS[status] || status}. ${cfg.label} nur bei Status "${FUBAR_STATUS_LABELS[cfg.requiredStatus]}" verfuegbar.}}`,
            (r) => finishRoll(r.rollId)
          );
          return;
        }
        const d20 = Math.floor(Math.random() * 20) + 1;
        const total = d20 + dexMod;
        const passed = total >= cfg.dc;
        if (passed) setAttrs(applyWeaponStatus(rowPrefix, "ok"));
        const note = passed
          ? `Bestanden! Waffe wieder einsatzbereit.`
          : `FAIL (${total} < ${cfg.dc}). Status bleibt ${FUBAR_STATUS_LABELS[status]}, erneut versuchen (${cfg.actionCost}).`;
        startRoll(
          `&{template:check} {{title=${wname} - ${cfg.label} (DC ${cfg.dc})}} {{who=${charName}}} ` +
          `{{result=[[${d20} + ${dexMod}]] vs DC ${cfg.dc}}} ` +
          `{{note=${note}}}`,
          (r) => finishRoll(r.rollId)
        );
      }
    );
  }

  on("clicked:repeating_weapons:wclearjam",    (info) => weaponRepairRoll(info, "clear_jam"));
  on("clicked:repeating_weapons:wfieldrepair", (info) => weaponRepairRoll(info, "field_repair"));
  on("clicked:repeating_weapons:wbenchrepair", (info) => weaponRepairRoll(info, "bench_repair"));

  // Mark Repaired: narrative DM-Entscheidung, kein Wurf, setzt Status auf ok.
  on("clicked:repeating_weapons:wmarkrepaired", (info) => {
    const src = (info && info.sourceAttribute) || "";
    const match = /^(repeating_weapons_[^_]+)_/i.exec(src);
    if (!match) return;
    const rowPrefix = match[1];
    getAttrs(
      [`${rowPrefix}_wname`, `${rowPrefix}_wstatus`, "character_name"],
      (v) => {
        const wname = v[`${rowPrefix}_wname`] || "Weapon";
        const status = v[`${rowPrefix}_wstatus`] || "ok";
        const charName = v.character_name || "Operator";
        if (status !== "needs_repair") {
          startRoll(
            `&{template:check} {{title=${wname} - Mark Repaired}} {{who=${charName}}} ` +
            `{{result=Nicht anwendbar}} {{note=Aktueller Status: ${FUBAR_STATUS_LABELS[status] || status}. Mark Repaired nur bei Needs Repair.}}`,
            (r) => finishRoll(r.rollId)
          );
          return;
        }
        setAttrs(applyWeaponStatus(rowPrefix, "ok"));
        startRoll(
          `&{template:check} {{title=${wname} - Mark as Repaired}} {{who=${charName}}} ` +
          `{{result=Narrative Repair abgeschlossen}} ` +
          `{{note=Parts + 1 Tag Arbeit + DC 15 Check (DM-Zustimmung). Status auf OK gesetzt.}}`,
          (r) => finishRoll(r.rollId)
        );
      }
    );
  });

  // ---- Spray / Riddle (Multi-Target Full-Auto) ----
  // Spray: N Ziele, je -5 kumulativ, 1d4+2 Runden pro Target
  // Riddle: N Volleys auf EIN Ziel, sonst gleich
  function sprayRiddle(info, mode) {
    const src = (info && info.sourceAttribute) || "";
    const match = /^(repeating_weapons_[^_]+)_/i.exec(src);
    if (!match) return;
    const rowPrefix = match[1];

    const attrsNeeded = [
      `${rowPrefix}_wname`,
      `${rowPrefix}_wdamage`,
      `${rowPrefix}_wattack`,
      `${rowPrefix}_wdmg_bonus`,
      `${rowPrefix}_wammo`,
      `${rowPrefix}_wammo_max`,
      `${rowPrefix}_wtargets`,
      `${rowPrefix}_wrecoil`,
      `${rowPrefix}_wtarget`,
      `${rowPrefix}_wmod_muzzle_slot`,
      `${rowPrefix}_wmod_stock_slot`,
      `${rowPrefix}_wmod_underbarrel_slot`,
      `${rowPrefix}_wmod_sight_slot`,
      `${rowPrefix}_wmod_receiver_slot`,
      `${rowPrefix}_wmod_siderails_slot`,
      `${rowPrefix}_wgroup`,
      "strength",
      "character_name",
      "dexterity_mod",
      "train_auto_weapons",
      "train_rwt_pistols",
      "train_rwt_smg",
      "train_rwt_assault_rifles",
      "train_rwt_dmr",
      "train_rwt_bolt_action",
      "train_rwt_shotguns",
      "train_rwt_saw_mg",
      "train_rwt_launchers",
      "shaken_level",
      `${rowPrefix}_wstatus`,
    ];

    getAttrs(attrsNeeded, (v) => {
      const wname = v[`${rowPrefix}_wname`] || "Weapon";
      const wstatus = v[`${rowPrefix}_wstatus`] || "ok";
      const charNameEarly = v.character_name || "Operator";
      if (wstatus !== "ok") {
        startRoll(
          weaponStatusBlockRoll(wname, wstatus, charNameEarly),
          (r) => finishRoll(r.rollId)
        );
        return;
      }
      const wdamage = v[`${rowPrefix}_wdamage`] || "1d4";
      const wattack = parseInt(v[`${rowPrefix}_wattack`]) || 0;
      const wdmg_bonus = parseInt(v[`${rowPrefix}_wdmg_bonus`]) || 0;
      const wammo = parseInt(v[`${rowPrefix}_wammo`]) || 0;
      const wammo_max = parseInt(v[`${rowPrefix}_wammo_max`]) || 0;
      const wrecoil = parseInt(v[`${rowPrefix}_wrecoil`]) || 0;
      const strength = parseInt(v.strength) || 10;
      const requested = Math.max(1, Math.min(5, parseInt(v[`${rowPrefix}_wtargets`]) || 1));
      const dexMod = Math.max(1, parseInt(v.dexterity_mod) || 0);
      const zoneKey = v[`${rowPrefix}_wtarget`] || "torso";
      const zone = TARGET_ZONES[zoneKey] || TARGET_ZONES.torso;
      const charName = v.character_name || "Operator";
      const trainAutoWeapons = Math.max(0, Math.min(5, parseInt(v.train_auto_weapons) || 0));
      const shakenLevel = parseInt(v.shaken_level) || 0;
      const shakenDisadv = shakenLevel >= 5;
      const wgroup = v[`${rowPrefix}_wgroup`] || "";
      const rwtLevel = wgroup ? (parseInt(v[`train_rwt_${wgroup}`]) || 0) : 0;
      const rwtB = rwtBonus(rwtLevel);
      // Automatic Weapons Training: Per-Target-Penalty L1/2 -> 4, L3/4 -> 3, L5 -> 2.
      const autoTargetPen = Math.max(2, 5 - Math.floor((trainAutoWeapons + 1) / 2));
      // Lvl 2+ erlaubt DEX+1 Max Targets, Lvl 4+ gibt +1 Damage Die.
      const autoMaxBonus = (trainAutoWeapons >= 2) ? 1 : 0;
      const autoExtraDie = (trainAutoWeapons >= 4) ? 1 : 0;

      // Mods lesen (Slot-basiert). Spray/Riddle ist immer Auto-Fire.
      const mMuzzle     = v[`${rowPrefix}_wmod_muzzle_slot`]     || "none";
      const mStock      = v[`${rowPrefix}_wmod_stock_slot`]      || "none";
      const mUnderbarrel= v[`${rowPrefix}_wmod_underbarrel_slot`]|| "none";
      const mSight      = v[`${rowPrefix}_wmod_sight_slot`]      || "none";
      const mReceiver   = v[`${rowPrefix}_wmod_receiver_slot`]   || "none";
      const mSiderails  = v[`${rowPrefix}_wmod_siderails_slot`]  || "none";

      const effRecoil = Math.max(0, wrecoil - (mStock === "buffer" ? 4 : 0));
      const recoilDiff = effRecoil - strength;
      const rawPenalty = recoilDiff > 0 ? recoilDiff : 0;
      // Auto-Pen-Reduktion: Compensator + Auto Stock + Angled Short Grip stacken
      let autoReduction = 0;
      if (mMuzzle === "compensator")       autoReduction += 1;
      if (mStock === "auto")               autoReduction += 1;
      if (mUnderbarrel === "angled_short") autoReduction += 1;
      const penalty = Math.max(0, rawPenalty - autoReduction);

      // Damage: Muzzle Break + Adv. Stock + Custom Receiver (alle +2, stackbar)
      let effDmgBonus = wdmg_bonus;
      if (mMuzzle === "muzzle_break")  effDmgBonus += 2;
      if (mStock === "adv")            effDmgBonus += 2;
      if (mReceiver === "custom")      effDmgBonus += 2;
      // Ranged Weapon Training: +1/+2 Dmg ab L3/L5
      effDmgBonus += rwtB.dmg;
      const hasSuppressor = (mMuzzle === "suppressor");

      // Attack-Bonus: Dot/Hybrid-Sights + Laser-Rails (Spray/Riddle ist nicht Single, also kein Fore-Grip-Bonus)
      let effAttack = wattack;
      if (mSight === "dot" || mSight === "scope_4x_hyb" || mSight === "scope_6x_hyb") effAttack += 1;
      if (mSiderails === "laser" || mSiderails === "peq16") effAttack += 1;
      // Ranged Weapon Training: +1/+2 Atk ab L2/L4
      effAttack += rwtB.atk;

      if (wammo <= 0) {
        startRoll(
          `&{template:check} {{title=${wname} - leer!}} {{who=${charName}}} {{result=Keine Munition}}`,
          (r) => finishRoll(r.rollId)
        );
        return;
      }

      // Ziele begrenzt durch DEX-Mod. Automatic Weapons Training L2+ erlaubt +1.
      const maxTargets = dexMod + autoMaxBonus;
      const targets = Math.min(requested, maxTargets);

      // Ammo-Verbrauch: 1d4+2 pro Target, einmal gewürfelt
      let totalAmmo = 0;
      for (let i = 0; i < targets; i++) {
        totalAmmo += Math.floor(Math.random() * 4) + 3;
      }
      const ammoUsed = Math.min(totalAmmo, wammo);
      const ammoAfter = Math.max(0, wammo - ammoUsed);

      const modeLabel = mode === "spray"
        ? `Spray (${targets} Ziele)`
        : `Riddle (${targets} Volleys auf 1 Ziel)`;
      const ammoDisplay = `${wammo} &rarr; ${ammoAfter} / ${wammo_max} (-${ammoUsed})`;

      let noteText = `Max Ziele = DEX-Mod ${dexMod}${autoMaxBonus ? ` + ${autoMaxBonus} (Auto-Weapons L${trainAutoWeapons})` : ""}.`;
      if (requested > maxTargets) {
        noteText += ` Angefragt ${requested}, limitiert auf ${targets}.`;
      }
      if (totalAmmo > wammo) {
        noteText += ` Munition reichte nicht für alle Volleys voll, aber Attacks laufen trotzdem durch.`;
      }
      if (trainAutoWeapons > 0) {
        noteText += ` Auto-Weapons L${trainAutoWeapons}: -${autoTargetPen}/Ziel${autoExtraDie ? `, +${autoExtraDie} Damage Die` : ""}.`;
      }
      if (wgroup && rwtLevel > 0) {
        noteText += ` RWT ${WEAPON_GROUP_LABELS[wgroup] || wgroup} L${rwtLevel}: +${rwtB.atk} Atk / +${rwtB.dmg} Dmg.`;
      }
      if (shakenDisadv) {
        noteText += ` Shaken 5/Broken: Disadvantage auf alle Attacks (2d20kl1).`;
      }
      // Head-Shot: bei Multi-Target-Kopfschuss ist jeder Hit ein Crit,
      // also 2x Damage Dice. Nat-20-Detection pro Ziel fehlt hier (wuerde
      // extra-Loop brauchen), daher pauschal 2x bei Head.
      const headShotMultiplier = zoneKey === "head" ? 2 : 1;
      if (headShotMultiplier > 1) {
        noteText += ` Kopfschuss: alle Damage Dice x${headShotMultiplier} (2x, bei Nat 20 manuell 3x).`;
      }
      // Auto-Weapons L4+ addiert einen Damage-Die (also +1 dX wobei X = Basis-Die-Groesse).
      let dmgDice = multiplyDiceCount(wdamage, headShotMultiplier);
      if (autoExtraDie > 0) {
        const m = /^(\d+)d(\d+)(.*)$/.exec(dmgDice);
        if (m) dmgDice = `${parseInt(m[1]) + autoExtraDie}d${m[2]}${m[3]}`;
      }

      let rollText = `&{template:spray} ` +
        `{{title=${wname}}} ` +
        `{{mode=${modeLabel}}} ` +
        `{{who=${charName}}} ` +
        `{{ammo=${ammoDisplay}}} ` +
        `{{note=${noteText}}}`;

      for (let i = 0; i < targets; i++) {
        const targetPen = i * autoTargetPen;
        const atkDie = shakenDisadv ? "2d20kl1" : "1d20";
        const atkFormula = `${atkDie} + ${effAttack} - ${penalty} - ${zone.pen} - ${targetPen}`;
        const baseDmg = `${dmgDice} + ${effDmgBonus}`;
        const dmgFormula = hasSuppressor ? `${baseDmg} - 1d4` : baseDmg;
        rollText += ` {{t${i+1}_atk=[[${atkFormula}]]}}`;
        rollText += ` {{t${i+1}_dmg=[[${dmgFormula}]]}}`;
      }

      startRoll(rollText, (results) => {
        setAttrs({ [`${rowPrefix}_wammo`]: ammoAfter });
        finishRoll(results.rollId);
      });
    });
  }

  on("clicked:repeating_weapons:wspray",  (info) => sprayRiddle(info, "spray"));
  on("clicked:repeating_weapons:wriddle", (info) => sprayRiddle(info, "riddle"));

  // ---- Property-Slug-Mapping (Token -> Checkbox-Slug) ----
  // Keys matchen die Tokens aus den properties-Strings in WEAPON_PRESETS.
  // Werte sind die Slugs der statischen Pill-Checkboxes im HTML.
  // Tooltips selbst liegen als native title-Attribute am Pill-Span.
  const PROPERTY_SLUGS = {
    "1H":                   "1h",
    "2H":                   "2h",
    "Lite":                 "lite",
    "Covert":               "covert",
    "CQC":                  "cqc",
    "Reloading":            "reloading",
    "Dependable":           "dependable",
    "Takedown":             "takedown",
    "Built-in Suppressor":  "builtin_supp",
    "Integral Suppressor":  "integral_supp",
    "Accurate +1":          "acc_1",
    "Accurate +2":          "acc_2",
    "Accurate +3":          "acc_3",
    "Inaccurate -5":        "inacc_5",
    "Manual Action":        "manual_action",
    "Pump":                 "pump",
    "Semi-Auto":            "semi_auto",
    "Belt-Fed":             "belt_fed",
    "Braced":               "braced",
    "Imprecise":            "imprecise",
    "Under-Barrel":         "under_barrel",
    "Select Fire S/B":      "sf_sb",
    "Select Fire S/A":      "sf_sa",
    "Select Fire S/B/A":    "sf_sba",
    "Quirky":               "quirky",
    "Blast 10ft":           "blast_10",
    "Blast 15ft":           "blast_15",
    "Force+Piercing":       "force_pierce",
    "Force":                "force",
    "siehe Ammo-Typ für Damage": "ammo_dmg",
  };

  function buildPropPillUpdates(rowPrefix, propsString) {
    const tokens = new Set(
      (propsString || "").split(",").map((s) => s.trim()).filter(Boolean)
    );
    const upd = {};
    for (const [token, slug] of Object.entries(PROPERTY_SLUGS)) {
      upd[`${rowPrefix}_wprop_${slug}`] = tokens.has(token) ? "1" : "0";
    }
    return upd;
  }

  // ---- Weapon-Gruppen-Mapping (fuer Ranged Weapon Training Auto-Apply) ----
  // Jeder Preset-Key wird einer Trainings-Gruppe zugeordnet. Worker liest
  // wgroup beim Angriff + attr_train_rwt_<group> und addiert +Atk/+Dmg.
  const WEAPON_GROUP_MAP = {
    // Pistols
    ppk: "pistols", m1911a1: "pistols", beretta92: "pistols", glock17: "pistols",
    glock18: "pistols", p226: "pistols", usp45: "pistols", deserteagle: "pistols",
    makarov_pb: "pistols",
    // Submachine Guns
    uzi: "smg", mp5a5: "smg", mp5sd6: "smg", mp7a1: "smg", ump45: "smg", p90: "smg",
    // Assault Rifles
    m4a1: "assault_rifles", m4sopmod: "assault_rifles", m16a4: "assault_rifles",
    g36: "assault_rifles", aug: "assault_rifles", ak47: "assault_rifles",
    ak74: "assault_rifles", aks74u: "assault_rifles", fal: "assault_rifles",
    g3a3: "assault_rifles",
    // Semi-Auto / DMR
    m21: "dmr", sr25: "dmr", svd: "dmr", barrett: "dmr",
    // Bolt-Action
    rem700: "bolt_action", awm: "bolt_action", aw50: "bolt_action",
    // Shotguns
    rem870: "shotguns", benelli_m4: "shotguns", saiga12: "shotguns",
    // SAW / GPM / Heavy MG
    minimi: "saw_mg", m240: "saw_mg", pk: "saw_mg",
    // Launchers (Grenade + Rocket)
    m203: "launchers", mgl: "launchers", law: "launchers", at4: "launchers",
    at4heat: "launchers",
  };

  const WEAPON_GROUP_LABELS = {
    pistols: "Pistols",
    smg: "SMG",
    assault_rifles: "Assault Rifles",
    dmr: "DMR / Semi-Auto",
    bolt_action: "Bolt-Action",
    shotguns: "Shotguns",
    saw_mg: "SAW / MG",
    launchers: "Launchers",
  };

  // Approximate Gewichte pro Gruppe (kg) fuer Encumbrance-Berechnung.
  // Compendium hat Einzel-Waffen-Gewichte, aber fuer das Sheet reicht die
  // Gruppen-Approximation. User kann attr_wweight pro Zeile manuell ueberschreiben.
  const WEAPON_GROUP_WEIGHT = {
    pistols: 1.0,
    smg: 2.5,
    assault_rifles: 3.5,
    dmr: 4.5,
    bolt_action: 5.0,
    shotguns: 3.5,
    saw_mg: 7.5,
    launchers: 3.5,
  };

  // Ranged Weapon Training Level -> { atk, dmg } Bonus.
  //   L0: keine, L1: Proficient (kein Bonus), L2: +1 Atk,
  //   L3: +1 Dmg, L4: +1 Atk (total +2), L5: +1 Dmg (total +2).
  function rwtBonus(level) {
    return {
      atk: (level >= 4) ? 2 : (level >= 2 ? 1 : 0),
      dmg: (level >= 5) ? 2 : (level >= 3 ? 1 : 0),
      proficient: level >= 1,
    };
  }

  // ---- Weapon Presets (Auto-Fill aus Compendium) ----
  // Keys matchen die <option value="..."> im HTML-Dropdown.
  // Stats sind direkt aus modern-warfare-5e-compendium.md übernommen.
  const WEAPON_PRESETS = {
    // Pistols
    ppk:          { name: "Walther PPK",            caliber: ".380 ACP",    damage: "1d8",     range: "15 ft",  recoil: 13, misfire: "1-2", crit: "20",     ammo_max: 7,   properties: "1H, Lite, Covert, CQC, Reloading" },
    m1911a1:      { name: "Colt M1911A1",           caliber: ".45 ACP",     damage: "1d12+1",  range: "25 ft",  recoil: 11, misfire: "1",   crit: "19-20",  ammo_max: 7,   properties: "1H, Lite, CQC, Dependable, Takedown, Reloading" },
    beretta92:    { name: "Beretta 92",             caliber: "9mm P",       damage: "1d10+1",  range: "25 ft",  recoil: 12, misfire: "1-2", crit: "20",     ammo_max: 15,  properties: "1H, Lite, CQC, Reloading" },
    glock17:      { name: "Glock 17",               caliber: "9mm P",       damage: "1d10+1",  range: "25 ft",  recoil: 17, misfire: "1",   crit: "20",     ammo_max: 17,  properties: "1H, CQC, Reloading" },
    glock18:      { name: "Glock 18",               caliber: "9mm P",       damage: "1d10+1",  range: "25 ft",  recoil: 16, misfire: "1-3", crit: "20",     ammo_max: 17,  properties: "1H, CQC, Select Fire S/B/A, Reloading" },
    p226:         { name: "SiG-Sauer P226",         caliber: "9mm P",       damage: "1d10+1",  range: "25 ft",  recoil: 16, misfire: "1-2", crit: "20",     ammo_max: 15,  properties: "1H, CQC, Dependable, Reloading" },
    usp45:        { name: "H&K USP",                caliber: ".45 ACP",     damage: "1d12+1",  range: "25 ft",  recoil: 16, misfire: "1",   crit: "19-20",  ammo_max: 12,  properties: "1H, CQC, Takedown, Reloading" },
    deserteagle:  { name: "Desert Eagle",           caliber: ".50 AE",      damage: "3d6+1",   range: "40 ft",  recoil: 19, misfire: "1-3", crit: "19-20",  ammo_max: 7,   properties: "1H, CQC, Takedown, Reloading" },
    makarov_pb:   { name: "Makarov PB",             caliber: "9x18 Makarov",damage: "2d4",     range: "20 ft",  recoil: 9,  misfire: "1-2", crit: "20",     ammo_max: 8,   properties: "1H, Lite, Covert, CQC, Built-in Suppressor, Reloading" },

    // Submachine Guns
    uzi:          { name: "IMI Uzi",                caliber: "9mm P",       damage: "1d10+1",  range: "30 ft",  recoil: 4,  misfire: "1-3", crit: "20",     ammo_max: 32,  properties: "2H, CQC, Select Fire S/A, Reloading" },
    mp5a5:        { name: "H&K MP5A5",              caliber: "9mm P",       damage: "1d10+1",  range: "30 ft",  recoil: 5,  misfire: "1-2", crit: "20",     ammo_max: 30,  properties: "2H, CQC, Select Fire S/B/A, Reloading" },
    mp5sd6:       { name: "H&K MP5SD6",             caliber: "9mm P",       damage: "1d10+1",  range: "30 ft",  recoil: 5,  misfire: "1-2", crit: "20",     ammo_max: 30,  properties: "2H, CQC, Built-in Suppressor, Select Fire S/B/A, Reloading" },
    mp7a1:        { name: "H&K MP7A1",              caliber: "4.6x30mm",    damage: "2d4+1",   range: "30 ft",  recoil: 8,  misfire: "1-2", crit: "20",     ammo_max: 20,  properties: "Lite, CQC, 1H, Select Fire S/B/A, Reloading" },
    ump45:        { name: "H&K UMP",                caliber: ".45 ACP",     damage: "1d12+1",  range: "30 ft",  recoil: 9,  misfire: "1-2", crit: "20",     ammo_max: 30,  properties: "2H, CQC, Select Fire S/B/A, Takedown, Reloading" },
    p90:          { name: "FN P90",                 caliber: "5.7x28mm",    damage: "1d10",    range: "35 ft",  recoil: 5,  misfire: "1-3", crit: "20",     ammo_max: 50,  properties: "2H, CQC, Quirky, Select Fire S/B/A, Reloading" },

    // Assault Rifles
    m4a1:         { name: "Colt M4A1",              caliber: "5.56 NATO",   damage: "4d4",     range: "100 ft", recoil: 12, misfire: "1-3", crit: "20",     ammo_max: 30,  properties: "2H, Select Fire S/B/A, Reloading" },
    m4sopmod:     { name: "Colt M4 SOPMOD",         caliber: "5.56 NATO",   damage: "4d4",     range: "125 ft", recoil: 11, misfire: "1-2", crit: "19-20",  ammo_max: 30,  properties: "2H, Accurate +2, Dependable, Select Fire S/B, Reloading" },
    m16a4:        { name: "Colt M16A4",             caliber: "5.56 NATO",   damage: "4d4",     range: "125 ft", recoil: 10, misfire: "1-3", crit: "20",     ammo_max: 30,  properties: "2H, Select Fire S/B, Reloading" },
    g36:          { name: "H&K G36",                caliber: "5.56 NATO",   damage: "4d4",     range: "125 ft", recoil: 12, misfire: "1-3", crit: "20",     ammo_max: 30,  properties: "2H, Dependable, Select Fire S/B/A, Reloading" },
    aug:          { name: "Steyr AUG",              caliber: "5.56 NATO",   damage: "4d4",     range: "125 ft", recoil: 10, misfire: "1-3", crit: "20",     ammo_max: 30,  properties: "2H, Select Fire S/B/A, Reloading" },
    ak47:         { name: "RSA AK-47",              caliber: "7.62x39mm",   damage: "3d6",     range: "125 ft", recoil: 11, misfire: "1-2", crit: "20",     ammo_max: 30,  properties: "2H, Dependable, Select Fire S/A, Reloading" },
    ak74:         { name: "RSA AK-74",              caliber: "5.45x39mm",   damage: "2d8+1",   range: "125 ft", recoil: 10, misfire: "1-2", crit: "20",     ammo_max: 30,  properties: "2H, Select Fire S/A, Reloading" },
    aks74u:       { name: "RSA AKS-74U",            caliber: "5.45x39mm",   damage: "2d8+1",   range: "125 ft", recoil: 12, misfire: "1-3", crit: "20",     ammo_max: 30,  properties: "2H, Select Fire S/A, Reloading" },
    fal:          { name: "FN FAL",                 caliber: "7.62 NATO",   damage: "4d4+2",   range: "175 ft", recoil: 17, misfire: "1-3", crit: "19-20",  ammo_max: 20,  properties: "2H, Dependable, Select Fire S/A, Reloading" },
    g3a3:         { name: "H&K G3A3",               caliber: "7.62 NATO",   damage: "4d4+2",   range: "175 ft", recoil: 17, misfire: "1-2", crit: "19-20",  ammo_max: 20,  properties: "2H, Select Fire S/B/A, Reloading" },

    // Semi-Auto / DMR
    m21:          { name: "Springfield M21",        caliber: "7.62 NATO",   damage: "4d4+2",   range: "150 ft", recoil: 15, misfire: "1-2", crit: "19-20",  ammo_max: 20,  properties: "2H, Accurate +2, Reloading" },
    sr25:         { name: "KAC SR25",               caliber: "7.62 NATO",   damage: "4d4+2",   range: "200 ft", recoil: 14, misfire: "1-2", crit: "19-20",  ammo_max: 20,  properties: "2H, Accurate +2, Integral Suppressor, Reloading" },
    svd:          { name: "Dragunov SVD",           caliber: "7.62x54R",    damage: "2d10+1",  range: "200 ft", recoil: 17, misfire: "1-2", crit: "19-20",  ammo_max: 10,  properties: "2H, Accurate +1, Reloading" },
    barrett:      { name: "Barrett M82A1",          caliber: ".50 BMG",     damage: "2d12+2",  range: "350 ft", recoil: 17, misfire: "1-2", crit: "18-20",  ammo_max: 5,   properties: "2H, Accurate +1, Takedown, Reloading" },

    // Bolt-Action
    rem700:       { name: "Remington 700",          caliber: "7.62 NATO",   damage: "4d4+2",   range: "175 ft", recoil: 13, misfire: "1",   crit: "19-20",  ammo_max: 4,   properties: "2H, Manual Action, Reloading" },
    awm:          { name: "AI AWM",                 caliber: ".338 Lapua",  damage: "5d4",     range: "250 ft", recoil: 17, misfire: "1",   crit: "19-20",  ammo_max: 4,   properties: "2H, Accurate +1, Manual Action, Reloading" },
    aw50:         { name: "AI AW-50",               caliber: ".50 BMG",     damage: "2d12+2",  range: "375 ft", recoil: 19, misfire: "1",   crit: "18-20",  ammo_max: 5,   properties: "2H, Accurate +3, Takedown, Manual Action, Reloading" },

    // Shotguns
    rem870:       { name: "Remington 870 (slug)",   caliber: "12ga slug",   damage: "2d12+2",  range: "25 ft",  recoil: 17, misfire: "1",   crit: "19-20",  ammo_max: 4,   properties: "2H, Pump, Takedown, Dependable, Reloading" },
    benelli_m4:   { name: "Benelli M4 Super 90",    caliber: "12ga slug",   damage: "2d12+2",  range: "25 ft",  recoil: 16, misfire: "1",   crit: "19-20",  ammo_max: 6,   properties: "2H, Semi-Auto, Reloading" },
    saiga12:      { name: "Saiga 12K",              caliber: "12ga slug",   damage: "2d12+2",  range: "25 ft",  recoil: 16, misfire: "1",   crit: "19-20",  ammo_max: 8,   properties: "2H, Semi-Auto, Reloading" },

    // SAW / MG
    minimi:       { name: "FN Minimi (M249)",       caliber: "5.56 NATO",   damage: "4d4",     range: "175 ft", recoil: 5,  misfire: "1-3", crit: "20",     ammo_max: 200, properties: "2H, Belt-Fed, Reloading" },
    m240:         { name: "FN MAG (M240)",          caliber: "7.62 NATO",   damage: "4d4+2",   range: "275 ft", recoil: 7,  misfire: "1-2", crit: "19-20",  ammo_max: 100, properties: "2H, Braced, Dependable, Imprecise, Reloading" },
    pk:           { name: "RSA PK",                 caliber: "7.62x54R",    damage: "2d10+1",  range: "200 ft", recoil: 10, misfire: "1-3", crit: "19-20",  ammo_max: 100, properties: "2H, Braced, Dependable, Reloading" },

    // Grenade Launchers
    m203:         { name: "Colt M203",              caliber: "40mm",        damage: "",        range: "60 ft",  recoil: 8,  misfire: "1-2", crit: "20",     ammo_max: 1,   properties: "2H, Under-Barrel, Inaccurate -5, siehe Ammo-Typ für Damage" },
    mgl:          { name: "Milkor MGL Mk. 1",       caliber: "40mm",        damage: "",        range: "40 ft",  recoil: 6,  misfire: "1-3", crit: "20",     ammo_max: 6,   properties: "2H, Inaccurate -5, siehe Ammo-Typ für Damage" },

    // Rocket Launchers
    law:          { name: "Talley M72 LAW",         caliber: "Rocket",      damage: "2d10 + 2d10",  range: "75 ft", recoil: 1, misfire: "1-2", crit: "19-20",  ammo_max: 1,  properties: "2H, Inaccurate -5, Blast 10ft, Force+Piercing" },
    at4:          { name: "Bofors AT4 HE",          caliber: "Rocket",      damage: "5d10",         range: "50 ft", recoil: 1, misfire: "1-2", crit: "20",     ammo_max: 1,  properties: "2H, Inaccurate -5, Blast 15ft, Force" },
    at4heat:      { name: "Bofors AT4 HEAT",        caliber: "Rocket",      damage: "2d10 + 3d10",  range: "50 ft", recoil: 1, misfire: "1-2", crit: "20",     ammo_max: 1,  properties: "2H, Inaccurate -5, Blast 10ft, Force+Piercing" },
  };

  // ---- Personality Trait Auto-Apply + Display ----
  // Bei Trait-Wechsel: Effekte des alten Traits rueckgaengig machen,
  // dann Effekte des neuen anwenden. personality_trait_applied haelt
  // den zuletzt angewendeten Trait fuer den Rollback.
  //
  // Auto-applied: Attribute, Speed, AC, Init-Bonus.
  // NICHT auto-applied (manuell): Skill-Proficiencies (zu risky - koennte
  // Class-Profs ueberschreiben), HP pro Level (Grizzled), Save-Boni
  // (Disciplined/Resolute), Melee +1 (Fierce), Passive Perception,
  // Choice-based Attribute (Adaptable, Disciplined, Gifted).
  const TRAIT_EFFECTS = {
    adaptable:   { note: "Auto: nichts (Choice). | Manuell: +1 auf 2 Attribute deiner Wahl, Proficiency in 1 Skill." },
    agile:       { attr: { dexterity: 2, strength: -2 }, speed: 5,
                   note: "Auto: +2 DEX, -2 STR, Speed +5 ft. | Manuell: Proficiency in Acrobatics." },
    brainy:      { attr: { intelligence: 2, strength: -2 },
                   note: "Auto: +2 INT, -2 STR. | Manuell: Proficiency in Science + Technology." },
    burly:       { attr: { strength: 2, dexterity: -2 }, ac: 1,
                   note: "Auto: +2 STR, -2 DEX, AC +1. | Manuell: Proficiency in Athletics." },
    caustic:     { attr: { charisma: 2, wisdom: -2 },
                   note: "Auto: +2 CHA, -2 WIS. | Manuell: Proficiency in Intimidation + Deception." },
    clever:      { attr: { intelligence: 2, constitution: -2 },
                   note: "Auto: +2 INT, -2 CON. | Manuell: Proficiency in History + Insight." },
    convincing:  { attr: { charisma: 2, intelligence: -2 },
                   note: "Auto: +2 CHA, -2 INT. | Manuell: Proficiency in Deception + Persuasion." },
    cunning:     { attr: { intelligence: 2, wisdom: -2 },
                   note: "Auto: +2 INT, -2 WIS. | Manuell: Proficiency in Investigation + Persuasion." },
    daring:      { attr: { dexterity: 2, intelligence: -2 }, init: 5,
                   note: "Auto: +2 DEX, -2 INT, Init +5. | Manuell: nichts." },
    disciplined: { note: "Auto: nichts (Choice). | Manuell: +2/-2 auf je 1 Attribut, +1 auf alle Saving Throws." },
    fierce:      { attr: { strength: 2, charisma: -2 },
                   note: "Auto: +2 STR, -2 CHA. | Manuell: +1 Melee-Atk/-Dmg (im Weapon +Atk/+Dmg)." },
    fit:         { attr: { strength: 2, intelligence: -2 }, speed: 5,
                   note: "Auto: +2 STR, -2 INT, Speed +5 ft. | Manuell: Proficiency in Athletics." },
    gifted:      { note: "Auto: nichts (Choice). | Manuell: +2/-2 auf je 1 Attribut, +1 auf ALLE Skill-Checks." },
    graceful:    { attr: { dexterity: 2, constitution: -2 },
                   note: "Auto: +2 DEX, -2 CON. | Manuell: Proficiency in Performance + Sleight of Hand." },
    grizzled:    { attr: { constitution: 2, dexterity: -2 }, ac: 1,
                   note: "Auto: +2 CON, -2 DEX, AC +1. | Manuell: +1 HP pro Level (auch pro Level-Up)." },
    mysterious:  { attr: { wisdom: 2, charisma: -2 },
                   note: "Auto: +2 WIS, -2 CHA. | Manuell: Proficiency in Insight, +5 Passive Perception." },
    persistent:  { attr: { constitution: 2, charisma: -2 },
                   note: "Auto: +2 CON, -2 CHA. | Manuell: 1x pro Tag Skill-Check retry ohne Penalty." },
    resolute:    { attr: { wisdom: 2, dexterity: -2 },
                   note: "Auto: +2 WIS, -2 DEX. | Manuell: Proficiency in Survival, +2 auf WIS/CON-Saves." },
    vigilant:    { attr: { wisdom: 2, charisma: -2 },
                   note: "Auto: +2 WIS, -2 CHA. | Manuell: Proficiency in Perception. Kann nicht überrascht werden." },
    witty:       { attr: { charisma: 2, strength: -2 },
                   note: "Auto: +2 CHA, -2 STR. | Manuell: Proficiency in Deception + Persuasion." },
  };

  // Hilfsfunktion: nur den Effekt-Text setzen, keine Attribut-Aenderungen.
  // Wird beim Sheet-Open genutzt damit der Text fuer den bereits gewaehlten
  // Trait sichtbar bleibt (ohne die Boni nochmal anzuwenden).
  function updateTraitEffectsText() {
    getAttrs(["personality_trait"], (v) => {
      const key = v.personality_trait || "";
      const effects = (TRAIT_EFFECTS[key] && TRAIT_EFFECTS[key].note) || "(Wähle oben einen Personality Trait)";
      setAttrs({ personality_trait_effects: effects });
    });
  }

  on("sheet:opened", updateTraitEffectsText);

  on("change:personality_trait", () => {
    getAttrs([
      "personality_trait", "personality_trait_applied",
      "strength", "dexterity", "constitution", "intelligence", "wisdom", "charisma",
      "speed", "ac", "init_bonus",
    ], (v) => {
      const oldKey = v.personality_trait_applied || "";
      const newKey = v.personality_trait || "";

      const upd = {};
      const setNum = (name, delta) => {
        if (!delta) return;
        const cur = upd[name] !== undefined
          ? parseInt(upd[name]) || 0
          : parseInt(v[name]) || 0;
        upd[name] = cur + delta;
      };

      // Wenn sich der Trait wirklich geaendert hat: Deltas neu rechnen
      if (oldKey !== newKey) {
        // 1. Alten Trait rueckgaengig
        const old = TRAIT_EFFECTS[oldKey];
        if (old) {
          if (old.attr) {
            for (const a in old.attr) setNum(a, -old.attr[a]);
          }
          if (old.speed) setNum("speed", -old.speed);
          if (old.ac)    setNum("ac", -old.ac);
          if (old.init)  setNum("init_bonus", -old.init);
        }

        // 2. Neuen Trait anwenden
        const neu = TRAIT_EFFECTS[newKey];
        if (neu) {
          if (neu.attr) {
            for (const a in neu.attr) setNum(a, neu.attr[a]);
          }
          if (neu.speed) setNum("speed", neu.speed);
          if (neu.ac)    setNum("ac", neu.ac);
          if (neu.init)  setNum("init_bonus", neu.init);
        }

        upd.personality_trait_applied = newKey;
      }

      // Effekt-Text IMMER setzen (auch wenn Trait gleich blieb -
      // sonst verliert man die Text-Anzeige bei Re-Render).
      const cur = TRAIT_EFFECTS[newKey];
      upd.personality_trait_effects = (cur && cur.note) || "(Wähle oben einen Personality Trait)";

      setAttrs(upd);
    });
  });

  on("change:repeating_weapons:wpreset", (info) => {
    const src = (info && info.sourceAttribute) || "";
    const match = /^(repeating_weapons_[^_]+)_/i.exec(src);
    if (!match) return;
    const rowPrefix = match[1];

    getAttrs([src], (v) => {
      const key = v[src];
      if (!key || key === "custom") return; // Custom: nichts überschreiben
      const p = WEAPON_PRESETS[key];
      if (!p) return;

      const upd = {};
      upd[`${rowPrefix}_wname`]       = p.name;
      upd[`${rowPrefix}_wcaliber`]    = p.caliber;
      upd[`${rowPrefix}_wdamage`]     = p.damage;
      upd[`${rowPrefix}_wrange`]      = p.range;
      upd[`${rowPrefix}_wrecoil`]     = p.recoil;
      upd[`${rowPrefix}_wmisfire`]    = p.misfire;
      upd[`${rowPrefix}_wcrit`]       = p.crit;
      upd[`${rowPrefix}_wammo`]       = p.ammo_max;
      upd[`${rowPrefix}_wammo_max`]   = p.ammo_max;
      upd[`${rowPrefix}_wgroup`]      = WEAPON_GROUP_MAP[key] || "";
      upd[`${rowPrefix}_wweight`]     = WEAPON_GROUP_WEIGHT[WEAPON_GROUP_MAP[key]] || 0;
      upd[`${rowPrefix}_wproperties`] = p.properties || "";
      Object.assign(upd, buildPropPillUpdates(rowPrefix, p.properties));
      setAttrs(upd);
    });
  });

  // ---- Armor Presets ----
  const ARMOR_PRESETS = {
    plate_light:     { name: "Plate Carrier (Light)",          ac: "12 + Dex",          coverage: "Torso",                                    resist: "Piercing, Slashing",                 stealth: "",             weight: "5.5 kg" },
    flak_light:      { name: "Flak Jacket (Light)",            ac: "13 + Dex (max 3)",  coverage: "Chest, Back, Groin",                       resist: "Piercing, Slashing",                 stealth: "",             weight: "7.5 kg" },
    flak_medium:     { name: "Medium Flak",                    ac: "14 + Dex (max 2)",  coverage: "Chest, Back, Groin",                       resist: "Piercing, Slashing",                 stealth: "Disadvantage", weight: "12 kg" },
    flak_shoulders:  { name: "Medium Flak w/ Shoulders",       ac: "15 + Dex (max 2)",  coverage: "Chest, Back, Arms, Groin",                 resist: "Piercing, Slashing",                 stealth: "Disadvantage", weight: "14.5 kg" },
    flak_full:       { name: "Medium Flak w/ Shoulders & Legs",ac: "16 (Disadv. Dex)",  coverage: "Chest, Back, Arms, Legs, Groin",           resist: "Piercing, Slashing",                 stealth: "Disadvantage", weight: "14.5 kg" },
    bomb_suit:       { name: "Bomb Suit",                      ac: "18 (-10ft, Disadv. Dex)", coverage: "Chest, Back, Arms, Legs, Groin",     resist: "Bludgeoning, Piercing, Slashing, Force", stealth: "Disadvantage", weight: "40 kg" },

    helm_tactical:   { name: "Tactical Helmet",                ac: "+1",                coverage: "Kopf",                                     resist: "Bludgeoning, Slashing",              stealth: "",             weight: "0.9 kg" },
    helm_kevlar:     { name: "Kevlar Helmet",                  ac: "+1 (-2 Perception)",coverage: "Kopf",                                     resist: "Piercing, Slashing, Bludgeoning",    stealth: "",             weight: "1.8 kg" },
    helm_bomb:       { name: "Bomb Suit Helm",                 ac: "+2 (-5 Perception)",coverage: "Kopf",                                     resist: "Force, Piercing, Slashing, Bludgeoning", stealth: "",         weight: "1.8 kg" },

    gloves_leather:  { name: "Tactical/Leather Gloves",        ac: "- (-2 Dex Hand)",   coverage: "Hände",                                   resist: "Slashing",                           stealth: "",             weight: "0.2 kg" },
    gloves_carbon:   { name: "Carbon Fiber Gloves",            ac: "- (-2 Dex Hand, +1 unarmed)", coverage: "Hände",                         resist: "Piercing, Slashing",                 stealth: "",             weight: "0.2 kg" },
    gloves_bomb:     { name: "Bomb Suit Gloves",               ac: "+2 (Disadv. Dex Hand)", coverage: "Hände",                               resist: "Force, Piercing, Slashing, Bludgeoning", stealth: "",         weight: "1.8 kg" },

    boots_leather:   { name: "Tactical/Leather Boots",         ac: "- (-1 Foot)",       coverage: "Füße",                                   resist: "Slashing",                           stealth: "",             weight: "0.05 kg" },
    boots_carbon:    { name: "Carbon Fiber / Steel Toe",       ac: "- (-1 Foot)",       coverage: "Füße",                                   resist: "Piercing, Slashing",                 stealth: "",             weight: "0.1 kg" },
    boots_bomb:      { name: "Bomb Suit Boots",                ac: "+2 (Disadv. Foot)", coverage: "Füße",                                   resist: "Force, Piercing, Slashing, Bludgeoning", stealth: "",         weight: "1.8 kg" },
  };

  on("change:repeating_armor:apreset", (info) => {
    const src = (info && info.sourceAttribute) || "";
    const match = /^(repeating_armor_[^_]+)_/i.exec(src);
    if (!match) return;
    const rowPrefix = match[1];
    getAttrs([src], (v) => {
      const key = v[src];
      if (!key || key === "custom") return;
      const p = ARMOR_PRESETS[key];
      if (!p) return;
      setAttrs({
        [`${rowPrefix}_aname`]:     p.name,
        [`${rowPrefix}_aac`]:       p.ac,
        [`${rowPrefix}_acoverage`]: p.coverage,
        [`${rowPrefix}_aresist`]:   p.resist,
        [`${rowPrefix}_astealth`]:  p.stealth,
        [`${rowPrefix}_aweight`]:   p.weight,
      });
    });
  });

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

  // ---- Inventory Presets ----
  const GEAR_PRESETS = {
    // Standard Issue
    rucksack:       { name: "Main Rucksack",               qty: 1, weight: "",       notes: "Standard Issue" },
    daypack:        { name: "Day Pack",                    qty: 1, weight: "",       notes: "Standard Issue" },
    sleepbag_light: { name: "Light Sleeping Bag",          qty: 1, weight: "",       notes: "Standard Issue, Plus-Temperaturen" },
    sleepbag_heavy: { name: "Heavy Sleeping Bag",          qty: 1, weight: "",       notes: "Standard Issue, kalte Umgebung" },
    lbs_vest:       { name: "Load-Bearing Vest",           qty: 1, weight: "",       notes: "Tool-Proficiency (Rifleman)" },
    camelbak:       { name: "CamelBak 2L",                 qty: 1, weight: "",       notes: "Wasser-Blase" },
    isomat:         { name: "Iso-mat",                     qty: 1, weight: "",       notes: "Isolierte Schlaf-Unterlage" },
    tarp:           { name: "Camo Tarpaulin 10x10 ft",     qty: 1, weight: "",       notes: "Tarnung / Shelter" },
    paracord:       { name: "100 ft Paracord (550)",       qty: 1, weight: "",       notes: "Reissfest bis 250 kg" },
    canteen:        { name: "Canteen 1L",                  qty: 4, weight: "",       notes: "Standard 4 pro Operator" },
    canteen_cup:    { name: "Canteen Cup",                 qty: 1, weight: "",       notes: "Metall-Trinkbecher" },
    messkit:        { name: "Mess Kit",                    qty: 1, weight: "",       notes: "Kochgeschirr, Field-Mess-Proficiency" },
    combat_knife:   { name: "Combat Knife",                qty: 1, weight: "",       notes: "Melee 1d4 Slashing, CQC" },
    bayonet:        { name: "Bayonet",                     qty: 1, weight: "",       notes: "An Rifle montiert, 1d4 Piercing" },

    // Class Tools
    ghillie:        { name: "Ghillie Suit",                qty: 1, weight: "",       notes: "Marksman: +5 Stealth (+10 mit Stalker), >1000ft invisible" },
    spotscope:      { name: "Spotting Scope",              qty: 1, weight: "",       notes: "Marksman Tool-Proficiency" },
    te_tool:        { name: "T&E Tool",                    qty: 1, weight: "",       notes: "Machine Gunner Tool-Proficiency, MG-Einrichtung" },
    demo_tools:     { name: "Demolitions Tools",           qty: 1, weight: "",       notes: "Demolitionist Tool-Proficiency" },
    handler_tools:  { name: "Handler's Tools",             qty: 1, weight: "",       notes: "Dog Handler Tool-Proficiency" },
    b1ard:          { name: "B1ARD Kit",                   qty: 1, weight: "",       notes: "Tech Specialist Drohnen-Tool-Proficiency" },
    drone_repair:   { name: "Drone Repair Kit",            qty: 1, weight: "",       notes: "Tech Specialist: DC 15 Int-Check zum Reparieren/Upgraden" },
    decon_kit:      { name: "Decontamination Kit",         qty: 1, weight: "",       notes: "Combat Medic Tool-Proficiency" },
    terrain_map:    { name: "Terrain Map Tools",           qty: 1, weight: "",       notes: "Unit Leader Tool-Proficiency" },

    // Comms
    uhf_radio:      { name: "UHF Radio",                   qty: 1, weight: "",       notes: "Standard Military Funk" },
    sat_radio:      { name: "Satellite Radio",             qty: 1, weight: "",       notes: "Long-Range via Satellit" },
    crypto_key:     { name: "Crypto Key",                  qty: 1, weight: "",       notes: "Radio Ops Training L2, verschlüsselter Funk" },

    // Medical (Corpsman Supply)
    morphine:       { name: "Morphine",                    qty: 1, weight: "",       notes: "Heal 6d6 HP jede Triage-Stufe; Con-Save DC=HP oder bewusstlos. 3+ Uses/24h kann Sucht auslösen" },
    quickclot:      { name: "Quick Clot",                  qty: 1, weight: "",       notes: "Stoppt Bleed/Major Bleed. Con-Save DC 15 oder bewusstlos" },
    narcotics:      { name: "Narcotics",                   qty: 1, weight: "",       notes: "1d6 HP + 1d6 für 3 weitere Runden. 4+ Uses/24h = Suchtrisiko" },
    iv_500:         { name: "I.V. 500cc",                  qty: 1, weight: "",       notes: "1 Min Setup, 5 Min Admin. Regain 1 HP alle 2 Rd. Nur Green/Yellow/Orange" },
    liquid_skin:    { name: "Liquid Skin Patch",           qty: 1, weight: "",       notes: "Heal 2d6 HP. Nur Orange/Red Triage" },
    epi:            { name: "Epinephrine",                 qty: 1, weight: "",       notes: "Auf 0-HP-Ziel innerhalb 3 Rd: regain 6d4 HP. 1x/Tag sicher, sonst Con-Save" },
    combat_pills:   { name: "Combat Pill Pack",            qty: 1, weight: "",       notes: "Nach 24h: Adv. auf Disease/Poison-Checks für 48h" },
    diazepam:       { name: "5 Days Diazepam",             qty: 1, weight: "",       notes: "Nach 5 Tagen Einnahme: 1 Stufe Shaken weniger" },
  };

  on("change:repeating_gear:ipreset", (info) => {
    const src = (info && info.sourceAttribute) || "";
    const match = /^(repeating_gear_[^_]+)_/i.exec(src);
    if (!match) return;
    const rowPrefix = match[1];
    getAttrs([src], (v) => {
      const key = v[src];
      if (!key || key === "custom") return;
      const p = GEAR_PRESETS[key];
      if (!p) return;
      setAttrs({
        [`${rowPrefix}_iname`]:   p.name,
        [`${rowPrefix}_iqty`]:    p.qty,
        [`${rowPrefix}_iweight`]: p.weight,
        [`${rowPrefix}_inotes`]:  p.notes,
      });
    });
  });

  // ---- Leadership Dice (Unit Leader) ----
  on("clicked:roll_ld", () => {
    getAttrs(["ld_current", "ld_max", "ld_size", "character_name"], (v) => {
      const current = parseInt(v.ld_current) || 0;
      const size = v.ld_size || "1d4";
      const charName = v.character_name || "Operator";
      if (current <= 0) {
        startRoll(
          `&{template:check} {{title=Leadership Dice - leer}} {{who=${charName}}} {{result=Keine LD mehr uebrig}}`,
          (r) => finishRoll(r.rollId)
        );
        return;
      }
      const newCurrent = Math.max(0, current - 1);
      setAttrs({ ld_current: newCurrent });
      startRoll(
        `&{template:check} {{title=Leadership Die (${size})}} {{who=${charName}}} {{result=[[${size}]]}} {{note=LD ${current} -> ${newCurrent}. Add to ally's roll, or use for Order.}}`,
        (r) => finishRoll(r.rollId)
      );
    });
  });

  // ---- Unit-Leader Orders ----
  // Jeder Button verbraucht 1 LD, rollt sie, und postet Effekt-Karte.
  // Rally addiert zusaetzlich CHA-Mod (Heilung).
  // Inspiring Leader ist eine 7th-Level-Feature und erhaelt ein eigenes Label.
  const UNIT_LEADER_ORDERS = {
    fire_on_target: {
      name: "Fire on My Target",
      action: "Attack-Action",
      effect: "Verbuendete in 60ft mit Sicht duerfen Reaction fuer Angriff auf dasselbe Ziel nutzen. Damage +LD-Wert.",
    },
    head_down: {
      name: "Get Your Head Down",
      action: "Reaction",
      effect: "Ally in 5ft wird ranged angegriffen: +LD-Wert auf dessen AC gegen diesen Angriff.",
    },
    suppression: {
      name: "Suppression",
      action: "Action",
      effect: "Suppression + LD-Dice: so viele Allies joinen mit Reaction. Pro Helfer +1 Ziel moeglich.",
    },
    rally: {
      name: "Rally",
      action: "Bonus Action",
      effect: "Ally in 30ft heilt LD + CHA-Mod HP. Nur bei Triage Yellow/Green.",
      healBonus: true,
    },
    double_time: {
      name: "Double Time",
      action: "On Turn",
      effect: "Ally in 60ft darf Dash als Bonus Action. Dauer: LD Runden.",
    },
    reposition: {
      name: "Reposition",
      action: "On Turn",
      effect: "Ally in 60ft darf Disengage als Bonus Action. Dauer: LD Runden.",
    },
    take_cover: {
      name: "Take Cover",
      action: "On Turn",
      effect: "Ally in 60ft bekommt +2 auf Cover-Boni. Dauer: LD Runden.",
    },
    go_silent: {
      name: "Go Silent",
      action: "On Turn",
      effect: "Ally in 60ft bekommt +10 Stealth. Dauer: LD Minuten.",
    },
    security: {
      name: "Security",
      action: "On Turn",
      effect: "Ally in 60ft bekommt Advantage auf Attacks wenn es sich nicht bewegt. Dauer: LD Minuten.",
    },
    inspire: {
      name: "Inspiring Leader",
      action: "Aktion (7th Level)",
      effect: "Ally in 30ft darf LD-Wert zu 1 Ability-Check / Attack / Save innerhalb 10 Minuten addieren.",
    },
  };

  function executeOrder(key) {
    const o = UNIT_LEADER_ORDERS[key];
    if (!o) return;
    getAttrs(["ld_current", "ld_size", "charisma_mod", "character_name"], (v) => {
      const current = parseInt(v.ld_current) || 0;
      const size = v.ld_size || "1d4";
      const cha = parseInt(v.charisma_mod) || 0;
      const charName = v.character_name || "Operator";
      if (current <= 0) {
        startRoll(
          `&{template:check} {{title=Order ${o.name}}} {{who=${charName}}} {{result=Keine Leadership Dice}} {{note=Warte auf Short oder Long Rest.}}`,
          (r) => finishRoll(r.rollId)
        );
        return;
      }
      const newCurrent = current - 1;
      setAttrs({ ld_current: newCurrent });
      const resultExpr = o.healBonus
        ? `[[${size} + ${cha}]] HP (LD + CHA ${cha >= 0 ? "+" : ""}${cha})`
        : `[[${size}]]`;
      startRoll(
        `&{template:order} {{title=${o.name}}} {{who=${charName}}} {{action_type=${o.action}}} {{result=${resultExpr}}} {{effect=${o.effect}}} {{ld_before=${current}}} {{ld_after=${newCurrent}}}`,
        (r) => finishRoll(r.rollId)
      );
    });
  }

  on("clicked:order_fire_on_target", () => executeOrder("fire_on_target"));
  on("clicked:order_head_down",      () => executeOrder("head_down"));
  on("clicked:order_suppression",    () => executeOrder("suppression"));
  on("clicked:order_rally",          () => executeOrder("rally"));
  on("clicked:order_double_time",    () => executeOrder("double_time"));
  on("clicked:order_reposition",     () => executeOrder("reposition"));
  on("clicked:order_take_cover",     () => executeOrder("take_cover"));
  on("clicked:order_go_silent",      () => executeOrder("go_silent"));
  on("clicked:order_security",       () => executeOrder("security"));
  on("clicked:order_inspire",        () => executeOrder("inspire"));

  // ---- Trauma Bag: IFAK / Trauma Kit Use ----
  // DC 15 Wisdom (Medicine) - on pass heal (dice) + WIS mod.
  // Dice scale: 1d10 (L1-9), 2d10 (L10-17), 3d10 (L20+).
  // Medical Grade Supply (7th): +Prof-Bonus zur Heilung.
  // Seasoned Medic (18th): Heilungs-Dice verdoppeln sich.
  function medHeal(kind) {
    const usesAttr = kind === "ifak" ? "ifak_uses" : "trauma_uses";
    const labelName = kind === "ifak" ? "IFAK" : "Trauma Kit";
    getAttrs([
      usesAttr,
      "wisdom_mod",
      "level",
      "character_name",
      "skill_medicine_bonus",
      "skill_medicine_extra",
      "prof_bonus",
    ], (v) => {
      const uses = parseInt(v[usesAttr]) || 0;
      const wisMod = parseInt(v.wisdom_mod) || 0;
      const lvl = parseInt(v.level) || 1;
      const charName = v.character_name || "Operator";
      const medBonusTrained = parseInt(v.skill_medicine_bonus) || 0;
      const medExtra = parseInt(v.skill_medicine_extra) || 0;
      const profBonus = parseInt(v.prof_bonus) || 2;

      if (uses <= 0) {
        startRoll(
          `&{template:check} {{title=${labelName} - leer}} {{who=${charName}}} {{result=Keine ${labelName}-Uses mehr}}`,
          (r) => finishRoll(r.rollId)
        );
        return;
      }

      // Base dice nach Level
      let diceCount = lvl >= 20 ? 3 : (lvl >= 10 ? 2 : 1);
      // Seasoned Medic (18th): verdoppelt die Dice
      const seasonedMedic = lvl >= 18;
      if (seasonedMedic) diceCount *= 2;
      const dice = `${diceCount}d10`;

      // Medical Grade Supply (7th) addiert Prof-Bonus zur Heilung
      const medGradeBonus = lvl >= 7 ? profBonus : 0;
      const healBonusExpr = medGradeBonus > 0
        ? `${wisMod} + ${medGradeBonus}`
        : `${wisMod}`;

      const medAtkBonus = wisMod + medBonusTrained + medExtra;
      const newUses = Math.max(0, uses - 1);
      setAttrs({ [usesAttr]: newUses });

      const notes = [
        `${labelName}-Uses ${uses} -> ${newUses}.`,
        "Heilung nur auf Yellow/Orange/Red Triage.",
      ];
      if (medGradeBonus > 0) notes.push(`Medical Grade Supply (7th): +${medGradeBonus} zur Heilung.`);
      if (seasonedMedic)     notes.push(`Seasoned Medic (18th): Dice verdoppelt (${diceCount}d10).`);

      const rollText = `&{template:check} ` +
        `{{title=${labelName} (DC 15 Medicine)}} ` +
        `{{who=${charName}}} ` +
        `{{result=Med-Check [[1d20 + ${medAtkBonus}]] vs DC 15. On pass heal [[${dice} + ${healBonusExpr}]] HP}} ` +
        `{{note=${notes.join(" ")}}}`;
      startRoll(rollText, (r) => finishRoll(r.rollId));
    });
  }

  on("clicked:ifak_use", () => medHeal("ifak"));
  on("clicked:trauma_use", () => medHeal("trauma"));

  // ---- Corpsman Bag Upgrade (Combat Medic 15th) ----
  // Erhoeht Max + Current auf die 15th-Level-Werte.
  on("clicked:upgrade_corpsman", () => {
    setAttrs({
      ifak_uses: 15, ifak_max: 15,
      tourniquet_count: 4, tourniquet_max: 4,
      trauma_uses: 10, trauma_max: 10,
      medsupply_uses: 20, medsupply_max: 20,
    });
    getAttrs(["character_name"], (v) => {
      startRoll(
        `&{template:check} {{title=Corpsman Bag Upgrade}} {{who=${v.character_name || "Operator"}}} {{result=IFAK 15 | Tourniquets 4 | Trauma 10 | Med Supply 20}} {{note=Medical Sustainment Pack (15th). Plus Expertise in Medicine (manuell im Skill-Level setzen).}}`,
        (r) => finishRoll(r.rollId)
      );
    });
  });

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

  // ---- War Dog ----
  function dogBite() {
    getAttrs(["dog_name", "dog_type", "character_name"], (v) => {
      const dogName = v.dog_name || "Dog";
      const type = v.dog_type || "tracking";
      const charName = v.character_name || "Operator";
      // Tracking Dog: +3 to hit, 1d4+1 damage
      // Attack Dog: +3 to hit, 1d6+3 damage (Lock Jaw)
      const atkBonus = 3;
      const dmgFormula = type === "attack" ? "1d6 + 3" : "1d4 + 1";
      const label = type === "attack" ? "Attack Dog Bite" : "Tracking Dog Bite";
      const rollText = `&{template:attack} ` +
        `{{title=${dogName} - ${label}}} ` +
        `{{who=${charName}}} ` +
        `{{mode=Bite (Melee)}} ` +
        `{{attack=[[1d20 + ${atkBonus}]]}} ` +
        `{{damage=[[${dmgFormula}]]}} ` +
        `{{note=Reach 5ft. Piercing.}}`;
      startRoll(rollText, (r) => finishRoll(r.rollId));
    });
  }

  on("clicked:dog_bite", dogBite);

  on("clicked:dog_perception", () => {
    getAttrs(["dog_name", "dog_focus", "character_name"], (v) => {
      const dogName = v.dog_name || "Dog";
      const focus = v.dog_focus || "";
      const charName = v.character_name || "Operator";
      // Tracking Dog Perception base +5. +10 if tracking focus target.
      const note = focus ? `Focus: ${focus} - auf Fokus-Ziel +10 auf Check.` : "Kein Tracking-Focus gesetzt.";
      const rollText = `&{template:check} ` +
        `{{title=${dogName} - Perception}} ` +
        `{{who=${charName}}} ` +
        `{{result=[[1d20 + 5]] (auf Hören/Riechen mit Advantage)}} ` +
        `{{note=${note}}}`;
      startRoll(rollText, (r) => finishRoll(r.rollId));
    });
  });

  // ---- Short / Long Rest ----
  // Short: kurze Regeneration. Long: alles zurückgesetzt, HP voll.
  // Kein Chat-Output - Resets sind am Sheet selbst sichtbar.
  on("clicked:short_rest", () => {
    getAttrs(["ld_max", "brawler_max"], (v) => {
      setAttrs({
        second_wind_used: 0,
        ld_current: parseInt(v.ld_max) || 0,
        brawler_current: parseInt(v.brawler_max) || 0,
      });
    });
    stressHeal("short");
  });

  on("clicked:long_rest", () => {
    getAttrs([
      "hp_max", "ld_max", "brawler_max",
      "hit_dice_max", "hit_dice",
      "ifak_max", "tourniquet_max", "trauma_max", "medsupply_max",
      "tech_sensors_max", "tech_seekers_max", "tech_bugs_max",
    ], (v) => {
      const hpMax = parseInt(v.hp_max) || 10;
      const hdMax = parseInt(v.hit_dice_max) || 1;
      const hdCurrent = parseInt(v.hit_dice) || 0;
      const hdRegained = Math.max(1, Math.floor(hdMax / 2));
      const newHD = Math.min(hdMax, hdCurrent + hdRegained);
      setAttrs({
        hp: hpMax,
        hp_temp: 0,
        second_wind_used: 0,
        action_surge_used: 0,
        indomitable_used: 0,
        ld_current: parseInt(v.ld_max) || 0,
        brawler_current: parseInt(v.brawler_max) || 0,
        ifak_uses: parseInt(v.ifak_max) || 10,
        tourniquet_count: parseInt(v.tourniquet_max) || 2,
        trauma_uses: parseInt(v.trauma_max) || 5,
        medsupply_uses: parseInt(v.medsupply_max) || 10,
        tech_sensors: parseInt(v.tech_sensors_max) || 3,
        tech_seekers: parseInt(v.tech_seekers_max) || 2,
        tech_bugs:    parseInt(v.tech_bugs_max)    || 5,
        hit_dice: newHD,
        ds_s1: 0, ds_s2: 0, ds_s3: 0,
        ds_f1: 0, ds_f2: 0, ds_f3: 0,
      });
    });
    stressHeal("long");
  });

  // ---- Hit Dice Roll ----
  on("clicked:roll_hd", () => {
    getAttrs(["hit_dice", "constitution_mod", "hp", "hp_max", "character_name"], (v) => {
      const current = parseInt(v.hit_dice) || 0;
      const conMod = parseInt(v.constitution_mod) || 0;
      const hp = parseInt(v.hp) || 0;
      const hpMax = parseInt(v.hp_max) || 0;
      const charName = v.character_name || "Operator";

      if (current <= 0) {
        startRoll(
          `&{template:check} {{title=Hit Dice - leer}} {{who=${charName}}} {{result=Keine Hit Dice mehr uebrig}}`,
          (r) => finishRoll(r.rollId)
        );
        return;
      }

      // 1d10 + CON-Mod, clamp zwischen 1 und (hpMax - hp)
      const healed = Math.floor(Math.random() * 10) + 1 + conMod;
      const healClamped = Math.max(1, healed);
      const newHP = Math.min(hpMax, hp + healClamped);
      const actualHealed = newHP - hp;
      const newHD = current - 1;

      setAttrs({
        hit_dice: newHD,
        hp: newHP,
      });

      startRoll(
        `&{template:check} {{title=Hit Dice (Short Rest)}} {{who=${charName}}} {{result=+${actualHealed} HP (Wurf: [[${healed}]])}} {{note=HD ${current} -> ${newHD}. HP ${hp} -> ${newHP} / ${hpMax}.}}`,
        (r) => finishRoll(r.rollId)
      );
    });
  });

  on("clicked:dog_grapple", () => {
    getAttrs(["dog_name", "character_name"], (v) => {
      const dogName = v.dog_name || "Dog";
      const charName = v.character_name || "Operator";
      // Attack Dog Lock Jaw: +10 Athletics on grapple
      const rollText = `&{template:check} ` +
        `{{title=${dogName} - Lock Jaw Grapple}} ` +
        `{{who=${charName}}} ` +
        `{{result=Athletics [[1d20 + 2 + 10]] vs Ziel-Save}} ` +
        `{{note=Attack Dog only. Grapple statt Attack-Action. +10 Athletics durch Lock Jaw.}}`;
      startRoll(rollText, (r) => finishRoll(r.rollId));
    });
  });

  // ---- Handler Technique (10th Level) ----
  // Leap Attack: Move + 1 Melee (Bite mit gleichem Damage wie Normalangriff).
  // Take Down: Grapple-Check; Attack Dog nutzt Lock Jaw (+10).
  // Defend Your Master: Move + Disadvantage auf alle Angriffe auf Operator.
  on("clicked:dog_leap_attack", () => {
    getAttrs(["dog_name", "dog_type", "dog_speed", "character_name"], (v) => {
      const dogName = v.dog_name || "Dog";
      const type = v.dog_type || "tracking";
      const speed = v.dog_speed || "40 ft";
      const charName = v.character_name || "Operator";
      const atkBonus = 3;
      const dmgFormula = type === "attack" ? "1d6 + 3" : "1d4 + 1";
      const rollText = `&{template:attack} ` +
        `{{title=${dogName} - Leap Attack}} ` +
        `{{who=${charName}}} ` +
        `{{mode=Bonus Action (Handler Technique)}} ` +
        `{{attack=[[1d20 + ${atkBonus}]]}} ` +
        `{{damage=[[${dmgFormula}]]}} ` +
        `{{note=Bewegung bis zu halber Speed (${speed}/2), dann 1 Melee-Angriff. Bonus-Action fuer Operator.}}`;
      startRoll(rollText, (r) => finishRoll(r.rollId));
    });
  });

  on("clicked:dog_takedown", () => {
    getAttrs(["dog_name", "dog_type", "dog_str", "character_name"], (v) => {
      const dogName = v.dog_name || "Dog";
      const type = v.dog_type || "tracking";
      const strScore = parseInt(v.dog_str) || 11;
      const strMod = Math.floor((strScore - 10) / 2);
      const charName = v.character_name || "Operator";
      // Attack Dog hat Lock Jaw (+10 Athletics). Tracking Dog nur STR-Mod + Prof.
      const lockJaw = type === "attack";
      const totalBonus = strMod + 2 + (lockJaw ? 10 : 0);
      const rollText = `&{template:check} ` +
        `{{title=${dogName} - Take Down}} ` +
        `{{who=${charName}}} ` +
        `{{result=Athletics [[1d20 + ${totalBonus}]] vs Ziel-Save${lockJaw ? " (Lock Jaw +10)" : ""}}} ` +
        `{{note=Bonus Action (Handler Technique). Bei Erfolg: Ziel ist Prone UND Grappled.}}`;
      startRoll(rollText, (r) => finishRoll(r.rollId));
    });
  });

  on("clicked:dog_defend_master", () => {
    getAttrs(["dog_name", "dog_speed", "character_name"], (v) => {
      const dogName = v.dog_name || "Dog";
      const speed = v.dog_speed || "40 ft";
      const charName = v.character_name || "Operator";
      const rollText = `&{template:check} ` +
        `{{title=${dogName} - Defend Your Master}} ` +
        `{{who=${charName}}} ` +
        `{{result=Active bis Ende deiner Runde}} ` +
        `{{note=Hund bewegt sich bis zu halber Speed (${speed}/2) und endet innerhalb 5ft von ${charName}. Alle gegnerischen Angriffe auf ${charName} diese Runde haben Disadvantage.}}`;
      startRoll(rollText, (r) => finishRoll(r.rollId));
    });
  });

  // ---- Tech Package (Tech Specialist 7th Level) ----
  // Motion Sensor / Seeker Grenade / Audio Bug: je Deploy-Button dekrementiert
  // Count und postet Regel-Karte. Reset auf Long Rest (siehe long_rest Handler).
  function deployTech(kind) {
    const cfg = {
      sensor: {
        name: "Motion Sensor",
        attr: "tech_sensors",
        desc: "2-inch Disc, pingt alle 6 Sek bei Bewegung in 20 ft. Bonus-Action zum Aktivieren. Haelt 24h.",
      },
      seeker: {
        name: "Seeker Grenade",
        attr: "tech_seekers",
        desc: "Sticky Grenade ohne Attack-Roll solange sie rollen kann. Bewegt 40 ft, detoniert nach 10 Runden.",
      },
      bug: {
        name: "Audio Bug",
        attr: "tech_bugs",
        desc: "1cm Mikrofon, hoerst innerhalb 20 ft. Bonus-Action zum Platzieren. Haelt 8h.",
      },
    }[kind];
    if (!cfg) return;
    getAttrs([cfg.attr, "character_name"], (v) => {
      const current = parseInt(v[cfg.attr]) || 0;
      const charName = v.character_name || "Operator";
      if (current <= 0) {
        startRoll(
          `&{template:check} {{title=${cfg.name} - keine mehr}} {{who=${charName}}} {{result=Bestand leer, Long Rest noetig}}`,
          (r) => finishRoll(r.rollId)
        );
        return;
      }
      const next = current - 1;
      setAttrs({ [cfg.attr]: next });
      startRoll(
        `&{template:check} {{title=Deploy: ${cfg.name}}} {{who=${charName}}} ` +
        `{{result=${cfg.name} gesetzt (${current} -> ${next} verbleibend)}} ` +
        `{{note=${cfg.desc}}}`,
        (r) => finishRoll(r.rollId)
      );
    });
  }

  on("clicked:tech_sensor_deploy", () => deployTech("sensor"));
  on("clicked:tech_seeker_deploy", () => deployTech("seeker"));
  on("clicked:tech_bug_deploy",    () => deployTech("bug"));

  // ---- Stress Damage Akkumulator ----
  // Compendium:
  //   Netto-Stress = Schaden - WIS (min 1)
  //   Überschreitet stress_total ein WIS-Vielfaches -> WIS-Save
  //   Fail = nächste Shaken-Stufe
  const STRESS_TIERS = [
    { dc: 12, effect: "Shaken 1", heal: "Short: 1d6+WIS / Long: 1d12+WIS" },
    { dc: 15, effect: "Shaken 2", heal: "Short: 1d4+WIS / Long: 1d8+WIS" },
    { dc: 20, effect: "Shaken 3", heal: "Short: 1 / Long: 1d4+WIS" },
    { dc: 25, effect: "Shaken 4", heal: "Short: Medic / Long: 1+WIS" },
    { dc: 30, effect: "Broken",   heal: "Nur medizinische Versorgung" },
  ];

  // Second Wind: beim Heal-Klick automatisch als verbraucht markieren.
  on("clicked:second_wind", () => {
    setAttrs({ second_wind_used: 1 });
  });

  // Languages-Roll nutzt type="roll" direkt im Button, kein Worker nötig.

  on("clicked:apply_stress", () => {
    getAttrs([
      "stress_damage_input",
      "wisdom",
      "wisdom_mod",
      "stress_total",
      "character_name",
      "save_wis_prof",
      "save_wis_extra",
      "prof_bonus",
    ], (v) => {
      const dmg = parseInt(v.stress_damage_input) || 0;
      const wis = Math.max(1, parseInt(v.wisdom) || 10);
      const wisMod = parseInt(v.wisdom_mod) || 0;
      const oldTotal = parseInt(v.stress_total) || 0;
      const charName = v.character_name || "Operator";
      const saveProf = parseInt(v.save_wis_prof) || 0;
      const saveExtra = parseInt(v.save_wis_extra) || 0;
      const profBonus = parseInt(v.prof_bonus) || 2;

      if (dmg <= 0) return;

      const netStress = Math.max(1, dmg - wis);
      const newTotal = oldTotal + netStress;

      // Wieviele WIS-Vielfache wurden NEU gekreuzt?
      const oldMultiple = Math.floor(oldTotal / wis);
      const newMultiple = Math.floor(newTotal / wis);

      const upd = {
        stress_total: newTotal,
        stress_damage_input: 0,
      };

      if (newMultiple > oldMultiple && newMultiple > 0) {
        // Tier für den höchsten neu erreichten Wert
        const tierIdx = Math.min(newMultiple, STRESS_TIERS.length) - 1;
        const tier = STRESS_TIERS[tierIdx];

        setAttrs(upd);

        const saveBonus = wisMod + (saveProf * profBonus) + saveExtra;
        const headline = `STRESS THRESHOLD (${newMultiple}x WIS)`;
        const note = `Netto +${netStress} -> Stress-Total ${newTotal}. Fail = ${tier.effect}. Heilung: ${tier.heal}.`;

        const rollText = `&{template:check} ` +
          `{{title=${headline}}} ` +
          `{{who=${charName}}} ` +
          `{{result=[[1d20 + ${saveBonus}]] vs DC ${tier.dc}}} ` +
          `{{note=${note}}}`;

        startRoll(rollText, (results) => finishRoll(results.rollId));
      } else {
        // Kein Schwellen-Überschreiten - schlichte Bestätigung
        setAttrs(upd);
        const bisNächster = wis - (newTotal % wis);
        const rollText = `&{template:check} ` +
          `{{title=Stress +${netStress}}} ` +
          `{{who=${charName}}} ` +
          `{{result=Total ${newTotal}}} ` +
          `{{note=${bisNächster} bis zum nächsten WIS-Vielfachen (${newMultiple + 1}x = ${(newMultiple + 1) * wis}).}}`;
        startRoll(rollText, (results) => finishRoll(results.rollId));
      }
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

  // ---- Recoil-vs-STR Auto-Penalty ----
  // Compendium: Wenn STR < Recoil -> Single -1 flat, Burst/Auto -(Recoil-STR).
  // Hidden attrs wrecoil_pen_single und wrecoil_pen_auto werden auto-berechnet
  // und direkt in den Attack-Formeln abgezogen.
  function computeRecoilPenalties(str, recoil) {
    const diff = recoil - str;
    return {
      single: diff > 0 ? 1 : 0,
      auto: diff > 0 ? diff : 0,
    };
  }

  // Wenn STR sich ändert: alle Waffen neu berechnen
  on("change:strength sheet:opened", () => {
    getAttrs(["strength"], (v) => {
      const str = parseInt(v.strength) || 10;
      getSectionIDs("repeating_weapons", (ids) => {
        if (!ids.length) return;
        const recoilAttrs = ids.map(id => `repeating_weapons_${id}_wrecoil`);
        getAttrs(recoilAttrs, (vals) => {
          const upd = {};
          ids.forEach(id => {
            const recoil = parseInt(vals[`repeating_weapons_${id}_wrecoil`]) || 0;
            const pen = computeRecoilPenalties(str, recoil);
            upd[`repeating_weapons_${id}_wrecoil_pen_single`] = pen.single;
            upd[`repeating_weapons_${id}_wrecoil_pen_auto`] = pen.auto;
          });
          setAttrs(upd);
        });
      });
    });
  });

  // Wenn Recoil einer einzelnen Waffe sich ändert: nur diese neu berechnen
  on("change:repeating_weapons:wrecoil", (info) => {
    const src = info.sourceAttribute || "";
    const lastUnderscore = src.lastIndexOf("_");
    if (lastUnderscore < 0) return;
    const prefix = src.substring(0, lastUnderscore);
    getAttrs(["strength", src], (v) => {
      const str = parseInt(v.strength) || 10;
      const recoil = parseInt(v[src]) || 0;
      const pen = computeRecoilPenalties(str, recoil);
      const upd = {};
      upd[`${prefix}_wrecoil_pen_single`] = pen.single;
      upd[`${prefix}_wrecoil_pen_auto`] = pen.auto;
      setAttrs(upd);
    });
  });
