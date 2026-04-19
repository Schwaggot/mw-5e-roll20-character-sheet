  // ---- War Dog ----
  function dogBite() {
    getAttrs(["dog_name", "dog_type", "character_name"], (v) => {
      const dogName = v.dog_name || "Dog";
      const type = v.dog_type || "tracking";
      const charName = v.character_name || "Operator";
      // Tracking Dog: +3 to hit, 1d4+1 damage
      // Attack Dog: +3 to hit, 1d6+3 damage (Lock Jaw)
      const atkBonus = 3;
      const dmgFormula = type === "attack" ? "1d6 + 3" : "1d4 + 1";
      const label = type === "attack" ? "Attack Dog Bite" : "Tracking Dog Bite";
      const rollText = `&{template:attack} ` +
        `{{title=${dogName} - ${label}}} ` +
        `{{who=${charName}}} ` +
        `{{mode=Bite (Melee)}} ` +
        `{{attack=[[1d20 + ${atkBonus}]]}} ` +
        `{{damage=[[${dmgFormula}]]}} ` +
        `{{note=Reach 5ft. Piercing.}}`;
      startRoll(rollText, (r) => finishRoll(r.rollId));
    });
  }

  on("clicked:dog_bite", dogBite);

  on("clicked:dog_perception", () => {
    getAttrs(["dog_name", "dog_focus", "character_name"], (v) => {
      const dogName = v.dog_name || "Dog";
      const focus = v.dog_focus || "";
      const charName = v.character_name || "Operator";
      // Tracking Dog Perception base +5. +10 if tracking focus target.
      const note = focus ? `Focus: ${focus} - auf Fokus-Ziel +10 auf Check.` : "Kein Tracking-Focus gesetzt.";
      const rollText = `&{template:check} ` +
        `{{title=${dogName} - Perception}} ` +
        `{{who=${charName}}} ` +
        `{{result=[[1d20 + 5]] (auf Hören/Riechen mit Advantage)}} ` +
        `{{note=${note}}}`;
      startRoll(rollText, (r) => finishRoll(r.rollId));
    });
  });

  // ---- Handler Technique (10th Level) ----
  // Leap Attack: Move + 1 Melee (Bite mit gleichem Damage wie Normalangriff).
  // Take Down: Grapple-Check; Attack Dog nutzt Lock Jaw (+10).
  // Defend Your Master: Move + Disadvantage auf alle Angriffe auf Operator.
  on("clicked:dog_leap_attack", () => {
    getAttrs(["dog_name", "dog_type", "dog_speed", "character_name"], (v) => {
      const dogName = v.dog_name || "Dog";
      const type = v.dog_type || "tracking";
      const speed = v.dog_speed || "40 ft";
      const charName = v.character_name || "Operator";
      const atkBonus = 3;
      const dmgFormula = type === "attack" ? "1d6 + 3" : "1d4 + 1";
      const rollText = `&{template:attack} ` +
        `{{title=${dogName} - Leap Attack}} ` +
        `{{who=${charName}}} ` +
        `{{mode=Bonus Action (Handler Technique)}} ` +
        `{{attack=[[1d20 + ${atkBonus}]]}} ` +
        `{{damage=[[${dmgFormula}]]}} ` +
        `{{note=Bewegung bis zu halber Speed (${speed}/2), dann 1 Melee-Angriff. Bonus-Action fuer Operator.}}`;
      startRoll(rollText, (r) => finishRoll(r.rollId));
    });
  });

  on("clicked:dog_takedown", () => {
    getAttrs(["dog_name", "dog_type", "dog_str", "character_name"], (v) => {
      const dogName = v.dog_name || "Dog";
      const type = v.dog_type || "tracking";
      const strScore = parseInt(v.dog_str) || 11;
      const strMod = Math.floor((strScore - 10) / 2);
      const charName = v.character_name || "Operator";
      // Attack Dog hat Lock Jaw (+10 Athletics). Tracking Dog nur STR-Mod + Prof.
      const lockJaw = type === "attack";
      const totalBonus = strMod + 2 + (lockJaw ? 10 : 0);
      const rollText = `&{template:check} ` +
        `{{title=${dogName} - Take Down}} ` +
        `{{who=${charName}}} ` +
        `{{result=Athletics [[1d20 + ${totalBonus}]] vs Ziel-Save${lockJaw ? " (Lock Jaw +10)" : ""}}} ` +
        `{{note=Bonus Action (Handler Technique). Bei Erfolg: Ziel ist Prone UND Grappled.}}`;
      startRoll(rollText, (r) => finishRoll(r.rollId));
    });
  });

  on("clicked:dog_defend_master", () => {
    getAttrs(["dog_name", "dog_speed", "character_name"], (v) => {
      const dogName = v.dog_name || "Dog";
      const speed = v.dog_speed || "40 ft";
      const charName = v.character_name || "Operator";
      const rollText = `&{template:check} ` +
        `{{title=${dogName} - Defend Your Master}} ` +
        `{{who=${charName}}} ` +
        `{{result=Active bis Ende deiner Runde}} ` +
        `{{note=Hund bewegt sich bis zu halber Speed (${speed}/2) und endet innerhalb 5ft von ${charName}. Alle gegnerischen Angriffe auf ${charName} diese Runde haben Disadvantage.}}`;
      startRoll(rollText, (r) => finishRoll(r.rollId));
    });
  });

  // ---- Tech Package (Tech Specialist 7th Level) ----
  // Motion Sensor / Seeker Grenade / Audio Bug: je Deploy-Button dekrementiert
  // Count und postet Regel-Karte. Reset auf Long Rest (siehe long_rest Handler).
  function deployTech(kind) {
    const cfg = {
      sensor: {
        name: "Motion Sensor",
        attr: "tech_sensors",
        desc: "2-inch Disc, pingt alle 6 Sek bei Bewegung in 20 ft. Bonus-Action zum Aktivieren. Haelt 24h.",
      },
      seeker: {
        name: "Seeker Grenade",
        attr: "tech_seekers",
        desc: "Sticky Grenade ohne Attack-Roll solange sie rollen kann. Bewegt 40 ft, detoniert nach 10 Runden.",
      },
      bug: {
        name: "Audio Bug",
        attr: "tech_bugs",
        desc: "1cm Mikrofon, hoerst innerhalb 20 ft. Bonus-Action zum Platzieren. Haelt 8h.",
      },
    }[kind];
    if (!cfg) return;
    getAttrs([cfg.attr, "character_name"], (v) => {
      const current = parseInt(v[cfg.attr]) || 0;
      const charName = v.character_name || "Operator";
      if (current <= 0) {
        startRoll(
          `&{template:check} {{title=${cfg.name} - keine mehr}} {{who=${charName}}} {{result=Bestand leer, Long Rest noetig}}`,
          (r) => finishRoll(r.rollId)
        );
        return;
      }
      const next = current - 1;
      setAttrs({ [cfg.attr]: next });
      startRoll(
        `&{template:check} {{title=Deploy: ${cfg.name}}} {{who=${charName}}} ` +
        `{{result=${cfg.name} gesetzt (${current} -> ${next} verbleibend)}} ` +
        `{{note=${cfg.desc}}}`,
        (r) => finishRoll(r.rollId)
      );
    });
  }

  on("clicked:tech_sensor_deploy", () => deployTech("sensor"));
  on("clicked:tech_seeker_deploy", () => deployTech("seeker"));
  on("clicked:tech_bug_deploy",    () => deployTech("bug"));

