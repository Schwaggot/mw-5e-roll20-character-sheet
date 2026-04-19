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

