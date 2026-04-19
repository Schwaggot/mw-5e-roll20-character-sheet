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

      // Fire Modes: S/B/A Sichtbarkeit steuern (jetzt immer explizit im Preset)
      const modes = (p.modes || "s").toLowerCase();
      upd[`${rowPrefix}_wmode_s`] = modes.includes("s") ? "1" : "0";
      upd[`${rowPrefix}_wmode_b`] = modes.includes("b") ? "1" : "0";
      upd[`${rowPrefix}_wmode_a`] = modes.includes("a") ? "1" : "0";

      Object.assign(upd, buildPropPillUpdates(rowPrefix, p.properties));
      setAttrs(upd);
    });
  });

