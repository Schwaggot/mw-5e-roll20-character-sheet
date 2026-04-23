  // ---- Encumbrance (Weight-Sum + Status-Indicator) ----
  // Summiert Weapons (wweight) + equipped Armor (aweight) + Inventory
  // (iweight * iqty). Max = STR * 7 kg. Status als 3 kumulative Checkboxen
  // die CSS via :has(:checked) in Hintergrund-Farben uebersetzt.
  const WEIGHT_FACTOR_MAX = 7; // STR * 7 kg Carry Capacity (D&D x15 lbs)

  function parseKg(str) {
    if (!str) return 0;
    const m = /^\s*([\d.,]+)\s*kg/i.exec(String(str));
    return m ? parseFloat(m[1].replace(",", ".")) : 0;
  }

  // Fest-Gewichte fuer Companion-/Designation-spezifische Items.
  // Werden addiert wenn die jeweilige Designation aktiv ist.
  const DRONE_WEIGHT = 3.6;  // B-1 Recon Drone + Command Console (Compendium)

  function recalcEncumbrance() {
    getSectionIDs("repeating_weapons", (weaponIds) => {
      getSectionIDs("repeating_armor", (armorIds) => {
        getSectionIDs("repeating_gear", (gearIds) => {
          getSectionIDs("repeating_grenades", (grenadeIds) => {
            getSectionIDs("repeating_clothing", (clothingIds) => {
            getSectionIDs("repeating_magazines", (magIds) => {
            const attrs = ["strength", "desig_tech"];
            for (const id of weaponIds) {
              attrs.push(`repeating_weapons_${id}_wweight`);
            }
            for (const id of armorIds) {
              attrs.push(`repeating_armor_${id}_aweight`);
              attrs.push(`repeating_armor_${id}_aequipped`);
            }
            for (const id of gearIds) {
              attrs.push(`repeating_gear_${id}_iweight`);
              attrs.push(`repeating_gear_${id}_iqty`);
            }
            for (const id of grenadeIds) {
              attrs.push(`repeating_grenades_${id}_gweight`);
              attrs.push(`repeating_grenades_${id}_gcount`);
            }
            for (const id of clothingIds) {
              attrs.push(`repeating_clothing_${id}_cweight`);
              attrs.push(`repeating_clothing_${id}_ccount`);
            }
            for (const id of magIds) {
              attrs.push(`repeating_magazines_${id}_mag_weight`);
            }
            getAttrs(attrs, (v) => {
              let total = 0;
              for (const id of weaponIds) {
                total += parseFloat(v[`repeating_weapons_${id}_wweight`]) || 0;
              }
              for (const id of armorIds) {
                const equipped = parseInt(v[`repeating_armor_${id}_aequipped`]) || 0;
                if (!equipped) continue;
                total += parseKg(v[`repeating_armor_${id}_aweight`]);
              }
              for (const id of gearIds) {
                const qty = parseInt(v[`repeating_gear_${id}_iqty`]) || 1;
                total += parseKg(v[`repeating_gear_${id}_iweight`]) * qty;
              }
              for (const id of grenadeIds) {
                const count = parseInt(v[`repeating_grenades_${id}_gcount`]) || 0;
                const w = parseFloat(v[`repeating_grenades_${id}_gweight`]) || 0;
                total += w * count;
              }
              for (const id of clothingIds) {
                const count = parseInt(v[`repeating_clothing_${id}_ccount`]) || 0;
                const w = parseFloat(v[`repeating_clothing_${id}_cweight`]) || 0;
                total += w * count;
              }
              for (const id of magIds) {
                total += parseFloat(v[`repeating_magazines_${id}_mag_weight`]) || 0;
              }
              // Tech Specialist traegt die B-1 Recon Drone (~3.6 kg inkl. Console)
              if (parseInt(v.desig_tech) === 1) total += DRONE_WEIGHT;
              const str = Math.max(1, parseInt(v.strength) || 10);
              const max = str * WEIGHT_FACTOR_MAX;
              const isOver = total > max;
              const isHeavy = !isOver && total > max * 2 / 3;
              const isEnc = !isOver && !isHeavy && total > max / 3;
              setAttrs({
                weight_total: total.toFixed(1),
                weight_max: max.toFixed(1),
                weight_display: `${total.toFixed(1)} / ${max.toFixed(1)} kg`,
                weight_status_encumbered: isEnc ? "1" : "0",
                weight_status_heavy:      isHeavy ? "1" : "0",
                weight_status_overloaded: isOver ? "1" : "0",
              });
            });
            });
            });
          });
        });
      });
    });
  }

  on(
    "change:strength change:desig_tech " +
    "change:repeating_weapons:wweight change:repeating_weapons remove:repeating_weapons " +
    "change:repeating_armor:aweight change:repeating_armor:aequipped " +
    "change:repeating_armor remove:repeating_armor " +
    "change:repeating_gear:iweight change:repeating_gear:iqty " +
    "change:repeating_gear remove:repeating_gear " +
    "change:repeating_grenades:gweight change:repeating_grenades:gcount " +
    "change:repeating_grenades remove:repeating_grenades " +
    "change:repeating_clothing:cweight change:repeating_clothing:ccount " +
    "change:repeating_clothing remove:repeating_clothing " +
    "change:repeating_magazines:mag_weight " +
    "change:repeating_magazines remove:repeating_magazines " +
    "sheet:opened",
    () => recalcEncumbrance()
  );

