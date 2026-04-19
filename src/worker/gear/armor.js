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

    // Torso - Covert (Concealable)
    cov_iia:         { name: "Concealable Vest (IIA)",         ac: "11 + Dex",          coverage: "Chest, Back",                              resist: "IIA · Piercing",                     stealth: "",             weight: "1.5 kg" },
    cov_iiia:        { name: "Concealable Vest (IIIA)",        ac: "12 + Dex",          coverage: "Chest, Back",                              resist: "IIIA · Piercing, Slashing",          stealth: "",             weight: "2.5 kg" },
    cov_safariland:  { name: "Safariland SX01 Elite",          ac: "12 + Dex",          coverage: "Chest, Back",                              resist: "IIIA · Piercing, Slashing",          stealth: "",             weight: "2.2 kg" },
    cov_pointblank:  { name: "Point Blank Vision",             ac: "12 + Dex",          coverage: "Chest, Back",                              resist: "IIIA · Piercing, Slashing",          stealth: "",             weight: "2.3 kg" },

    // Plate Carriers (named)
    pc_crye_jpc:     { name: "Crye JPC",                       ac: "12 + Dex",          coverage: "Torso (Front/Back pockets)",               resist: "Piercing, Slashing",                 stealth: "",             weight: "5.0 kg" },
    pc_crye_avs:     { name: "Crye AVS",                       ac: "13 + Dex (max 3)",  coverage: "Torso + Sides (F/B + Side x2 pockets)",    resist: "IIIA · Piercing, Slashing",          stealth: "",             weight: "7.0 kg" },
    pc_lbt6094:      { name: "LBT-6094",                       ac: "13 + Dex (max 3)",  coverage: "Torso + Sides (F/B + Side x2 pockets)",    resist: "IIIA · Piercing, Slashing",          stealth: "",             weight: "7.5 kg" },
    pc_eagle_ciras:  { name: "Eagle CIRAS",                    ac: "13 + Dex (max 3)",  coverage: "Torso + Sides (F/B + Side x2 pockets)",    resist: "IIIA · Piercing, Slashing",          stealth: "",             weight: "8.0 kg" },

    // Torso Plates (rifle plates, slot into carriers/vests)
    pl_steel_iii:    { name: "Steel Plate (III)",              ac: "-",                 coverage: "2 DR vs covered side",                     resist: "III · 7.62x51 FMJ, standard rifle",  stealth: "",             weight: "4.0 kg" },
    pl_steel_iiip:   { name: "Steel Plate (III+)",             ac: "-",                 coverage: "2 DR vs covered side",                     resist: "III+ · + 5.56 M855, 7.62x39 MSC",    stealth: "",             weight: "4.5 kg" },
    pl_ceramic_sapi: { name: "Ceramic SAPI (III)",             ac: "-",                 coverage: "2 DR vs covered side",                     resist: "III · 7.62x51 FMJ, standard rifle",  stealth: "",             weight: "2.5 kg" },
    pl_ceramic_esapi:{ name: "Ceramic ESAPI (IV)",             ac: "-",                 coverage: "3 DR vs covered side",                     resist: "IV · .30-06 AP, most rifle AP",      stealth: "",             weight: "2.8 kg" },
    pl_poly_iii:     { name: "Polyethylene Plate (III)",       ac: "-",                 coverage: "2 DR vs covered side",                     resist: "III · 7.62x51 FMJ, standard rifle",  stealth: "",             weight: "1.5 kg" },
    pl_poly_iiip:    { name: "Polyethylene Plate (III+)",      ac: "-",                 coverage: "2 DR vs covered side",                     resist: "III+ · + 5.56 M855, 7.62x39 MSC",    stealth: "",             weight: "1.8 kg" },

    // Positional Plates (default: Ceramic SAPI III)
    pp_side:         { name: "Side Plate",                     ac: "-",                 coverage: "2 DR vs flank (under arm)",                resist: "III · rifle, covered flank only",    stealth: "",             weight: "1.5 kg" },
    pp_shoulder:     { name: "Shoulder Plate",                 ac: "-",                 coverage: "2 DR vs rear torso",                       resist: "III · rifle, rear torso only",       stealth: "",             weight: "0.5 kg" },
    pp_legs:         { name: "Leg Plates (pair)",              ac: "-",                 coverage: "2 DR vs torso/groin (pair)",               resist: "III · rifle, upper legs/groin",      stealth: "",             weight: "3.0 kg" },
    pp_throat:       { name: "Throat Plate",                   ac: "-",                 coverage: "2 DR vs neck",                             resist: "III · rifle, neck only",             stealth: "",             weight: "0.3 kg" },
    pp_groin_hard:   { name: "Groin Plate (hard)",             ac: "-",                 coverage: "2 DR vs groin",                            resist: "III · rifle, groin only",            stealth: "",             weight: "0.5 kg" },

    // Helmets
    helm_bump:       { name: "Bump Helmet (Ops-Core)",         ac: "+1",                coverage: "Kopf",                                     resist: "Bludgeoning, Slashing",              stealth: "",             weight: "0.6 kg" },
    helm_pasgt:      { name: "PASGT",                          ac: "+1 (-2 Perception)",coverage: "Kopf",                                     resist: "IIIA · Piercing, Slashing, Bludgeoning",    stealth: "",      weight: "1.6 kg" },
    helm_mich:       { name: "MICH / ACH",                     ac: "+1 (-1 Perception)",coverage: "Kopf",                                     resist: "IIIA · Piercing, Slashing, Bludgeoning",    stealth: "",      weight: "1.5 kg" },
    helm_fast:       { name: "Ops-Core FAST Ballistic",        ac: "+1",                coverage: "Kopf",                                     resist: "IIIA · Piercing, Slashing, Bludgeoning",    stealth: "",      weight: "1.3 kg" },
    helm_wendy:      { name: "Team Wendy Exfil Ballistic",     ac: "+1",                coverage: "Kopf",                                     resist: "IIIA · Piercing, Slashing, Bludgeoning",    stealth: "",      weight: "1.3 kg" },
    helm_airframe:   { name: "Crye AirFrame",                  ac: "+1",                coverage: "Kopf",                                     resist: "IIIA · Piercing, Slashing, Bludgeoning",    stealth: "",      weight: "1.2 kg" },

    // Helmet Add-ons
    ha_mandible:     { name: "Mandible (Ops-Core)",            ac: "+1 vs face (-1 Perception)", coverage: "Gesicht (unten)",                 resist: "-",                                  stealth: "",             weight: "0.3 kg" },
    ha_faceshield:   { name: "Face Shield (Ballistic Visor)",  ac: "+1 vs face",        coverage: "Gesicht",                                  resist: "IIIA · Piercing, Slashing (face)",   stealth: "",             weight: "0.5 kg" },
    ha_cover:        { name: "Helmet Cover (Camo)",            ac: "-",                 coverage: "Kopf (Tarnung)",                           resist: "-",                                  stealth: "camo-<terrain> tag", weight: "0.1 kg" },

    // Soft Armor Add-ons
    soft_daps:       { name: "DAPS (Deltoid/Axillary)",        ac: "-",                 coverage: "Shoulders, armpits",                       resist: "IIIA · Piercing, Slashing (arms)",   stealth: "",             weight: "1.5 kg" },
    soft_throat:     { name: "Throat Protector (soft)",        ac: "+1 vs neck",        coverage: "Neck",                                     resist: "IIIA",                               stealth: "",             weight: "0.3 kg" },
    soft_groin:      { name: "Groin Protector (soft)",         ac: "+1 vs groin",       coverage: "Groin",                                    resist: "IIIA",                               stealth: "",             weight: "0.5 kg" },
    soft_cummerbund: { name: "Cummerbund (soft)",              ac: "-",                 coverage: "Flanks (w/ plate carrier)",                resist: "IIIA · Piercing, Slashing (flanks)", stealth: "",             weight: "0.5 kg" },

    // Ballistic Shields
    shld_iiia:       { name: "Ballistic Shield (IIIA)",        ac: "+3 vs covered side",coverage: "Hand-held, covered side",                  resist: "IIIA · one-handed weapons only",     stealth: "",             weight: "6 kg" },
    shld_iiip:       { name: "Ballistic Shield (III+)",        ac: "+4 vs covered side",coverage: "Hand-held, covered side (-10 ft)",         resist: "III+ · one-handed weapons only",     stealth: "",             weight: "10 kg" },
    shld_breacher:   { name: "Breacher Shield (viewport + light)", ac: "+4 vs covered side", coverage: "Hand-held, viewport + white light",   resist: "III+ · one-handed weapons only",     stealth: "",             weight: "11 kg" },
    shld_blanket:    { name: "Ballistic Blanket",              ac: "-",                 coverage: "Deployed: half/full cover for adj. prone", resist: "IIIA · no AC to wielder",            stealth: "",             weight: "7 kg" },
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

