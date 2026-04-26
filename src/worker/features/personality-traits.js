  // ---- Personality Trait -> Abilities (auto-managed reminder rows) ----
  // Statische, global anwendbare Boni (Attribute, +1 alle Saves, +5 ft Speed,
  // Profs, etc.) bleiben manuell. Hier sind nur die situativen / aktiven
  // Effekte, die schwer als "+X im Feld Y" abzubilden sind.
  //
  // Beim Trait-Wechsel werden alle repeating_abilities-Zeilen mit
  // source = "personality_trait" entfernt und durch die neuen ersetzt.
  // Manuelle Zeilen (source = "manual") bleiben unangetastet.
  const TRAIT_ABILITIES = {
    commanding: [{
      name: "Personality Trait - Commanding: Guidance",
      desc: "Once per short rest, as a bonus action, you may grant an ally within 30 ft a +2 bonus to their next attack roll or saving throw.",
    }],
    connected: [{
      name: "Personality Trait - Connected: Invoke Contact",
      desc: "Once per session, you may invoke a contact: the GM works with you to define a useful acquaintance, a small favor, or a piece of local information.",
    }],
    lucky: [{
      name: "Personality Trait - Lucky: Reroll",
      desc: "Once per long rest, you may reroll any d20 - your own roll, or an attack roll made against you - and use either result.",
    }],
    mysterious: [{
      name: "Personality Trait - Mysterious: Passive Perception",
      desc: "+5 to passive Perception. (Reminder: applies to passive only, not active Perception checks.)",
    }],
    persistent: [{
      name: "Personality Trait - Persistent: Retry",
      desc: "Once per long rest, you may retry a failed skill check without suffering any penalties.",
    }],
    steady: [{
      name: "Personality Trait - Steady: Stress Resilience",
      desc: "Advantage on saves against being Frightened and against gaining Shaken levels from stress damage.",
    }],
    stoic: [{
      name: "Personality Trait - Stoic: Mental Fortress",
      desc: "Advantage on saves and opposed checks to resist Intimidation, Persuasion, Deception, and being Charmed.",
    }],
    vigilant: [{
      name: "Personality Trait - Vigilant: Cannot Be Surprised",
      desc: "You cannot be surprised.",
    }],
  };

  const ABILITY_SOURCE_TRAIT = "personality_trait";

  on("change:personality_trait", () => {
    getAttrs(["personality_trait"], (v) => {
      const newKey = (v.personality_trait || "").toLowerCase();
      const newAbilities = TRAIT_ABILITIES[newKey] || [];

      getSectionIDs("repeating_abilities", (ids) => {
        if (!ids || ids.length === 0) {
          // Keine bestehenden Zeilen -> nur neue hinzufuegen.
          addTraitRows(newAbilities);
          return;
        }

        const sourceKeys = ids.map((id) => `repeating_abilities_${id}_source`);
        getAttrs(sourceKeys, (sv) => {
          ids.forEach((id) => {
            const src = sv[`repeating_abilities_${id}_source`];
            if (src === ABILITY_SOURCE_TRAIT) {
              removeRepeatingRow(`repeating_abilities_${id}`);
            }
          });
          addTraitRows(newAbilities);
        });
      });
    });
  });

  function addTraitRows(abilities) {
    if (!abilities || abilities.length === 0) return;
    const upd = {};
    abilities.forEach((a) => {
      const id = generateRowID();
      const prefix = `repeating_abilities_${id}`;
      upd[`${prefix}_source`]      = ABILITY_SOURCE_TRAIT;
      upd[`${prefix}_name`]        = a.name;
      upd[`${prefix}_description`] = a.desc;
    });
    setAttrs(upd);
  }

  on("clicked:repeating_abilities:use", (info) => {
    const src = (info && info.sourceAttribute) || "";
    const match = /^(repeating_abilities_[^_]+)_/i.exec(src);
    if (!match) return;
    const prefix = match[1];

    getAttrs([`${prefix}_name`, `${prefix}_description`, "character_name"], (v) => {
      const title = v[`${prefix}_name`] || "Ability";
      const description = v[`${prefix}_description`] || "";
      const who = v.character_name || "";
      startRoll(
        `&{template:ability} {{title=${title}}} {{who=${who}}} {{description=${description}}}`,
        (r) => finishRoll(r.rollId)
      );
    });
  });
