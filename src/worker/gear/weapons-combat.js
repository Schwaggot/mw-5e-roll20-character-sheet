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

        // Two-step flow: bake the full damage rolltemplate (with
        // [[...]] inline rolls intact so they re-roll on each click)
        // into the GLOBAL last_damage_full attr. The chat link targets
        // the single global last_damage link (targets roll_last_damage button). No repeating row
        // id in the macro call -> no Roll20 macro-parser strip issues.
        const modeLabel = `Unarmed (${abilLabel})`;
        const dmgFull =
          `&{template:damage} {{title=Unarmed Strike}} {{who=${charName}}} ` +
          `{{mode=${modeLabel}}} {{damage=[[${damageFormula}]]}}`;
        setAttrs({ last_damage_full: dmgFull });
        const damageLink = `[Schaden würfeln](~@{character_id}|last_damage)`;
        startRoll(
          `&{template:attack} ` +
          `{{title=Unarmed Strike}} ` +
          `{{mode=${modeLabel}}} ` +
          `{{attack=[[${d20} + ${atkBonus}]]}} ` +
          `{{damage_link=${damageLink}}} ` +
          `{{who=${charName}}} ` +
          `{{note=${note}}}`,
          (r) => finishRoll(r.rollId)
        );
      }
    );
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

      // Two-step flow: damage link targets the global last_damage (calls roll_last_damage button)
      // button (see src/sheet.html). Hidden unless the weapon misfired
      // (misfire_yes = weapon damaged, no shot).
      const zoneNote = zoneKey !== "torso" ? `${zone.label}: ${zone.effect}` : "";
      const damageLink = (misfireKey !== "misfire_yes")
        ? `[Schaden würfeln](~@{character_id}|last_damage)`
        : "";
      const dmgFull =
        `&{template:damage} {{title=${wname}}} {{who=${charName}}} ` +
        `{{mode=${cfg.mode}}} {{damage=[[${damageFormula}]]}}` +
        (critNote ? ` {{crit_note=${critNote}}}` : "") +
        (zoneNote ? ` {{zone_note=${zoneNote}}}` : "");

      let rollText = `&{template:attack} ` +
        `{{title=${wname}}} ` +
        (wcaliber ? `{{caliber=${wcaliber}}} ` : "") +
        `{{mode=${cfg.mode}}} ` +
        `{{attack=[[${d20} + ${totalModifier}]]}} ` +
        `{{misfire_label=${misfireLabel}}} ` +
        `{{crit_label=${critLabel}}} ` +
        `{{${misfireKey}=1}} ` +
        `{{${critKey}=1}} ` +
        (damageLink ? `{{damage_link=${damageLink}}} ` : "") +
        (modeKey === "wauto" ? `{{burst_size=${ammoUsed}}} ` : "") +
        `{{recoil_pen=-${penalty}}} ` +
        (zoneKey !== "torso" ? `{{zone=${zone.label} (-${zone.pen})}} {{zone_effect=${zone.effect}}} ` : "") +
        (misfireKey === "misfire_yes" ? `{{misfire_d100=[[${d100}]]}} ` : "") +
        `{{ammo=${ammoDisplay}}} ` +
        ((critNote || modsInfo) ? `{{note=${critNote}${modsInfo}}} ` : "") +
        `{{who=${charName}}}`;

      startRoll(rollText, (results) => {
        const setUpd = {
          [`${rowPrefix}_wammo`]: ammoAfter,
          last_damage_full: dmgFull,
        };
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

      const damageLink = `[Schaden würfeln](~@{character_id}|last_damage)`;
      const dmgFull =
        `&{template:damage} {{title=${wname}}} {{who=${charName}}} ` +
        `{{mode=${modeLabel}}} {{damage=[[${damageFormula}]]}}`;
      const rollText = `&{template:attack} ` +
        `{{title=${wname}}} ` +
        `{{mode=${modeLabel}}} ` +
        `{{attack=[[${d20} + ${effAtkBonus}]]}} ` +
        `{{damage_link=${damageLink}}} ` +
        `{{who=${charName}}} ` +
        `{{note=${note}}}`;

      startRoll(rollText, (r) => {
        setAttrs({ last_damage_full: dmgFull });
        finishRoll(r.rollId);
      });
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

      // Two-step: one damage link on the spray card. User clicks it once
      // per target that hits (per GM adjudication). Each click re-rolls
      // damage from the stored formula, so fresh dice each time.
      const baseDmg = `${dmgDice} + ${effDmgBonus}`;
      const dmgFormula = hasSuppressor ? `${baseDmg} - 1d4` : baseDmg;
      const zoneNote = zoneKey !== "torso" ? `${zone.label}: ${zone.effect}` : "";
      const spCritNote = headShotMultiplier > 1 ? `Kopfschuss: alle Dice x${headShotMultiplier}` : "";
      const dmgFull =
        `&{template:damage} {{title=${wname}}} {{who=${charName}}} ` +
        `{{mode=${modeLabel}}} {{damage=[[${dmgFormula}]]}}` +
        (spCritNote ? ` {{crit_note=${spCritNote}}}` : "") +
        (zoneNote ? ` {{zone_note=${zoneNote}}}` : "");
      const damageLink = `[Schaden würfeln (pro Hit)](~@{character_id}|last_damage)`;

      let rollText = `&{template:spray} ` +
        `{{title=${wname}}} ` +
        `{{mode=${modeLabel}}} ` +
        `{{who=${charName}}} ` +
        `{{ammo=${ammoDisplay}}} ` +
        `{{damage_link=${damageLink}}} ` +
        `{{note=${noteText}}}`;

      for (let i = 0; i < targets; i++) {
        const targetPen = i * autoTargetPen;
        const atkDie = shakenDisadv ? "2d20kl1" : "1d20";
        const atkFormula = `${atkDie} + ${effAttack} - ${penalty} - ${zone.pen} - ${targetPen}`;
        rollText += ` {{t${i+1}_atk=[[${atkFormula}]]}}`;
      }

      startRoll(rollText, (results) => {
        setAttrs({
          [`${rowPrefix}_wammo`]: ammoAfter,
          last_damage_full: dmgFull,
        });
        finishRoll(results.rollId);
      });
    });
  }

  on("clicked:repeating_weapons:wspray",  (info) => sprayRiddle(info, "spray"));
  on("clicked:repeating_weapons:wriddle", (info) => sprayRiddle(info, "riddle"));

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

