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

