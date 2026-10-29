/* Shade Task Force — seed builds Y8S3 Red Horizon (Overgear Sep 2026).
   Attribute lines are priorities only — no invented numeric rolls.
   Gear fields: attrs = priority secondaries; mods = recommended gear mods
   (empty when the slot/exotic has no mod). Gloves & Holster have no mod slots. */
window.CLAN_BUILDS = [
  {
    id: "solo-hybrid-core-memento",
    name: "Solo Hybrid — Core Strength + Memento",
    shortName: "Core + Memento",
    categories: ["solo-hybrid", "hardcore"],
    categoryLabel: "Solo Hybrid",
    specialization: { name: "Technician", icon: "assets/icons/specializations/technician.png" },
    weapons: [
      { slot: "Primary", name: "Capacitor", alt: "or St. Elmo's Engine", rarity: "exotic", note: "AR" },
      { slot: "Secondary", name: "Scorpio", rarity: "exotic", note: "Shotgun" },
      { slot: "Sidearm", name: "Any HE pistol", rarity: "highend", note: "—" }
    ],
    gear: [
      { slot: "Mask", name: "Core Strength", rarity: "gearset", icon: "assets/icons/gearsets/core-strength.png", cores: ["r"], talent: null, attrs: ["CHC", "CHD"], mods: ["CHC"] },
      { slot: "Chest", name: "Core Strength", rarity: "gearset", icon: "assets/icons/gearsets/core-strength.png", cores: ["r"], talent: null, attrs: ["CHC", "CHD"], mods: ["CHD"] },
      { slot: "Backpack", name: "Memento", rarity: "exotic", icon: "assets/icons/exotics/memento.png", cores: ["r", "b", "y"], talent: "Trophies", attrs: ["CHC", "CHD"], mods: [] },
      { slot: "Gloves", name: "Core Strength", rarity: "gearset", icon: "assets/icons/gearsets/core-strength.png", cores: ["r"], talent: null, attrs: ["CHC", "CHD"], mods: [] },
      { slot: "Holster", name: "Picaro's Holster", rarity: "exotic", icon: null, letter: "P", cores: ["r"], talent: "—", attrs: ["CHC", "CHD"], mods: [] },
      { slot: "Kneepads", name: "Core Strength", rarity: "gearset", icon: "assets/icons/gearsets/core-strength.png", cores: ["r"], talent: null, attrs: ["CHC", "CHD"], mods: ["CHD"] }
    ],
    skills: [
      { slot: "Skill 1", name: "Crusader Shield" },
      { slot: "Skill 2", name: "Striker Drone" }
    ],
    stats: [
      { label: "CHC", value: "Priority" },
      { label: "CHD", value: "Priority" },
      { label: "Armor", value: "Secondary" },
      { label: "Skill Tier", value: "Tech + Memento" },
      { label: "Role", value: "Solo survive" }
    ],
    playstyle: "Pickup Memento trophies between waves. Fight from cover with shield; Scorpio is the panic button.",
    hardcore: "Keep an escape route — don't greed trophies in the open."
  },
  {
    id: "armor-regen-solo",
    name: "Armor Regen — Solo Fallback",
    shortName: "Armor Regen",
    categories: ["solo-hybrid", "hardcore"],
    categoryLabel: "Solo Hybrid",
    specialization: { name: "Technician", icon: "assets/icons/specializations/technician.png" },
    weapons: [
      { slot: "Primary", name: "Any AR / MMR", alt: "", rarity: "highend", note: "Range" },
      { slot: "Secondary", name: "Scorpio", rarity: "exotic", note: "Optional" },
      { slot: "Sidearm", name: "—", rarity: "", note: "—" }
    ],
    gear: [
      { slot: "Mask", name: "Golan / Belstone", rarity: "brand", icon: "assets/icons/brands/belstone.png", cores: ["b"], talent: null, attrs: ["Armor Regen", "Haz Prot"], mods: ["Armor Regen"] },
      { slot: "Chest", name: "Golan / Belstone", rarity: "named", icon: "assets/icons/brands/belstone.png", cores: ["b"], talent: "Unbreakable", attrs: ["Armor Regen", "Haz Prot"], mods: ["Armor Regen"] },
      { slot: "Backpack", name: "NinjaBike", rarity: "exotic", icon: null, letter: "NB", cores: ["b"], talent: "Brand mix", attrs: ["Armor Regen", "Haz Prot"], mods: [] },
      { slot: "Gloves", name: "Gila Guard", rarity: "brand", icon: "assets/icons/brands/gila-logo.png", cores: ["b"], talent: null, attrs: ["Armor Regen", "Haz Prot"], mods: [] },
      { slot: "Holster", name: "Belstone", rarity: "brand", icon: "assets/icons/brands/belstone.png", cores: ["b"], talent: null, attrs: ["Armor Regen"], mods: [] },
      { slot: "Kneepads", name: "Emperor's Guard", rarity: "named", icon: null, letter: "EG", cores: ["b"], talent: "Armor regen", attrs: ["Armor Regen", "Haz Prot"], mods: ["Armor Regen"] }
    ],
    skills: [
      { slot: "Skill 1", name: "Decoy" },
      { slot: "Skill 2", name: "Reviver Hive" }
    ],
    stats: [
      { label: "Armor", value: "Max" },
      { label: "Armor Regen", value: "Priority" },
      { label: "Hazard Prot.", value: "Nice" },
      { label: "CHC / CHD", value: "—" },
      { label: "Role", value: "Forgiving solo" }
    ],
    playstyle: "Slow and safe. Regen + Unbreakable carry mistakes. Decoy pulls heat; Reviver is insurance.",
    hardcore: "Maximum forgiveness. Skip self-damage skills (fire / seekers)."
  },
  {
    id: "duo-tank-foundry",
    name: "Team Tank — Foundry Bulwark",
    shortName: "Foundry Tank",
    categories: ["team-tank", "hardcore"],
    categoryLabel: "Team Tank",
    specialization: { name: "Technician", icon: "assets/icons/specializations/technician.png" },
    weapons: [
      { slot: "Primary", name: "Any SMG / AR", rarity: "highend", note: "Threat" },
      { slot: "Secondary", name: "—", rarity: "", note: "—" },
      { slot: "Sidearm", name: "Liberty", rarity: "exotic", note: "Shield repair" }
    ],
    gear: [
      { slot: "Mask", name: "Foundry Bulwark", rarity: "gearset", icon: "assets/icons/gearsets/foundry-bulwark.png", cores: ["b"], talent: null, attrs: ["Armor Regen", "Haz Prot"], mods: ["Armor Regen"] },
      { slot: "Chest", name: "Pointman", rarity: "named", icon: "assets/icons/brands/gila-logo.png", cores: ["b"], talent: "Perfect Vanguard", attrs: ["Armor Regen", "Haz Prot"], mods: ["Armor Regen"] },
      { slot: "Backpack", name: "Foundry Bulwark", rarity: "gearset", icon: "assets/icons/gearsets/foundry-bulwark.png", cores: ["b"], talent: null, attrs: ["Armor Regen"], mods: ["Armor Regen"] },
      { slot: "Gloves", name: "Foundry Bulwark", rarity: "gearset", icon: "assets/icons/gearsets/foundry-bulwark.png", cores: ["b"], talent: null, attrs: ["Armor Regen"], mods: [] },
      { slot: "Holster", name: "Foundry / flex", rarity: "gearset", icon: "assets/icons/gearsets/foundry-bulwark.png", cores: ["b"], talent: null, attrs: ["Armor Regen"], mods: [] },
      { slot: "Kneepads", name: "Foundry Bulwark", rarity: "gearset", icon: "assets/icons/gearsets/foundry-bulwark.png", cores: ["b"], talent: null, attrs: ["Armor Regen", "Haz Prot"], mods: ["Prot. Elites"] }
    ],
    skills: [
      { slot: "Skill 1", name: "Bulwark Shield" },
      { slot: "Skill 2", name: "Artificer Hive" }
    ],
    stats: [
      { label: "Armor", value: "Max" },
      { label: "Shield HP", value: "Priority" },
      { label: "Skill Tier", value: "Technician" },
      { label: "WD", value: "Low" },
      { label: "Role", value: "Frontline" }
    ],
    playstyle: "Hold front. Perfect Vanguard feeds bonus armour to mates. Liberty headshots repair Bulwark Shield.",
    hardcore: "Pair with DPS Support. Don't overextend alone."
  },
  {
    id: "duo-skill-refactor",
    name: "Skill Support — Refactor + Capacitor",
    shortName: "Refactor",
    categories: ["skill-support", "hardcore"],
    categoryLabel: "Skill Support",
    specialization: { name: "Technician", icon: "assets/icons/specializations/technician.png" },
    weapons: [
      { slot: "Primary", name: "Capacitor", rarity: "exotic", note: "Skill feed" },
      { slot: "Secondary", name: "—", rarity: "", note: "Flex" },
      { slot: "Sidearm", name: "—", rarity: "", note: "—" }
    ],
    gear: [
      { slot: "Mask", name: "Refactor", rarity: "gearset", icon: "assets/icons/gearsets/refactor.png", cores: ["y"], talent: null, attrs: ["Skill Dmg", "Skill Haste"], mods: ["Skill Dmg"] },
      { slot: "Chest", name: "Wyvern Wear", rarity: "brand", icon: "assets/icons/brands/wyvern-wear.png", cores: ["y"], talent: "Kinetic Momentum", attrs: ["Skill Dmg", "Skill Haste"], mods: ["Skill Dmg"] },
      { slot: "Backpack", name: "Force Multiplier", rarity: "named", icon: "assets/icons/brands/hana-u-logo.png", cores: ["y"], talent: "Perfect Combined Arms", attrs: ["Skill Dmg", "Skill Haste"], mods: ["Skill Haste"] },
      { slot: "Gloves", name: "Refactor", rarity: "gearset", icon: "assets/icons/gearsets/refactor.png", cores: ["y"], talent: null, attrs: ["Skill Dmg", "Skill Haste"], mods: [] },
      { slot: "Holster", name: "Refactor", rarity: "gearset", icon: "assets/icons/gearsets/refactor.png", cores: ["y"], talent: null, attrs: ["Skill Dmg"], mods: [] },
      { slot: "Kneepads", name: "Refactor", rarity: "gearset", icon: "assets/icons/gearsets/refactor.png", cores: ["y"], talent: null, attrs: ["Skill Dmg", "Skill Haste"], mods: ["Skill Dmg"] }
    ],
    skills: [
      { slot: "Skill 1", name: "Striker Drone" },
      { slot: "Skill 2", name: "Assault Turret" }
    ],
    stats: [
      { label: "Skill Tier", value: "Max" },
      { label: "Skill Dmg", value: "Priority" },
      { label: "Skill Haste", value: "Nice" },
      { label: "Armor", value: "From Refactor" },
      { label: "Role", value: "Skill DPS" }
    ],
    playstyle: "Drone + turret up; keep Capacitor stacks. Refactor repairs armour from skill damage.",
    hardcore: "Safe when the duo splits. Non-skill fallback for Keener."
  },
  {
    id: "duo-healer-fi",
    name: "Healer — Future Initiative",
    shortName: "FI Healer",
    categories: ["healer", "hardcore"],
    categoryLabel: "Healer",
    specialization: { name: "Survivalist", icon: "assets/icons/specializations/survivalist.png" },
    weapons: [
      { slot: "Primary", name: "Support AR", rarity: "highend", note: "Comfort" },
      { slot: "Secondary", name: "—", rarity: "", note: "—" },
      { slot: "Sidearm", name: "—", rarity: "", note: "—" }
    ],
    gear: [
      { slot: "Mask", name: "Future Initiative", rarity: "gearset", icon: "assets/icons/gearsets/future-initiative.png", cores: ["y"], talent: null, attrs: ["Repair Skills", "Skill Haste"], mods: ["Repair Skills"] },
      { slot: "Chest", name: "Future Initiative", rarity: "gearset", icon: "assets/icons/gearsets/future-initiative.png", cores: ["y"], talent: null, attrs: ["Repair Skills", "Skill Haste"], mods: ["Repair Skills"] },
      { slot: "Backpack", name: "Alps Summit", rarity: "named", icon: "assets/icons/brands/alps-logo.png", cores: ["y"], talent: "Opportunistic", attrs: ["Repair Skills", "Skill Haste"], mods: ["Skill Haste"] },
      { slot: "Gloves", name: "BTSU Gloves", rarity: "exotic", icon: null, letter: "BT", cores: ["y"], talent: "Overcharge", attrs: ["Repair Skills", "Skill Haste"], mods: [] },
      { slot: "Holster", name: "Future Initiative", rarity: "gearset", icon: "assets/icons/gearsets/future-initiative.png", cores: ["y"], talent: null, attrs: ["Repair Skills", "Skill Haste"], mods: [] },
      { slot: "Kneepads", name: "Future Initiative", rarity: "gearset", icon: "assets/icons/gearsets/future-initiative.png", cores: ["y"], talent: null, attrs: ["Repair Skills", "Skill Haste"], mods: ["Repair Skills"] }
    ],
    skills: [
      { slot: "Skill 1", name: "Restorer Hive" },
      { slot: "Skill 2", name: "Reinforcer Chem" }
    ],
    stats: [
      { label: "Skill Repair", value: "Priority" },
      { label: "Skill Haste", value: "Priority" },
      { label: "Skill Tier", value: "Heal focus" },
      { label: "WD", value: "—" },
      { label: "Role", value: "Team heal" }
    ],
    playstyle: "Hive near DPS mate; refresh armour with Reinforcer Chem. FI buffs damage at full armour.",
    hardcore: "Pairs with DPS Support. Your death ends the duo — stay in cover."
  },
  {
    id: "duo-dps-striker",
    name: "DPS Support — St. Elmo's Striker",
    shortName: "Striker DPS",
    categories: ["dps-support", "solo-damage", "hardcore"],
    categoryLabel: "DPS Support",
    specialization: { name: "Gunner", icon: "assets/icons/specializations/gunner.png" },
    weapons: [
      { slot: "Primary", name: "St. Elmo's Engine", rarity: "exotic", note: "AR" },
      { slot: "Secondary", name: "Flex DPS", rarity: "highend", note: "—" },
      { slot: "Sidearm", name: "—", rarity: "", note: "—" }
    ],
    gear: [
      { slot: "Mask", name: "Striker's Battlegear", rarity: "gearset", icon: "assets/icons/gearsets/strikers-battlegear.png", cores: ["r"], talent: null, attrs: ["CHC", "CHD"], mods: ["CHC"] },
      { slot: "Chest", name: "Grupo / Ceska / Fenris", rarity: "brand", icon: "assets/icons/brands/grupo-logo.png", cores: ["r"], talent: "Obliterate", attrs: ["CHC", "CHD"], mods: ["CHD"] },
      { slot: "Backpack", name: "Memento", rarity: "exotic", icon: "assets/icons/exotics/memento.png", cores: ["r", "b", "y"], talent: "Trophies", attrs: ["CHC", "CHD"], mods: [] },
      { slot: "Gloves", name: "Striker's Battlegear", rarity: "gearset", icon: "assets/icons/gearsets/strikers-battlegear.png", cores: ["r"], talent: null, attrs: ["CHC", "CHD"], mods: [] },
      { slot: "Holster", name: "Striker's Battlegear", rarity: "gearset", icon: "assets/icons/gearsets/strikers-battlegear.png", cores: ["r"], talent: null, attrs: ["CHC", "CHD"], mods: [] },
      { slot: "Kneepads", name: "Striker's Battlegear", rarity: "gearset", icon: "assets/icons/gearsets/strikers-battlegear.png", cores: ["r"], talent: null, attrs: ["CHC", "CHD"], mods: ["CHD"] }
    ],
    skills: [
      { slot: "Skill 1", name: "Crusader Shield" },
      { slot: "Skill 2", name: "Reviver Hive" }
    ],
    stats: [
      { label: "CHC", value: "~60% first" },
      { label: "CHD", value: "Stack after" },
      { label: "WD", value: "Red cores" },
      { label: "Armor", value: "Memento / shield" },
      { label: "Role", value: "Primary DPS" }
    ],
    playstyle: "Build Striker stacks behind Crusader Shield. Cap CHC before CHD. Memento fills survivability.",
    hardcore: "Always Reviver Hive. Pair with Team Tank or Healer."
  }
];

window.BUILD_FILTERS = [
  { id: "all", label: "All" },
  { id: "solo-hybrid", label: "Solo Hybrid" },
  { id: "solo-damage", label: "Solo Damage" },
  { id: "team-tank", label: "Team Tank" },
  { id: "skill-support", label: "Skill Support" },
  { id: "dps-support", label: "DPS Support" },
  { id: "healer", label: "Healer" },
  { id: "hardcore", label: "Hardcore" }
];
