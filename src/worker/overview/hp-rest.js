  // ---- Triage Code from HP ----
  // Triggert auf jede Aenderung von hp / hp_max / hp_temp (auch via   //
  // Spinner-Buttons im number-Input). Setzt das sichtbare Label und   //
  // 5 versteckte State-Checkboxen (analog zur Encumbrance-Zelle), die //
  // im CSS via :has() die Badge-Farbe steuern - Roll20 reflektiert     //
  // :checked zuverlaessig, das HTML value-Attribut auf disabled text  //
  // Inputs nicht.                                                      //
  on("change:hp change:hp_max change:hp_temp sheet:opened", () => {
    getAttrs(["hp", "hp_max"], (v) => {
      const hp = parseInt(v.hp) || 0;
      const max = parseInt(v.hp_max) || 1;
      const pct = (hp / max) * 100;
      const flags = { triage_g: 0, triage_y: 0, triage_o: 0, triage_r: 0, triage_b: 0 };
      let label;
      if (hp <= 0) { label = "Black"; flags.triage_b = 1; }
      else if (pct <= 25) { label = "Red"; flags.triage_r = 1; }
      else if (pct <= 50) { label = "Orange"; flags.triage_o = 1; }
      else if (pct <= 75) { label = "Yellow"; flags.triage_y = 1; }
      else { label = "Green"; flags.triage_g = 1; }
      setAttrs({ triage_label: label, ...flags });
    });
  });

  // ---- Short / Long Rest ----
  // Short: kurze Regeneration. Long: alles zurückgesetzt, HP voll.
  // Kein Chat-Output - Resets sind am Sheet selbst sichtbar.
  on("clicked:short_rest", () => {
    getAttrs(["ld_max", "brawler_max", "short_rests_remaining"], (v) => {
      const remaining = parseInt(v.short_rests_remaining) || 0;
      if (remaining <= 0) return;
      setAttrs({
        second_wind_used: 0,
        ld_current: parseInt(v.ld_max) || 0,
        brawler_current: parseInt(v.brawler_max) || 0,
        short_rests_remaining: remaining - 1,
      });
      stressHeal("short");
    });
  });

  on("clicked:long_rest", () => {
    getAttrs([
      "hp_max", "ld_max", "brawler_max",
      "hit_dice_max", "hit_dice",
      "ifak_max", "tourniquet_max", "trauma_max", "medsupply_max",
      "tech_sensors_max", "tech_seekers_max", "tech_bugs_max",
      "short_rests_max",
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
        short_rests_remaining: parseInt(v.short_rests_max) || 2,
        ds_s1: 0, ds_s2: 0, ds_s3: 0,
        ds_f1: 0, ds_f2: 0, ds_f3: 0,
      });
    });
    stressHeal("long");
  });

  // ---- Hit Dice Roll: 1d10 + CON-Mod, applied auf HP (max HP cap),    //
  // dekrementiert HD. type="action" Button damit clicked: zuverlaessig  //
  // feuert. Bei HD = 0 nur Chat-Message, keine State-Aenderung.         //
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

      const rolled = Math.floor(Math.random() * 10) + 1;
      const healed = Math.max(1, rolled + conMod);
      const newHP = Math.min(hpMax, hp + healed);
      const actualHealed = newHP - hp;
      const newHD = current - 1;

      setAttrs({ hit_dice: newHD, hp: newHP });

      startRoll(
        `&{template:check} {{title=Hit Dice}} {{who=${charName}}} {{result=+${actualHealed} HP (Wurf: ${rolled} + ${conMod} CON)}} {{note=HD ${current} -> ${newHD}. HP ${hp} -> ${newHP} / ${hpMax}.}}`,
        (r) => finishRoll(r.rollId)
      );
    });
  });

  // ---- Death Save: 1d20 mit Compendium-Regeln                        //
  // (modern-warfare-5e/rules/hit-points.md "Death Saving Throws").     //
  //   10+ -> Success                                                   //
  //   <10 -> Failure                                                   //
  //   Nat 20 -> +1 HP, Death Saves cleared, aufgewacht                 //
  //   Nat 1 -> 2 Failures                                              //
  //   3 Successes -> stabil (kein weiterer Save noetig)                //
  //   3 Failures -> tot (HP=0, Triage Black via auto-calc)             //
  on("clicked:roll_death_save", () => {
    getAttrs([
      "ds_s1", "ds_s2", "ds_s3", "ds_f1", "ds_f2", "ds_f3",
      "character_name",
    ], (v) => {
      const charName = v.character_name || "Operator";
      const sCount = ["ds_s1", "ds_s2", "ds_s3"].reduce((n, k) => n + (v[k] == "1" ? 1 : 0), 0);
      const fCount = ["ds_f1", "ds_f2", "ds_f3"].reduce((n, k) => n + (v[k] == "1" ? 1 : 0), 0);

      if (sCount >= 3 || fCount >= 3) {
        startRoll(
          `&{template:check} {{title=Death Save - bereits ${sCount >= 3 ? "stabil" : "tot"}}} {{who=${charName}}} {{result=Kein Save noetig}}`,
          (r) => finishRoll(r.rollId)
        );
        return;
      }

      const roll = Math.floor(Math.random() * 20) + 1;
      let newS = sCount;
      let newF = fCount;
      const updates = {};
      let result;
      let note = "";

      if (roll === 20) {
        newS = 0;
        newF = 0;
        updates.hp = 1;
        result = `Nat 20 - aufwachen mit 1 HP, Death Saves cleared`;
      } else if (roll === 1) {
        newF = Math.min(3, fCount + 2);
        result = `Nat 1 - 2 Failures (${fCount} -> ${newF})`;
      } else if (roll >= 10) {
        newS = Math.min(3, sCount + 1);
        result = `Success (${sCount} -> ${newS})`;
      } else {
        newF = Math.min(3, fCount + 1);
        result = `Failure (${fCount} -> ${newF})`;
      }

      updates.ds_s1 = newS >= 1 ? 1 : 0;
      updates.ds_s2 = newS >= 2 ? 1 : 0;
      updates.ds_s3 = newS >= 3 ? 1 : 0;
      updates.ds_f1 = newF >= 1 ? 1 : 0;
      updates.ds_f2 = newF >= 2 ? 1 : 0;
      updates.ds_f3 = newF >= 3 ? 1 : 0;

      if (newS >= 3) note = "STABIL - kein weiterer Save. 1d4h dann +1 HP, dann Triage Red.";
      else if (newF >= 3) note = "TOT - Triage Black.";

      setAttrs(updates);

      startRoll(
        `&{template:check} {{title=Death Save}} {{who=${charName}}} {{result=Wurf [[${roll}]] - ${result}}}${note ? ` {{note=${note}}}` : ""}`,
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

