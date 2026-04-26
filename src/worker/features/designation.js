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

  // ---- Level-Clamp: nie kleiner als 1, nie groesser als 20 ----
  // Worker-seitige Absicherung zusaetzlich zum HTML min/max der Input.
  on("change:level", () => {
    getAttrs(["level"], (v) => {
      const raw = parseInt(v.level);
      const clamped = isNaN(raw) ? 1 : Math.max(1, Math.min(20, raw));
      if (String(clamped) !== String(v.level)) {
        setAttrs({ level: String(clamped) });
      }
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
  // KEINE Stat-Aenderungen - nur UI-Sektionen werden ein-/ausgeblendet.
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

  // ---- Combat Designation -> Abilities (auto-managed reminder rows) ----
  // Pro Designation eine Liste von Ability-Karten (Tools, aktive/situative
  // Features pro Level-Gate, plus alle drei 10th-Spezialisierungs-Optionen).
  // Spielerentscheidet manuell welche Spec, kann nicht relevante Karten
  // loeschen - bei Wechsel der Designation werden ohnehin alle ersetzt.
  // Beim Wechsel werden alle repeating_abilities-Zeilen mit
  // source = "combat_designation" entfernt und durch die neuen ersetzt.
  // Manuelle und Personality-Trait-Zeilen bleiben unangetastet.
  //
  // Numerische Boni (Saves-Training, Skill-Training, Weapon-Profs) sind
  // bewusst NICHT als Karten enthalten - die werden manuell gepflegt.
  // Unit-Leader-Orders haben eine eigene UI mit Leadership-Dice-Tracking
  // und werden hier ebenfalls nicht dupliziert.
  // Pro Eintrag: lvl = Mindest-Operator-Level fuer die Karte. Bei Wechsel
  // der Designation oder bei Level-Aenderung werden die Karten gefiltert
  // (lvl <= Charakter-Level) und neu eingespielt.
  const DESIGNATION_ABILITIES = {
    "Rifleman": [
      { lvl: 3,  name: "Combat Designation - Rifleman: LBS Kit (Tool)",
        desc: "Load-Bearing System: modular MOLLE vest, chest rig, mag/grenade/radio/IFAK pouches. Proficiency covers load distribution, rapid mag changes, retention under stress, mission-profile config." },
      { lvl: 3,  name: "Combat Designation - Rifleman: Jack of All (Lvl 3)",
        desc: "Re-roll a single skill check. Uses per long rest = INT modifier + Proficiency bonus." },
      { lvl: 7,  name: "Combat Designation - Rifleman: Close with and Destroy (Lvl 7)",
        desc: "When you attack with an Assault Rifle, use a bonus action for one extra AR attack that turn. Assault Rifles gain the CQC property for you." },
      { lvl: 10, name: "Combat Designation - Rifleman: Assaulter (Lvl 10 Spec)",
        desc: "+2 to attack and damage with Assault Rifles. Roll AR damage dice twice and use the higher roll." },
      { lvl: 10, name: "Combat Designation - Rifleman: Breacher (Lvl 10 Spec)",
        desc: "Shotguns and pistols gain the CQC property for you. Advantage on the first attack after entering a room/breached doorway. Ignore half cover vs targets within 10 ft." },
      { lvl: 10, name: "Combat Designation - Rifleman: Grenadier (Lvl 10 Spec)",
        desc: "When you take the Attack action, fire a grenade launcher (incl. underbarrel) as a bonus action. Grenade scatter radius halved (min 5 ft). Stow one extra 40mm round in the LBS Kit." },
      { lvl: 15, name: "Combat Designation - Rifleman: Weathered Vet (Lvl 15)",
        desc: "Resistance to all damage types except Chemical, Poison, and Radiation." },
      { lvl: 18, name: "Combat Designation - Rifleman: Raider (Lvl 18)",
        desc: "Base speed +5 ft. Standing from prone costs only 5 ft. Advantage on DEX/STR checks and saves. 1x per long rest, free action: gain the haste effect for CON-mod turns." },
    ],

    "Machine Gunner": [
      { lvl: 3,  name: "Combat Designation - Machine Gunner: T&E Kit (Tool)",
        desc: "Traverse & Elevation mechanism (dial-and-scale on tripod). Proficiency covers preplotting fire sectors, range cards, sustained/indirect fire, beaten zones, and night fire." },
      { lvl: 3,  name: "Combat Designation - Machine Gunner: Die Fuzzy Bunny, Die (Lvl 3)",
        desc: "When firing automatic weapons, fire max rounds per burst and re-roll any damage 1s and 2s." },
      { lvl: 7,  name: "Combat Designation - Machine Gunner: Beating Zone (Lvl 7)",
        desc: "Action with SAW/GPM/Heavy MG: nominate a cube. Each target makes a DEX save (fail full, save half). Cube/DC scale with range: x1=10ft DC 14+DEX+Prof, x2=15ft DC 12, x3=20ft DC 10, x4=25ft DC 8. Targets gain advantage if you had disadvantage on attack rolls this turn." },
      { lvl: 10, name: "Combat Designation - Machine Gunner: Suppressor (Lvl 10 Spec)",
        desc: "Use Suppressive Fire as a bonus action with a machine gun, on up to (DEX mod x 2) creatures." },
      { lvl: 10, name: "Combat Designation - Machine Gunner: Gun Hand (Lvl 10 Spec)",
        desc: "Each consecutive round firing automatic at the same 10-ft area, add +1 damage die to the first hit (max = Proficiency bonus). Resets if you stop or shift target. No disadvantage from bipod/tripod fire." },
      { lvl: 15, name: "Combat Designation - Machine Gunner: Machine Gun Expert (Lvl 15)",
        desc: "Ignore a number of Critical Failures equal to your WIS modifier." },
      { lvl: 18, name: "Combat Designation - Machine Gunner: Master Gunner (Lvl 18)",
        desc: "When rolling machine gun damage, each maxed die adds +1 damage die." },
    ],

    "Marksman": [
      { lvl: 3,  name: "Combat Designation - Marksman: Observation Kit (Tool)",
        desc: "Spotting scope, rifle optic, laser rangefinder, wind meter, DOPE book / range card. Proficiency covers wind/mirage reading, calling corrections, ranging, and logging come-ups/holds." },
      { lvl: 3,  name: "Combat Designation - Marksman: Critical Shot (Lvl 3)",
        desc: "Action: fire one shot from a Single Shot or Bolt Action rifle; on hit it counts as a critical. If you actually rolled a crit, triple the damage dice." },
      { lvl: 7,  name: "Combat Designation - Marksman: Stalker (Lvl 7)",
        desc: "When using a ghillie suit in an appropriate environment, gain +10 to Stealth (instead of +5). Beyond 500 ft you are considered invisible." },
      { lvl: 10, name: "Combat Designation - Marksman: Sharpshooter (Lvl 10 Spec)",
        desc: "On Critical Shot damage, target makes CON save (DC = damage rolled): fail = reduced to 0 HP; pass = normal damage. Uses per long rest = WIS modifier." },
      { lvl: 10, name: "Combat Designation - Marksman: Pathfinder (Lvl 10 Spec)",
        desc: "Movement is unaffected by difficult terrain. Once per encounter, if you scouted ahead, allies within 60 ft gain advantage on initiative. Spot hidden/concealed creatures at double normal range." },
      { lvl: 10, name: "Combat Designation - Marksman: Counter-Sniper (Lvl 10 Spec)",
        desc: "Reaction when a creature you see makes a ranged attack within your weapon's normal range: make 1 ranged attack against it. Advantage on Perception to detect concealed shooters, camouflaged positions, and muzzle flashes." },
      { lvl: 15, name: "Combat Designation - Marksman: Master Stalker (Lvl 15)",
        desc: "With a ghillie suit, +10 Stealth and you are considered invisible beyond 250 ft." },
      { lvl: 18, name: "Combat Designation - Marksman: Master Marksman (Lvl 18)",
        desc: "All ranged attacks gain +5 to hit and damage when using Critical Shot." },
    ],

    "Demolitions Specialist": [
      { lvl: 3,  name: "Combat Designation - Demo: Demolitions Kit (Tool)",
        desc: "Blasting caps, time fuse, det cord, crimpers, clackers, firing devices, galvanometer, firing wire, electrical tape, shaped-charge templates, EOD probes. Proficiency covers charge calc, priming, improvised/breaching charges, safe handling, render-safe procedures." },
      { lvl: 3,  name: "Combat Designation - Demo: Deadly Demolitionist (Lvl 3)",
        desc: "When rolling damage for a Rocket, Grenade, Launcher, Mine, or Raw Explosive, each maxed die adds +1 damage die (no cascading)." },
      { lvl: 7,  name: "Combat Designation - Demo: Explosive Bag (Lvl 7)",
        desc: "Carry 5 items (10 at Lvl 10) from: Bow Tie (adv +20 STR vs locks), X Charge (adv +20 STR vs doors), 5 Caps + Clacker + 500 ft wire, Remote + 2 remote caps, 0.5 kg C4, 4 ft Det Cord, Sticky Grenade." },
      { lvl: 10, name: "Combat Designation - Demo: Demolitionist (Lvl 10 Spec)",
        desc: "Resistance to force damage. Carry 10 items in Explosives Bag." },
      { lvl: 10, name: "Combat Designation - Demo: Combat Engineer (Lvl 10 Spec)",
        desc: "Advantage on detecting and disarming explosives. During a short rest, build field fortifications (5-ft squares in a 20-ft line = 3/4 cover). Deploy up to 4 items as a concealed minefield (trigger on 5-ft movement)." },
      { lvl: 10, name: "Combat Designation - Demo: AT Specialist (Lvl 10 Spec)",
        desc: "Ignore all cover short of full when using rocket launcher / AT weapons. +1 damage die vs vehicles, emplacements, and objects. Halve rocket reload time." },
      { lvl: 15, name: "Combat Designation - Demo: Rocket Expert (Lvl 15)",
        desc: "All hits with a Rocket Launcher count as critical hits." },
      { lvl: 18, name: "Combat Designation - Demo: Explosive Master (Lvl 18)",
        desc: "All Raw Explosives you set that don't fail are treated as Critical Successes." },
    ],

    "Unit Leader": [
      { lvl: 3,  name: "Combat Designation - Unit Leader: Command Kit (Tool)",
        desc: "Map case, compass, protractor, range cards, tactical radio, binoculars. Proficiency covers land navigation, grid plotting, radio net discipline / brevity codes, observation and target designation through optics." },
      { lvl: 3,  name: "Combat Designation - Unit Leader: Trained Leader (Lvl 3)",
        desc: "Learn Orders that spend Leadership Dice. Known Orders = max(1, CHA mod), +1 at 7th/10th/15th/18th. Leadership Dice = Proficiency + CHA mod, regained on short/long rest. Die size: d4 / d6@7 / d8@10 / d10@15 / d12@18. (Orders are tracked separately on the sheet.)" },
      { lvl: 7,  name: "Combat Designation - Unit Leader: Inspiring Leader (Lvl 7)",
        desc: "Inspire a creature within 30 ft, give them 1 Leadership Die. They add the roll to one ability check, attack roll, or save within 10 minutes (Bardic-Inspiration-style)." },
      { lvl: 10, name: "Combat Designation - Unit Leader: NCO (Lvl 10 Spec)",
        desc: "Double your number of Leadership Dice." },
      { lvl: 10, name: "Combat Designation - Unit Leader: Tactician (Lvl 10 Spec)",
        desc: "Once per short rest, pre-plot a maneuver before initiative: at combat start, willing allies within 60 ft move up to their speed and take the Ready action before round 1. At anticipated engagements, the GM tells you approximate enemy number, position, and armament you could have scouted." },
      { lvl: 10, name: "Combat Designation - Unit Leader: Liaison (Lvl 10 Spec)",
        desc: "Expertise in Persuasion and Deception. Spend a Leadership Die on a social check, add the roll. Before a mission you can establish contact or gather HUMINT: GM provides actionable intel on objective / area / opposition." },
      { lvl: 15, name: "Combat Designation - Unit Leader: Resourceful Leader (Lvl 15)",
        desc: "When rolling initiative with no Leadership Dice remaining, regain a number = your WIS modifier." },
      { lvl: 18, name: "Combat Designation - Unit Leader: Master Commander (Lvl 18)",
        desc: "+10 to initiative. All enemy creatures are surprised during the first round of combat." },
    ],

    "Combat Medic": [
      { lvl: 3,  name: "Combat Designation - Medic: Medic's Kit (Tool)",
        desc: "Stethoscope, BP cuff, pulse ox, penlight, thermometer, trauma shears, airways, BVM, chest decompression needle, suture kit, IV catheters, syringes. Proficiency covers patient assessment, triage, airway management, vitals, IVs, suturing, injections, evac monitoring." },
      { lvl: 3,  name: "Combat Designation - Medic: Combat Trauma Trained / Trauma Bag (Lvl 3)",
        desc: "Trauma Bag: IFAK (10 uses + 2 tourniquets) and Trauma Kit (5 uses). Expend 1 use + Medicine DC 15: heal 1d10 + WIS mod HP on a Triage Yellow/Orange/Red ally. Scales to 2d10 at Lvl 10, 3d10 at Lvl 18." },
      { lvl: 7,  name: "Combat Designation - Medic: Medical Grade Supply (Lvl 7)",
        desc: "Action: add 10 uses of one of Combat Pill Pack, Morphine, Quick Clot, Narcotics, IV 500cc, Liquid Skin Patch, Epinephrine, or 5-Day Diazepam to your Trauma Bag (each item has its own healing/effect rules)." },
      { lvl: 10, name: "Combat Designation - Medic: Trauma Specialist (Lvl 10 Spec)",
        desc: "Add Proficiency bonus to healing rolls. When you heal a creature on your turn you can Dash as a bonus action that turn." },
      { lvl: 10, name: "Combat Designation - Medic: Combat Pharmacist (Lvl 10 Spec)",
        desc: "Immune to addiction and drug-related CON penalties. Administer 2 drugs in the same turn without stacking. During a rest you may craft an improvised stim (1d6 temp HP + advantage on next save, must be used within 24 hours)." },
      { lvl: 10, name: "Combat Designation - Medic: CBRN Specialist (Lvl 10 Spec)",
        desc: "Immune to your own decontamination reagents. Advantage on poison/disease/radiation checks and saves; extend that to one adjacent ally with a Medicine check. During a rest you may craft an improvised antidote." },
      { lvl: 15, name: "Combat Designation - Medic: Medical Sustainment Pack (Lvl 15)",
        desc: "Gain Expertise in Medicine. Upgrade to Corpsman's Bag: IFAK 15 uses + 4 tourniquets, Trauma Bag 10 uses, plus 20 corpsman supplies." },
      { lvl: 18, name: "Combat Designation - Medic: Seasoned Medic (Lvl 18)",
        desc: "Double all die rolls on any healing feature or item used by you." },
    ],

    "Dog Handler": [
      { lvl: 3,  name: "Combat Designation - Dog Handler: Handler's Kit (Tool)",
        desc: "Short lead, long tracking line, tactical harness, muzzle, clicker, whistle, remote e-collar, reward pouch, canine IFAK. Proficiency covers obedience/agitation, scent drills, silent signals, reading dog alerts, and field canine medicine." },
      { lvl: 3,  name: "Combat Designation - Dog Handler: Man's Best Friend (Lvl 3)",
        desc: "Gain a Level 1 military War Dog (Tracking or Attack variant). Acts on your initiative on command. Verbal command to move (no action), action to Attack/Dash/Disengage/Dodge/Help. Once you have Extra Attack you can substitute a dog attack for one or all of yours. If killed, you may request a replacement on command." },
      { lvl: 7,  name: "Combat Designation - Dog Handler: War Dog Training (Lvl 7)",
        desc: "If bonded longer than (your level) days, the dog gains 2 traits (3 at Lvl 10, 4 at Lvl 15, 5 at Lvl 18) from a list (extra dmg die / +prof to hit / +prof to saves / +prof to skills / +1 to a stat / Evasion / +2 AC / Multi-attack 2-3 / damage resistance / +1 HP per operator level)." },
      { lvl: 10, name: "Combat Designation - Dog Handler: Tactical Handler (Lvl 10 Spec)",
        desc: "Bonus action to command the dog: 1 attack, Dash, Disengage, Dodge, or special attack: Leap Attack (move half + 1 melee), Take Down (grapple, prone+grapple on success), Defend Your Master (move half, end within 5 ft, allies grant disadv on attacks vs them this turn)." },
      { lvl: 10, name: "Combat Designation - Dog Handler: Kennel Master (Lvl 10 Spec)",
        desc: "Gain a second War Dog with 2 starting traits (gains traits on the same schedule). Both act on your initiative; only one bonus-action command per turn. At Lvl 18 the second dog reaches 6 traits instead of granting a third dog." },
      { lvl: 15, name: "Combat Designation - Dog Handler: Veteran War Dog (Lvl 15)",
        desc: "Your War Dog gains 1 additional trait (4 total at this level)." },
      { lvl: 18, name: "Combat Designation - Dog Handler: Master Handler (Lvl 18)",
        desc: "Gain a second War Dog with 6 traits. If you took Kennel Master, the existing second dog matures to 6 traits. When you command one dog, the other may take the same or an equivalent action." },
    ],

    "Tech Specialist": [
      { lvl: 3,  name: "Combat Designation - Tech: B1ARD Kit (Tool)",
        desc: "Diagnostic kit, spare parts, micro-tools, firmware loader for the B-1 Recon Drone. Proficiency covers repair, upgrade installation, rotor/optics replacement, reflashing firmware, and battery management." },
      { lvl: 3,  name: "Combat Designation - Tech: B-1 Recon Drone Operator (Lvl 3)",
        desc: "Gain a B-1 Advanced Recon Drone (B1-RD). Mark 1 target within 120 ft (ranged attacks against it gain advantage). +5 to Repair rolls on the B1-RD. During a long rest, Technology DC 15: pass = install 1 upgrade, fail = retry next rest, crit fail = drone unusable until next rest. Upgrades: Night Vision, Thermal, Focused Microphone, Pistol Mount, Stealth Kit, Armor Kit, Structural Support." },
      { lvl: 7,  name: "Combat Designation - Tech: Tech Package (Lvl 7)",
        desc: "Gain 3x Motion Sensors (2-inch discs, ping every 6 sec on movement within 20 ft, bonus action to deploy, 24h life), 2x Seeker Grenades (sticky, no attack roll if reachable; 40 ft movement, self-detonate after 10 rounds), 5x Audio Bugs (1 cm mics, hear within 20 ft, bonus action to deploy, 8h life)." },
      { lvl: 10, name: "Combat Designation - Tech: Drone Operator (Lvl 10 Spec)",
        desc: "B1-RD becomes the Enhanced B1-RD. Marked targets = INT mod. The Enhanced B1-RD may have 2 upgrades active simultaneously." },
      { lvl: 10, name: "Combat Designation - Tech: Signals Specialist (Lvl 10 Spec)",
        desc: "Bonus action: jam enemy radio/digital comms within 60 ft for Proficiency-bonus rounds (uses per long rest = INT mod). Intercept radio within 1 mile with a Technology check. Advantage on Technology to hack electronic locks. Disable a hostile drone within 60 ft with an opposed INT check vs the operator." },
      { lvl: 10, name: "Combat Designation - Tech: Hacker (Lvl 10 Spec)",
        desc: "With device access or a network, breach a computer/phone/security system with a Technology check (DC by GM). Plant persistent access for later reconnection. Action: disable all networked cameras/sensors within 120 ft for 1 minute." },
      { lvl: 15, name: "Combat Designation - Tech: MacGyver (Lvl 15)",
        desc: "With a Drone Repair Kit, create or maintain basic tech devices in the field (GM approval; Technology check, DC by GM). The B1-RD gains 1 permanent upgrade." },
      { lvl: 18, name: "Combat Designation - Tech: Tech Master (Lvl 18)",
        desc: "No movement test needed for the B1-RD. Double Proficiency on all DEX saves/checks made with the B1-RD. Advantage on all Technology checks." },
    ],
  };

  const ABILITY_SOURCE_DESIGNATION = "combat_designation";

  // Refresh-Hook fuer Designation- ODER Level-Aenderungen. Bei jedem
  // Wechsel werden alle source="combat_designation"-Zeilen entfernt und
  // die fuer das aktuelle Level passenden Karten neu eingespielt.
  on("change:combat_designation change:level", () => {
    refreshDesignationAbilities();
  });

  function refreshDesignationAbilities() {
    getAttrs(["combat_designation", "level"], (v) => {
      const newKey = (v.combat_designation || "").trim();
      const charLevel = parseInt(v.level) || 1;
      const allAbilities = DESIGNATION_ABILITIES[newKey] || [];
      const newAbilities = allAbilities.filter((a) => (a.lvl || 0) <= charLevel);

      getSectionIDs("repeating_abilities", (ids) => {
        if (!ids || ids.length === 0) {
          addDesignationRows(newAbilities);
          return;
        }

        const sourceKeys = ids.map((id) => `repeating_abilities_${id}_source`);
        getAttrs(sourceKeys, (sv) => {
          ids.forEach((id) => {
            const src = sv[`repeating_abilities_${id}_source`];
            if (src === ABILITY_SOURCE_DESIGNATION) {
              removeRepeatingRow(`repeating_abilities_${id}`);
            }
          });
          addDesignationRows(newAbilities);
        });
      });
    });
  }

  function addDesignationRows(abilities) {
    if (!abilities || abilities.length === 0) return;
    const upd = {};
    abilities.forEach((a) => {
      const id = generateRowID();
      const prefix = `repeating_abilities_${id}`;
      upd[`${prefix}_source`]      = ABILITY_SOURCE_DESIGNATION;
      upd[`${prefix}_name`]        = a.name;
      upd[`${prefix}_description`] = a.desc;
    });
    setAttrs(upd);
  }

