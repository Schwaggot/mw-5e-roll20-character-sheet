  // ---- Inventory Presets ----
  const GEAR_PRESETS = {
    // Standard Issue
    rucksack:       { name: "Main Rucksack",               qty: 1, weight: "",       notes: "Standard Issue" },
    daypack:        { name: "Day Pack",                    qty: 1, weight: "",       notes: "Standard Issue" },
    sleepbag_light: { name: "Light Sleeping Bag",          qty: 1, weight: "",       notes: "Standard Issue, Plus-Temperaturen" },
    sleepbag_heavy: { name: "Heavy Sleeping Bag",          qty: 1, weight: "",       notes: "Standard Issue, kalte Umgebung" },
    lbs_vest:       { name: "Load-Bearing Vest",           qty: 1, weight: "",       notes: "Tool-Proficiency (Rifleman)" },
    camelbak:       { name: "CamelBak 2L",                 qty: 1, weight: "",       notes: "Wasser-Blase" },
    isomat:         { name: "Iso-mat",                     qty: 1, weight: "",       notes: "Isolierte Schlaf-Unterlage" },
    tarp:           { name: "Camo Tarpaulin 10x10 ft",     qty: 1, weight: "",       notes: "Tarnung / Shelter" },
    paracord:       { name: "100 ft Paracord (550)",       qty: 1, weight: "",       notes: "Reissfest bis 250 kg" },
    canteen:        { name: "Canteen 1L",                  qty: 4, weight: "",       notes: "Standard 4 pro Operator" },
    canteen_cup:    { name: "Canteen Cup",                 qty: 1, weight: "",       notes: "Metall-Trinkbecher" },
    messkit:        { name: "Mess Kit",                    qty: 1, weight: "",       notes: "Kochgeschirr, Field-Mess-Proficiency" },
    combat_knife:   { name: "Combat Knife",                qty: 1, weight: "",       notes: "Melee 1d4 Slashing, CQC" },
    bayonet:        { name: "Bayonet",                     qty: 1, weight: "",       notes: "An Rifle montiert, 1d4 Piercing" },

    // Class Tools
    ghillie:        { name: "Ghillie Suit",                qty: 1, weight: "",       notes: "Marksman: +5 Stealth (+10 mit Stalker), >1000ft invisible" },
    spotscope:      { name: "Spotting Scope",              qty: 1, weight: "",       notes: "Marksman Tool-Proficiency" },
    te_tool:        { name: "T&E Tool",                    qty: 1, weight: "",       notes: "Machine Gunner Tool-Proficiency, MG-Einrichtung" },
    demo_tools:     { name: "Demolitions Tools",           qty: 1, weight: "",       notes: "Demolitionist Tool-Proficiency" },
    handler_tools:  { name: "Handler's Tools",             qty: 1, weight: "",       notes: "Dog Handler Tool-Proficiency" },
    b1ard:          { name: "B1ARD Kit",                   qty: 1, weight: "",       notes: "Tech Specialist Drohnen-Tool-Proficiency" },
    drone_repair:   { name: "Drone Repair Kit",            qty: 1, weight: "",       notes: "Tech Specialist: DC 15 Int-Check zum Reparieren/Upgraden" },
    decon_kit:      { name: "Decontamination Kit",         qty: 1, weight: "",       notes: "Combat Medic Tool-Proficiency" },
    terrain_map:    { name: "Terrain Map Tools",           qty: 1, weight: "",       notes: "Unit Leader Tool-Proficiency" },

    // Comms
    uhf_radio:      { name: "UHF Radio",                   qty: 1, weight: "",       notes: "Standard Military Funk" },
    sat_radio:      { name: "Satellite Radio",             qty: 1, weight: "",       notes: "Long-Range via Satellit" },
    crypto_key:     { name: "Crypto Key",                  qty: 1, weight: "",       notes: "Radio Ops Training L2, verschlüsselter Funk" },

    // Medical (Corpsman Supply)
    morphine:       { name: "Morphine",                    qty: 1, weight: "",       notes: "Heal 6d6 HP jede Triage-Stufe; Con-Save DC=HP oder bewusstlos. 3+ Uses/24h kann Sucht auslösen" },
    quickclot:      { name: "Quick Clot",                  qty: 1, weight: "",       notes: "Stoppt Bleed/Major Bleed. Con-Save DC 15 oder bewusstlos" },
    narcotics:      { name: "Narcotics",                   qty: 1, weight: "",       notes: "1d6 HP + 1d6 für 3 weitere Runden. 4+ Uses/24h = Suchtrisiko" },
    iv_500:         { name: "I.V. 500cc",                  qty: 1, weight: "",       notes: "1 Min Setup, 5 Min Admin. Regain 1 HP alle 2 Rd. Nur Green/Yellow/Orange" },
    liquid_skin:    { name: "Liquid Skin Patch",           qty: 1, weight: "",       notes: "Heal 2d6 HP. Nur Orange/Red Triage" },
    epi:            { name: "Epinephrine",                 qty: 1, weight: "",       notes: "Auf 0-HP-Ziel innerhalb 3 Rd: regain 6d4 HP. 1x/Tag sicher, sonst Con-Save" },
    combat_pills:   { name: "Combat Pill Pack",            qty: 1, weight: "",       notes: "Nach 24h: Adv. auf Disease/Poison-Checks für 48h" },
    diazepam:       { name: "5 Days Diazepam",             qty: 1, weight: "",       notes: "Nach 5 Tagen Einnahme: 1 Stufe Shaken weniger" },
  };

  on("change:repeating_gear:ipreset", (info) => {
    const src = (info && info.sourceAttribute) || "";
    const match = /^(repeating_gear_[^_]+)_/i.exec(src);
    if (!match) return;
    const rowPrefix = match[1];
    getAttrs([src], (v) => {
      const key = v[src];
      if (!key || key === "custom") return;
      const p = GEAR_PRESETS[key];
      if (!p) return;
      setAttrs({
        [`${rowPrefix}_iname`]:   p.name,
        [`${rowPrefix}_iqty`]:    p.qty,
        [`${rowPrefix}_iweight`]: p.weight,
        [`${rowPrefix}_inotes`]:  p.notes,
      });
    });
  });

