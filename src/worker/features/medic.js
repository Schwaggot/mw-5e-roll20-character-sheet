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

