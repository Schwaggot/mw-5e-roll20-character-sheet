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

