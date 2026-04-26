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

  // Injury: Schaden auf HP (Temp first, dann normale HP, min 0) PLUS  //
  // Stress-Logik (Netto-Stress = Schaden - WIS, min 1; bei WIS-Multi   //
  // wird automatisch WIS-Save mit DC pro Tier gerollt).                //
  on("clicked:add_damage", () => {
    getAttrs([
      "damage_input",
      "wisdom", "wisdom_mod", "stress_total",
      "character_name",
      "save_wis_prof", "save_wis_extra", "prof_bonus",
      "hp", "hp_temp",
    ], (v) => {
      const dmg = parseInt(v.damage_input) || 0;
      if (dmg <= 0) return;

      const wis = Math.max(1, parseInt(v.wisdom) || 10);
      const wisMod = parseInt(v.wisdom_mod) || 0;
      const oldTotal = parseInt(v.stress_total) || 0;
      const charName = v.character_name || "Operator";
      const saveProf = parseInt(v.save_wis_prof) || 0;
      const saveExtra = parseInt(v.save_wis_extra) || 0;
      const profBonus = parseInt(v.prof_bonus) || 2;
      const hp = parseInt(v.hp) || 0;
      const hpTemp = parseInt(v.hp_temp) || 0;

      // HP: Temp first, dann normale HP, min 0
      const tempAbsorbed = Math.min(hpTemp, dmg);
      const remaining = dmg - tempAbsorbed;
      const newTemp = hpTemp - tempAbsorbed;
      const newHp = Math.max(0, hp - remaining);
      const hpLost = hp - newHp;

      // Stress
      const netStress = Math.max(1, dmg - wis);
      const newTotal = oldTotal + netStress;
      const oldMultiple = Math.floor(oldTotal / wis);
      const newMultiple = Math.floor(newTotal / wis);

      const hpInfo = tempAbsorbed > 0
        ? `Temp -${tempAbsorbed}, HP -${hpLost} (${hp} -> ${newHp} / max)`
        : `HP -${hpLost} (${hp} -> ${newHp})`;

      const upd = {
        hp: newHp,
        hp_temp: newTemp,
        stress_total: newTotal,
        damage_input: 0,
      };

      if (newMultiple > oldMultiple && newMultiple > 0) {
        const tierIdx = Math.min(newMultiple, STRESS_TIERS.length) - 1;
        const tier = STRESS_TIERS[tierIdx];

        setAttrs(upd);

        const saveBonus = wisMod + (saveProf * profBonus) + saveExtra;
        const headline = `Injury -${dmg} - STRESS THRESHOLD (${newMultiple}x WIS)`;
        const note = `${hpInfo}. Stress +${netStress} -> Total ${newTotal}. Fail = ${tier.effect}. Heilung: ${tier.heal}.`;

        const rollText = `&{template:check} ` +
          `{{title=${headline}}} ` +
          `{{who=${charName}}} ` +
          `{{result=[[1d20 + ${saveBonus}]] vs DC ${tier.dc}}} ` +
          `{{note=${note}}}`;

        startRoll(rollText, (results) => finishRoll(results.rollId));
      } else {
        setAttrs(upd);
        const bisNaechster = wis - (newTotal % wis);
        const rollText = `&{template:check} ` +
          `{{title=Injury -${dmg}}} ` +
          `{{who=${charName}}} ` +
          `{{result=${hpInfo}}} ` +
          `{{note=Stress +${netStress} -> Total ${newTotal}. ${bisNaechster} bis zum naechsten WIS-Vielfachen (${newMultiple + 1}x = ${(newMultiple + 1) * wis}).}}`;
        startRoll(rollText, (results) => finishRoll(results.rollId));
      }
    });
  });

