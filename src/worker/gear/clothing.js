  // ---- Clothing Presets (aus Compendium generiert) ----
  // weight = kg pro Einzel-Item (fuer Encumbrance-Sum, multipliziert mit ccount).
  // Generiert via scripts/gen-clothing.mjs aus compendium/gear/clothing.md.
  const CLOTHING_PRESETS = {
    // Quick Outfits
    outfit_grayman: { name: "Grayman", style: "Civilian", weight: 2, tags: "civilian, conceals-pistol" },
    outfit_formal_civilian: { name: "Formal Civilian", style: "Civilian", weight: 1.8, tags: "civilian, formal, conceals-pistol" },
    outfit_hiker: { name: "Hiker", style: "Civilian", weight: 2.2, tags: "civilian, warm, waterproof" },
    outfit_garrison_uniform: { name: "Garrison Uniform", style: "Military", weight: 2, tags: "military" },
    outfit_patrol_uniform: { name: "Patrol Uniform", style: "Military", weight: 2.5, tags: "military, camo-multicam" },
    outfit_dress_uniform: { name: "Dress Uniform", style: "Military", weight: 2.2, tags: "military, formal" },
    outfit_combat_load: { name: "Combat Load", style: "Tactical", weight: 3, tags: "tactical, camo-multicam, under-armor" },
    outfit_arctic_combat_load: { name: "Arctic Combat Load", style: "Tactical", weight: 6, tags: "tactical, camo-snow, insulated, waterproof, under-armor" },
    outfit_desert_combat_load: { name: "Desert Combat Load", style: "Tactical", weight: 2.5, tags: "tactical, camo-arid, ventilated, under-armor" },
    outfit_recon_ghillie: { name: "Recon / Ghillie", style: "Military", weight: 4, tags: "military, camo-woodland, under-armor" },
    // Headwear - Everyday
    head_baseball_cap: { name: "Baseball cap", style: "Civilian", weight: 0.1, tags: "civilian" },
    head_boonie_hat: { name: "Boonie hat", style: "Military", weight: 0.2, tags: "military, camo-woodland" },
    head_beret: { name: "Beret", style: "Military", weight: 0.1, tags: "military, formal" },
    head_patrol_cap: { name: "Patrol cap", style: "Military", weight: 0.1, tags: "military, camo-multicam" },
    head_watch_cap_wool: { name: "Watch cap (wool)", style: "Civ/Mil", weight: 0.1, tags: "warm" },
    head_fleece_watch_cap: { name: "Fleece watch cap", style: "Civ/Mil", weight: 0.1, tags: "warm, under-armor" },
    head_ushanka: { name: "Ushanka", style: "Civilian", weight: 0.3, tags: "civilian, insulated" },
    head_fur_trapper_hat: { name: "Fur trapper hat", style: "Civilian", weight: 0.3, tags: "civilian, insulated" },
    head_wide_brim_sun_hat: { name: "Wide-brim sun hat", style: "Civilian", weight: 0.2, tags: "civilian, ventilated" },
    // Eyewear
    eye_sunglasses: { name: "Sunglasses", style: "Civilian", weight: 0.05, tags: "civilian" },
    eye_oakley_si_ballistic: { name: "Oakley SI Ballistic", style: "Tactical", weight: 0.05, tags: "tactical" },
    eye_ess_crossbow: { name: "ESS Crossbow", style: "Tactical", weight: 0.05, tags: "tactical" },
    eye_wiley_x_ballistic_glasses: { name: "Wiley X ballistic glasses", style: "Tactical", weight: 0.05, tags: "tactical" },
    eye_skisnow_goggles: { name: "Ski/snow goggles", style: "Civilian", weight: 0.2, tags: "civilian, insulated" },
    eye_ess_profile_nvg_goggles: { name: "ESS Profile NVG goggles", style: "Military", weight: 0.2, tags: "military" },
    // Face and Neck
    face_shemagh: { name: "Shemagh", style: "Civ/Mil", weight: 0.2, tags: "warm, ventilated, conceals-face" },
    face_balaclava: { name: "Balaclava", style: "Tactical", weight: 0.1, tags: "warm, conceals-face" },
    face_neck_gaiter: { name: "Neck gaiter", style: "Civilian", weight: 0.1, tags: "civilian, warm" },
    face_merino_buff: { name: "Merino buff", style: "Civilian", weight: 0.1, tags: "civilian, warm" },
    face_scarf: { name: "Scarf", style: "Civilian", weight: 0.2, tags: "civilian, warm" },
    face_bandana_dust_mask: { name: "Bandana / dust mask", style: "Civilian", weight: 0.05, tags: "conceals-face" },
    // Tops - Everyday
    top_t_shirt_cotton: { name: "T-shirt (cotton)", style: "Civilian", weight: 0.2, tags: "civilian, ventilated" },
    top_polo_shirt: { name: "Polo shirt", style: "Civilian", weight: 0.3, tags: "civilian" },
    top_flannel_shirt: { name: "Flannel shirt", style: "Civilian", weight: 0.4, tags: "civilian, warm" },
    top_dress_shirt: { name: "Dress shirt", style: "Civilian", weight: 0.3, tags: "civilian, formal" },
    top_hoodie: { name: "Hoodie", style: "Civilian", weight: 0.5, tags: "civilian, warm, conceals-face, conceals-pistol" },
    top_henley: { name: "Henley", style: "Civilian", weight: 0.3, tags: "civilian" },
    top_combat_shirt: { name: "Combat shirt", style: "Military", weight: 0.4, tags: "military, camo-woodland, under-armor" },
    top_crye_g3_combat_shirt: { name: "Crye G3 Combat Shirt", style: "Tactical", weight: 0.4, tags: "tactical, camo-multicam, under-armor, ventilated" },
    top_511_rapid_assault_shirt: { name: "5.11 Rapid Assault Shirt", style: "Tactical", weight: 0.4, tags: "tactical, under-armor, ventilated" },
    top_arcteryx_leaf_assault_shirt: { name: "Arc'teryx LEAF Assault Shirt", style: "Tactical", weight: 0.4, tags: "tactical, camo-multicam, under-armor, waterproof" },
    // Tops - Base Layers
    topbase_cotton_undershirt: { name: "Cotton undershirt", style: "Civilian", weight: 0.2, tags: "civilian, under-armor" },
    topbase_merino_wool_base_layer: { name: "Merino wool base layer", style: "Civ/Mil", weight: 0.2, tags: "warm, under-armor" },
    topbase_under_armour_coldgear_top: { name: "Under Armour ColdGear top", style: "Civ/Mil", weight: 0.2, tags: "warm, under-armor" },
    topbase_under_armour_heatgear_top: { name: "Under Armour HeatGear top", style: "Civ/Mil", weight: 0.2, tags: "ventilated, under-armor" },
    topbase_compression_shirt: { name: "Compression shirt", style: "Civ/Mil", weight: 0.2, tags: "under-armor" },
    topbase_polypro_thermal_top_gen_iii_l1: { name: "Polypro thermal top (Gen III L1)", style: "Military", weight: 0.2, tags: "warm, under-armor" },
    topbase_fleece_top_gen_iii_l3: { name: "Fleece top (Gen III L3)", style: "Military", weight: 0.5, tags: "warm, under-armor" },
    // Outerwear
    outer_denim_jacket: { name: "Denim jacket", style: "Civilian", weight: 0.8, tags: "civilian" },
    outer_leather_jacket: { name: "Leather jacket", style: "Civilian", weight: 1.2, tags: "civilian, warm" },
    outer_bomber_jacket: { name: "Bomber jacket", style: "Civilian", weight: 1, tags: "civilian, warm" },
    outer_trench_coat: { name: "Trench coat", style: "Civilian", weight: 1.5, tags: "civilian, waterproof, conceals-pistol, formal" },
    outer_parka_civilian: { name: "Parka (civilian)", style: "Civilian", weight: 1.8, tags: "civilian, insulated, waterproof" },
    outer_field_jacket_m_65: { name: "Field jacket (M-65)", style: "Military", weight: 1.6, tags: "military, camo-woodland, warm, waterproof" },
    outer_softshell_jacket_gen_iii_l5: { name: "Softshell jacket (Gen III L5)", style: "Military", weight: 0.8, tags: "military, camo-multicam, warm, waterproof" },
    outer_ecwcs_gen_iii_l7_insulated_parka: { name: "ECWCS Gen III L7 insulated parka", style: "Military", weight: 1.5, tags: "military, camo-multicam, insulated" },
    outer_arcteryx_leaf_alpha_jacket: { name: "Arc'teryx LEAF Alpha jacket", style: "Tactical", weight: 0.6, tags: "tactical, camo-multicam, waterproof" },
    outer_arcteryx_leaf_cold_wx_parka: { name: "Arc'teryx LEAF Cold WX parka", style: "Tactical", weight: 1.4, tags: "tactical, camo-multicam, insulated, waterproof" },
    outer_crye_g3_field_shirt: { name: "Crye G3 Field Shirt", style: "Tactical", weight: 0.6, tags: "tactical, camo-multicam, warm" },
    outer_511_tactical_softshell: { name: "5.11 Tactical softshell", style: "Tactical", weight: 0.8, tags: "tactical, warm, waterproof, conceals-pistol" },
    outer_ghillie_suit: { name: "Ghillie suit", style: "Military", weight: 3, tags: "military, camo-woodland" },
    // Bottoms - Everyday
    pants_jeans: { name: "Jeans", style: "Civilian", weight: 0.7, tags: "civilian" },
    pants_khakis_chinos: { name: "Khakis / chinos", style: "Civilian", weight: 0.6, tags: "civilian, formal" },
    pants_dress_slacks: { name: "Dress slacks", style: "Civilian", weight: 0.6, tags: "civilian, formal" },
    pants_cargo_pants_civilian: { name: "Cargo pants (civilian)", style: "Civilian", weight: 0.8, tags: "civilian, conceals-pistol" },
    pants_shorts: { name: "Shorts", style: "Civilian", weight: 0.4, tags: "civilian, ventilated" },
    pants_bdu_pants: { name: "BDU pants", style: "Military", weight: 0.8, tags: "military, camo-woodland" },
    pants_crye_g3_combat_pants: { name: "Crye G3 Combat Pants", style: "Tactical", weight: 0.8, tags: "tactical, camo-multicam, ventilated" },
    pants_crye_g3_field_pants: { name: "Crye G3 Field Pants", style: "Tactical", weight: 0.9, tags: "tactical, camo-multicam, warm" },
    pants_511_stryke_pants: { name: "5.11 Stryke pants", style: "Tactical", weight: 0.8, tags: "tactical, conceals-pistol" },
    pants_arcteryx_leaf_assault_pants: { name: "Arc'teryx LEAF Assault Pants", style: "Tactical", weight: 0.8, tags: "tactical, camo-multicam, waterproof" },
    pants_insulated_overpants_gen_iii_l7: { name: "Insulated overpants (Gen III L7)", style: "Military", weight: 1, tags: "military, insulated, waterproof" },
    // Bottoms - Base Layers
    pantsbase_thermal_long_johns_cotton: { name: "Thermal long johns (cotton)", style: "Civilian", weight: 0.3, tags: "warm, under-armor" },
    pantsbase_merino_wool_base_layer: { name: "Merino wool base layer", style: "Civ/Mil", weight: 0.3, tags: "warm, under-armor" },
    pantsbase_under_armour_coldgear_leggings: { name: "Under Armour ColdGear leggings", style: "Civ/Mil", weight: 0.3, tags: "warm, under-armor" },
    pantsbase_polypro_thermal_pants_gen_iii_l1: { name: "Polypro thermal pants (Gen III L1)", style: "Military", weight: 0.3, tags: "warm, under-armor" },
    // Belts
    belt_leather_dress_belt: { name: "Leather dress belt", style: "Civilian", weight: 0.2, tags: "civilian, formal" },
    belt_nylon_web_belt: { name: "Nylon web belt", style: "Civilian", weight: 0.2, tags: "civilian" },
    belt_riggers_belt: { name: "Riggers belt", style: "Tactical", weight: 0.3, tags: "tactical" },
    belt_wilderness_instructor_belt: { name: "Wilderness Instructor Belt", style: "Tactical", weight: 0.3, tags: "tactical" },
    belt_pistol_belt_lbv: { name: "Pistol belt (LBV)", style: "Military", weight: 0.4, tags: "military" },
    // Gloves - Everyday
    glove_wool_gloves: { name: "Wool gloves", style: "Civilian", weight: 0.1, tags: "civilian, warm" },
    glove_leather_dress_gloves: { name: "Leather dress gloves", style: "Civilian", weight: 0.1, tags: "civilian, formal" },
    glove_work_gloves: { name: "Work gloves", style: "Civilian", weight: 0.2, tags: "civilian" },
    glove_fingerless_gloves: { name: "Fingerless gloves", style: "Civilian", weight: 0.1, tags: "civilian" },
    glove_mechanix_m_pact: { name: "Mechanix M-Pact", style: "Tactical", weight: 0.2, tags: "tactical" },
    glove_pig_fdt_alpha: { name: "PIG FDT Alpha", style: "Tactical", weight: 0.1, tags: "tactical" },
    glove_outdoor_research_softshell: { name: "Outdoor Research softshell", style: "Tactical", weight: 0.2, tags: "tactical, warm" },
    glove_sealskinz_waterproof_gloves: { name: "SealSkinz waterproof gloves", style: "Tactical", weight: 0.2, tags: "tactical, waterproof, warm" },
    glove_arcteryx_leaf_cold_wx_mitts: { name: "Arc'teryx LEAF Cold WX mitts", style: "Tactical", weight: 0.3, tags: "tactical, insulated, waterproof" },
    glove_oakley_si_assault_gloves: { name: "Oakley SI Assault gloves", style: "Tactical", weight: 0.2, tags: "tactical" },
    // Gloves - Protective
    gloveprot_tacticalleather: { name: "Tactical/Leather", style: "Tactical", weight: 0.2, tags: "-2 to DEX checks with hands; Resist: Slashing; Req 1" },
    gloveprot_carbon_fiber: { name: "Carbon Fiber", style: "Tactical", weight: 0.2, tags: "-2 to DEX checks with hands, +1 unarmed damage; Resist: Piercing, Slashing; Req 2" },
    gloveprot_bomb_suit_gloves: { name: "Bomb Suit Gloves", style: "Tactical", weight: 1.8, tags: "AC +2; Disadvantage on DEX-based tests with hands; Resist: Force, Piercing, Slashing, Bludgeoning; Req 10" },
    // Socks
    sock_cotton_socks: { name: "Cotton socks", style: "Civilian", weight: 0.1, tags: "civilian" },
    sock_athletic_socks: { name: "Athletic socks", style: "Civilian", weight: 0.1, tags: "civilian, ventilated" },
    sock_merino_wool_socks: { name: "Merino wool socks", style: "Civ/Mil", weight: 0.1, tags: "warm" },
    sock_boot_socks_heavy_wool: { name: "Boot socks (heavy wool)", style: "Military", weight: 0.2, tags: "military, warm" },
    sock_darn_tough_tactical_socks: { name: "Darn Tough tactical socks", style: "Tactical", weight: 0.1, tags: "tactical, warm" },
    sock_thermal_arctic_socks: { name: "Thermal arctic socks", style: "Military", weight: 0.2, tags: "military, insulated" },
    // Footwear - Everyday
    foot_sneakers_running: { name: "Sneakers (running)", style: "Civilian", weight: 0.5, tags: "civilian, ventilated" },
    foot_trainers_nike_adidas: { name: "Trainers (Nike / Adidas)", style: "Civilian", weight: 0.5, tags: "civilian, ventilated" },
    foot_dress_shoes: { name: "Dress shoes", style: "Civilian", weight: 0.8, tags: "civilian, formal" },
    foot_work_boots_timberland: { name: "Work boots (Timberland)", style: "Civilian", weight: 1.3, tags: "civilian" },
    foot_hiking_boots_merrell: { name: "Hiking boots (Merrell)", style: "Civilian", weight: 1.2, tags: "civilian, waterproof" },
    foot_salomon_quest_4d: { name: "Salomon Quest 4D", style: "Tactical", weight: 1.2, tags: "tactical, waterproof" },
    foot_lowa_zephyr_gtx: { name: "Lowa Zephyr GTX", style: "Tactical", weight: 1.1, tags: "tactical, waterproof" },
    foot_danner_tanicus: { name: "Danner Tanicus", style: "Tactical", weight: 1.3, tags: "tactical" },
    foot_nike_sfb: { name: "Nike SFB", style: "Military", weight: 1, tags: "military, ventilated" },
    foot_belleville_jungle_boot: { name: "Belleville jungle boot", style: "Military", weight: 1.2, tags: "military, ventilated" },
    foot_arcteryx_leaf_bora_boot: { name: "Arc'teryx LEAF Bora boot", style: "Tactical", weight: 1.5, tags: "tactical, insulated, waterproof" },
    foot_crispi_arctic_boot: { name: "Crispi Arctic boot", style: "Military", weight: 1.8, tags: "military, insulated, waterproof" },
    // Footwear - Protective
    footprot_tacticalleather: { name: "Tactical/Leather", style: "Tactical", weight: 0.05, tags: "-1 to foot checks; Resist: Slashing; Req 1" },
    footprot_carbon_fiber_steel_toe: { name: "Carbon Fiber / Steel Toe", style: "Tactical", weight: 0.1, tags: "-1 to foot checks; Resist: Piercing, Slashing; Req 2" },
    footprot_bomb_suit_boots: { name: "Bomb Suit Boots", style: "Tactical", weight: 1.8, tags: "AC +2; Disadvantage on all foot-based checks; Resist: Force, Piercing, Slashing, Bludgeoning; Req 10" },
    // Uniform Sets
    uniform_bdu_set_shirt_pants: { name: "BDU set (shirt + pants)", style: "Military", weight: 1.6, tags: "military, camo-woodland" },
    uniform_acu_set: { name: "ACU set", style: "Military", weight: 1.6, tags: "military, camo-multicam" },
    uniform_dress_uniform: { name: "Dress uniform", style: "Military", weight: 2, tags: "military, formal" },
    uniform_crye_g3_combat_set: { name: "Crye G3 Combat Set", style: "Tactical", weight: 1.6, tags: "tactical, camo-multicam, ventilated, under-armor" },
    uniform_crye_g3_field_set: { name: "Crye G3 Field Set", style: "Tactical", weight: 1.8, tags: "tactical, camo-multicam, warm" },
    uniform_arcteryx_leaf_assault_set: { name: "Arc'teryx LEAF Assault Set", style: "Tactical", weight: 1.4, tags: "tactical, camo-multicam, waterproof" },
    uniform_ecwcs_gen_iii_cold_weather_set: { name: "ECWCS Gen III cold-weather set", style: "Military", weight: 3.5, tags: "military, camo-multicam, insulated, waterproof" },
    uniform_under_armour_coldgear_base_layer_set: { name: "Under Armour ColdGear base-layer set", style: "Civ/Mil", weight: 0.5, tags: "warm, under-armor" },
    uniform_business_suit_jacket_slacks: { name: "Business suit (jacket + slacks)", style: "Civilian", weight: 1.8, tags: "civilian, formal, conceals-pistol" },
    uniform_casual_civilian_outfit_shirt_jeans: { name: "Casual civilian outfit (shirt + jeans)", style: "Civilian", weight: 1, tags: "civilian" },
  };

  on("change:repeating_clothing:cpreset", (info) => {
    const src = (info && info.sourceAttribute) || "";
    const match = /^(repeating_clothing_[^_]+)_/i.exec(src);
    if (!match) return;
    const rowPrefix = match[1];
    getAttrs([src], (v) => {
      const key = v[src];
      if (!key || key === "custom") return;
      const p = CLOTHING_PRESETS[key];
      if (!p) return;
      const w = p.weight || 0;
      setAttrs({
        [`${rowPrefix}_cname`]:           p.name,
        [`${rowPrefix}_cstyle`]:          p.style,
        [`${rowPrefix}_cweight`]:         w,
        [`${rowPrefix}_cweight_display`]: `${w.toFixed(2)} kg`,
        [`${rowPrefix}_ctags`]:           p.tags,
      });
    });
  });

