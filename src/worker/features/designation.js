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

