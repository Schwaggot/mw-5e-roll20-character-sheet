  // ---- Attribute Modifier ----
  const ATTRS = ["strength","dexterity","constitution","intelligence","wisdom","charisma"];

  ATTRS.forEach(attr => {
    on(`change:${attr}`, () => {
      getAttrs([attr], (v) => {
        const score = parseInt(v[attr]) || 10;
        const mod = Math.floor((score - 10) / 2);
        const upd = {};
        upd[`${attr}_mod`] = mod;
        setAttrs(upd);
      });
    });
  });
  // ---- Proficiency Bonus from Level ----
  on("change:level sheet:opened", () => {
    getAttrs(["level"], (v) => {
      const lvl = Math.max(1, Math.min(20, parseInt(v.level) || 1));
      let prof = 2;
      if (lvl >= 17) prof = 6;
      else if (lvl >= 13) prof = 5;
      else if (lvl >= 9) prof = 4;
      else if (lvl >= 5) prof = 3;
      setAttrs({ prof_bonus: prof });
    });
  });
  // ---- Init: make sure mods exist on sheet open ----
  on("sheet:opened", () => {
    getAttrs(ATTRS, (v) => {
      const upd = {};
      ATTRS.forEach(a => {
        const score = parseInt(v[a]) || 10;
        upd[`${a}_mod`] = Math.floor((score - 10) / 2);
      });
      setAttrs(upd);
    });
  });

  // ---- Initiative Total = DEX-Mod + Init-Bonus ----
  on("change:dexterity_mod change:init_bonus sheet:opened", () => {
    getAttrs(["dexterity_mod", "init_bonus"], (v) => {
      const total = (parseInt(v.dexterity_mod) || 0) + (parseInt(v.init_bonus) || 0);
      setAttrs({ init_total: total });
    });
  });

  // ---- Roll-Template JSON Helpers ----
  // Each attack/spray/damage/grenade chat card stores a JSON snapshot
  // in the global `last_chat_json` attribute and posts a "[ Show ]" link
  // (CHAT_JSON_LINK) that targets the hidden roll_last_chat_json button.
  // Clicking the link spawns a separate JSON-only chat card containing
  // the snapshot for copy/paste. Inline collapsed UI is impossible:
  // Roll20's chat sanitizer strips <details>/<summary> and form inputs,
  // so there is no CSS-only click-toggle that survives the sandbox.
  //
  // Roll20's mustache parser treats `}}` as a field terminator, so we
  // HTML-encode `{` and `}` in the stringified payload. Roll20 decodes
  // the entities back when rendering, the user sees real braces and
  // copies valid JSON.
  function buildJsonField(obj) {
    return JSON.stringify(obj)
      .replace(/\{/g, "&#123;")
      .replace(/\}/g, "&#125;");
  }
  const CHAT_JSON_LINK = "[json](~@{character_id}|last_chat_json)";

  // ---- Indomitable-Sichtbarkeit (Operator Level >= 9) ----
  // Hidden-Checkbox attr_indomitable_available steuert via CSS :has()  //
  // ob die Indomitable-Karte im Class-Features-Grid gerendert wird.    //
  on("change:level sheet:opened", () => {
    getAttrs(["level"], (v) => {
      const level = parseInt(v.level) || 1;
      setAttrs({ indomitable_available: level >= 9 ? "1" : "0" });
    });
  });

