  on("change:repeating_weapons:wpreset", (info) => {
    const src = (info && info.sourceAttribute) || "";
    const match = /^(repeating_weapons_[^_]+)_/i.exec(src);
    if (!match) return;
    const rowPrefix = match[1];

    getAttrs([src], (v) => {
      const key = v[src];
      if (!key || key === "custom") return; // Custom: nichts überschreiben
      const p = WEAPON_PRESETS[key];
      if (!p) return;

      const upd = {};
      upd[`${rowPrefix}_wname`]       = p.name;
      upd[`${rowPrefix}_wcaliber`]    = p.caliber;
      upd[`${rowPrefix}_wdamage`]     = p.damage;
      upd[`${rowPrefix}_wrange`]      = p.range;
      upd[`${rowPrefix}_wrecoil`]     = p.recoil;
      upd[`${rowPrefix}_wmisfire`]    = p.misfire;
      upd[`${rowPrefix}_wcrit`]       = p.crit;
      upd[`${rowPrefix}_wammo`]       = p.ammo_max;
      upd[`${rowPrefix}_wammo_max`]   = p.ammo_max;
      upd[`${rowPrefix}_wgroup`]      = WEAPON_GROUP_MAP[key] || "";
      upd[`${rowPrefix}_wweight`]     = WEAPON_GROUP_WEIGHT[WEAPON_GROUP_MAP[key]] || 0;
      upd[`${rowPrefix}_wclass`]      = p.mag_class || "";
      upd[`${rowPrefix}_wproperties`] = p.properties || "";

      // Fire Modes: S/B/A Sichtbarkeit steuern (jetzt immer explizit im Preset)
      const modes = (p.modes || "s").toLowerCase();
      upd[`${rowPrefix}_wmode_s`] = modes.includes("s") ? "1" : "0";
      upd[`${rowPrefix}_wmode_b`] = modes.includes("b") ? "1" : "0";
      upd[`${rowPrefix}_wmode_a`] = modes.includes("a") ? "1" : "0";

      Object.assign(upd, buildPropPillUpdates(rowPrefix, p.properties));
      setAttrs(upd);
    });
  });

