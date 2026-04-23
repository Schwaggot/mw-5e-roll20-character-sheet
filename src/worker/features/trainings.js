  // ---- Training Programs Auto-Apply ----
  // Non-combat training tracks (Physical/Mental Fitness, Awareness, Covert,
  // Tactical, Armor). Combat trainings live in weapons-combat.js.
  //
  // Auto-applied here:
  //   - Ability bumps (Weight/Agility/Fortitude/Education/Resolve/Social):
  //     delta-rollback onto the base score attribute.
  //   - Cardio speed bonus (L2 +5 ft, L4 +10 ft total): delta-rollback onto `speed`.
  //   - Cardio L1 -> Athletics training level 1.
  //   - Covert Movement L1 -> Stealth training level 1.
  //   - Repeating Phys/Ment Saves + Skills rows: aggregated via max per
  //     save/skill into save_X_train_level / skill_X_train_level (hidden
  //     attrs). skills.js consumes those via effectiveLevel = max(manual,
  //     train).
  //
  // NOT auto-applied (documented via tooltip in features.html): all
  // trigger-based / situational / conditional-on-armor effects.

  const ABILITY_BUMP_MAP = {
    train_weight:    "strength",
    train_agility:   "dexterity",
    train_fortitude: "constitution",
    train_education: "intelligence",
    train_resolve:   "wisdom",
    train_social:    "charisma",
  };

  // Ability bump: delta = new_level - applied, apply to base score.
  Object.keys(ABILITY_BUMP_MAP).forEach((trainAttr) => {
    const appliedAttr = `${trainAttr}_applied`;
    const scoreAttr   = ABILITY_BUMP_MAP[trainAttr];
    on(`change:${trainAttr}`, () => {
      getAttrs([trainAttr, appliedAttr, scoreAttr], (v) => {
        const lvl     = Math.max(0, Math.min(4, parseInt(v[trainAttr]) || 0));
        const applied = parseInt(v[appliedAttr]) || 0;
        const delta   = lvl - applied;
        if (!delta) return;
        const score = parseInt(v[scoreAttr]) || 10;
        setAttrs({
          [scoreAttr]:   score + delta,
          [appliedAttr]: lvl,
        });
      });
    });
  });

  // Cardio speed: target bonus = 0 (L<2), 5 (L2-3), 10 (L4).
  function cardioSpeedBonus(lvl) {
    if (lvl >= 4) return 10;
    if (lvl >= 2) return 5;
    return 0;
  }

  on("change:train_cardio", () => {
    getAttrs(["train_cardio", "train_cardio_speed_applied", "speed"], (v) => {
      const lvl     = Math.max(0, Math.min(4, parseInt(v.train_cardio) || 0));
      const target  = cardioSpeedBonus(lvl);
      const applied = parseInt(v.train_cardio_speed_applied) || 0;
      const delta   = target - applied;
      const upd = {};
      if (delta) {
        const speed = parseInt(v.speed) || 30;
        upd.speed = speed + delta;
        upd.train_cardio_speed_applied = target;
      }
      setAttrs(upd);
      recalcSkillTrainLevels();
    });
  });

  on("change:train_covert_movement", () => {
    recalcSkillTrainLevels();
  });

  // ---- Aggregation of per-save / per-skill train levels ----
  // For each save/skill, take the max level across:
  //   - all repeating rows that selected it
  //   - Cardio L1 (contributes 1 to Athletics)
  //   - Covert Movement L1 (contributes 1 to Stealth)
  const SAVE_KEYS  = ["str", "dex", "con", "int", "wis", "cha"];
  const SKILL_KEYS = [
    "acrobatics", "animal", "athletics", "deception", "history", "insight",
    "intimidation", "investigation", "medicine", "nature", "perception",
    "performance", "persuasion", "science", "sleight", "stealth", "survival",
    "technology",
  ];

  function emptyMap(keys) {
    const m = {};
    keys.forEach((k) => { m[k] = 0; });
    return m;
  }

  function bumpMax(map, key, lvl) {
    if (!key || !(key in map)) return;
    if (lvl > map[key]) map[key] = lvl;
  }

  // Collect repeating rows for one section and bump the given map.
  function collectRows(section, keyAttr, lvlAttr, maxLvl, mapCb, done) {
    getSectionIDs(`repeating_${section}`, (ids) => {
      if (!ids.length) { done(); return; }
      const attrs = [];
      ids.forEach((id) => {
        attrs.push(`repeating_${section}_${id}_${keyAttr}`);
        attrs.push(`repeating_${section}_${id}_${lvlAttr}`);
      });
      getAttrs(attrs, (v) => {
        ids.forEach((id) => {
          const key = (v[`repeating_${section}_${id}_${keyAttr}`] || "").toLowerCase();
          const lvl = Math.max(0, Math.min(maxLvl, parseInt(v[`repeating_${section}_${id}_${lvlAttr}`]) || 0));
          mapCb(key, lvl);
        });
        done();
      });
    });
  }

  function recalcSaveTrainLevels() {
    const map = emptyMap(SAVE_KEYS);
    let pending = 2;
    const done = () => {
      pending -= 1;
      if (pending > 0) return;
      const upd = {};
      SAVE_KEYS.forEach((k) => { upd[`save_${k}_train_level`] = map[k]; });
      setAttrs(upd);
    };
    collectRows("phys_saves", "ptsave", "ptslvl", 4, (k, l) => bumpMax(map, k, l), done);
    collectRows("ment_saves", "mtsave", "mtslvl", 4, (k, l) => bumpMax(map, k, l), done);
  }

  function recalcSkillTrainLevels() {
    const map = emptyMap(SKILL_KEYS);
    let pending = 2;
    const finalize = () => {
      getAttrs(["train_cardio", "train_covert_movement"], (v) => {
        if ((parseInt(v.train_cardio) || 0) >= 1)          bumpMax(map, "athletics", 1);
        if ((parseInt(v.train_covert_movement) || 0) >= 1) bumpMax(map, "stealth",   1);
        const upd = {};
        SKILL_KEYS.forEach((k) => { upd[`skill_${k}_train_level`] = map[k]; });
        setAttrs(upd);
      });
    };
    const done = () => {
      pending -= 1;
      if (pending === 0) finalize();
    };
    collectRows("phys_skills", "ptskill", "ptlvl", 5, (k, l) => bumpMax(map, k, l), done);
    collectRows("ment_skills", "mtskill", "mtlvl", 5, (k, l) => bumpMax(map, k, l), done);
  }

  // Listeners for every repeating-row input.
  [
    "change:repeating_phys_saves:ptsave",
    "change:repeating_phys_saves:ptslvl",
    "remove:repeating_phys_saves",
    "change:repeating_ment_saves:mtsave",
    "change:repeating_ment_saves:mtslvl",
    "remove:repeating_ment_saves",
  ].forEach((evt) => on(evt, recalcSaveTrainLevels));

  [
    "change:repeating_phys_skills:ptskill",
    "change:repeating_phys_skills:ptlvl",
    "remove:repeating_phys_skills",
    "change:repeating_ment_skills:mtskill",
    "change:repeating_ment_skills:mtlvl",
    "remove:repeating_ment_skills",
  ].forEach((evt) => on(evt, recalcSkillTrainLevels));

  on("sheet:opened", () => {
    recalcSaveTrainLevels();
    recalcSkillTrainLevels();
  });
