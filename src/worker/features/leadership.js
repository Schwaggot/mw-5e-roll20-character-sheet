  // ---- Leadership Dice (Unit Leader) ----
  on("clicked:roll_ld", () => {
    getAttrs(["ld_current", "ld_max", "ld_size", "character_name"], (v) => {
      const current = parseInt(v.ld_current) || 0;
      const size = v.ld_size || "1d4";
      const charName = v.character_name || "Operator";
      if (current <= 0) {
        startRoll(
          `&{template:check} {{title=Leadership Dice - leer}} {{who=${charName}}} {{result=Keine LD mehr uebrig}}`,
          (r) => finishRoll(r.rollId)
        );
        return;
      }
      const newCurrent = Math.max(0, current - 1);
      setAttrs({ ld_current: newCurrent });
      startRoll(
        `&{template:check} {{title=Leadership Die (${size})}} {{who=${charName}}} {{result=[[${size}]]}} {{note=LD ${current} -> ${newCurrent}. Add to ally's roll, or use for Order.}}`,
        (r) => finishRoll(r.rollId)
      );
    });
  });

  // ---- Unit-Leader Orders ----
  // Jeder Button verbraucht 1 LD, rollt sie, und postet Effekt-Karte.
  // Rally addiert zusaetzlich CHA-Mod (Heilung).
  // Inspiring Leader ist eine 7th-Level-Feature und erhaelt ein eigenes Label.
  const UNIT_LEADER_ORDERS = {
    fire_on_target: {
      name: "Fire on My Target",
      action: "Attack-Action",
      effect: "Verbuendete in 60ft mit Sicht duerfen Reaction fuer Angriff auf dasselbe Ziel nutzen. Damage +LD-Wert.",
    },
    head_down: {
      name: "Get Your Head Down",
      action: "Reaction",
      effect: "Ally in 5ft wird ranged angegriffen: +LD-Wert auf dessen AC gegen diesen Angriff.",
    },
    suppression: {
      name: "Suppression",
      action: "Action",
      effect: "Suppression + LD-Dice: so viele Allies joinen mit Reaction. Pro Helfer +1 Ziel moeglich.",
    },
    rally: {
      name: "Rally",
      action: "Bonus Action",
      effect: "Ally in 30ft heilt LD + CHA-Mod HP. Nur bei Triage Yellow/Green.",
      healBonus: true,
    },
    double_time: {
      name: "Double Time",
      action: "On Turn",
      effect: "Ally in 60ft darf Dash als Bonus Action. Dauer: LD Runden.",
    },
    reposition: {
      name: "Reposition",
      action: "On Turn",
      effect: "Ally in 60ft darf Disengage als Bonus Action. Dauer: LD Runden.",
    },
    take_cover: {
      name: "Take Cover",
      action: "On Turn",
      effect: "Ally in 60ft bekommt +2 auf Cover-Boni. Dauer: LD Runden.",
    },
    go_silent: {
      name: "Go Silent",
      action: "On Turn",
      effect: "Ally in 60ft bekommt +10 Stealth. Dauer: LD Minuten.",
    },
    security: {
      name: "Security",
      action: "On Turn",
      effect: "Ally in 60ft bekommt Advantage auf Attacks wenn es sich nicht bewegt. Dauer: LD Minuten.",
    },
    inspire: {
      name: "Inspiring Leader",
      action: "Aktion (7th Level)",
      effect: "Ally in 30ft darf LD-Wert zu 1 Ability-Check / Attack / Save innerhalb 10 Minuten addieren.",
    },
  };

  function executeOrder(key) {
    const o = UNIT_LEADER_ORDERS[key];
    if (!o) return;
    getAttrs(["ld_current", "ld_size", "charisma_mod", "character_name"], (v) => {
      const current = parseInt(v.ld_current) || 0;
      const size = v.ld_size || "1d4";
      const cha = parseInt(v.charisma_mod) || 0;
      const charName = v.character_name || "Operator";
      if (current <= 0) {
        startRoll(
          `&{template:check} {{title=Order ${o.name}}} {{who=${charName}}} {{result=Keine Leadership Dice}} {{note=Warte auf Short oder Long Rest.}}`,
          (r) => finishRoll(r.rollId)
        );
        return;
      }
      const newCurrent = current - 1;
      setAttrs({ ld_current: newCurrent });
      const resultExpr = o.healBonus
        ? `[[${size} + ${cha}]] HP (LD + CHA ${cha >= 0 ? "+" : ""}${cha})`
        : `[[${size}]]`;
      startRoll(
        `&{template:order} {{title=${o.name}}} {{who=${charName}}} {{action_type=${o.action}}} {{result=${resultExpr}}} {{effect=${o.effect}}} {{ld_before=${current}}} {{ld_after=${newCurrent}}}`,
        (r) => finishRoll(r.rollId)
      );
    });
  }

  on("clicked:order_fire_on_target", () => executeOrder("fire_on_target"));
  on("clicked:order_head_down",      () => executeOrder("head_down"));
  on("clicked:order_suppression",    () => executeOrder("suppression"));
  on("clicked:order_rally",          () => executeOrder("rally"));
  on("clicked:order_double_time",    () => executeOrder("double_time"));
  on("clicked:order_reposition",     () => executeOrder("reposition"));
  on("clicked:order_take_cover",     () => executeOrder("take_cover"));
  on("clicked:order_go_silent",      () => executeOrder("go_silent"));
  on("clicked:order_security",       () => executeOrder("security"));
  on("clicked:order_inspire",        () => executeOrder("inspire"));

