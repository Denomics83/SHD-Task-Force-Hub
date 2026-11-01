/* Shade Hub loadout stats. No DOM. Damage per shot and DPS stay null until phase 2. */
(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.ShadeEngine = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  var WEAPONS = ["primary", "secondary", "sidearm"];
  var GEAR = ["mask", "backpack", "chest", "gloves", "holster", "kneepads"];
  var TYPE_STAT = {
    AR: "assaultRifleDamage",
    SMG: "smgDamage",
    LMG: "lmgDamage",
    Rifle: "rifleDamage",
    MMR: "marksmanRifleDamage",
    Shotgun: "shotgunDamage",
    Pistol: "pistolDamage"
  };
  var TYPE_ALIAS = {
    "assault rifle": "AR",
    ar: "AR",
    smg: "SMG",
    "submachine gun": "SMG",
    lmg: "LMG",
    "light machine gun": "LMG",
    rifle: "Rifle",
    mmr: "MMR",
    "marksman rifle": "MMR",
    shotgun: "Shotgun",
    pistol: "Pistol",
    sidearm: "Pistol"
  };

  var STATS = {
    weaponDamage: { name: "Weapon Damage", unit: "%", group: "offense" },
    assaultRifleDamage: { name: "Assault Rifle Damage", unit: "%", group: "offense" },
    smgDamage: { name: "SMG Damage", unit: "%", group: "offense" },
    lmgDamage: { name: "LMG Damage", unit: "%", group: "offense" },
    rifleDamage: { name: "Rifle Damage", unit: "%", group: "offense" },
    marksmanRifleDamage: { name: "Marksman Rifle Damage", unit: "%", group: "offense" },
    shotgunDamage: { name: "Shotgun Damage", unit: "%", group: "offense" },
    pistolDamage: { name: "Pistol Damage", unit: "%", group: "offense" },
    criticalHitChance: { name: "Critical Hit Chance", unit: "%", group: "offense" },
    criticalHitDamage: { name: "Critical Hit Damage", unit: "%", group: "offense" },
    headshotDamage: { name: "Headshot Damage", unit: "%", group: "offense" },
    weaponHandling: { name: "Weapon Handling", unit: "%", group: "offense" },
    damageToArmor: { name: "Damage to Armor", unit: "%", group: "offense" },
    damageToHealth: { name: "Health Damage", unit: "%", group: "offense" },
    damageToTargetOutOfCover: { name: "Damage to Target Out of Cover", unit: "%", group: "offense" },
    rateOfFire: { name: "Rate of Fire", unit: "%", group: "offense" },
    magazineSize: { name: "Magazine Size", unit: "%", group: "offense" },
    extraRounds: { name: "Extra Rounds", unit: "", group: "offense" },
    reloadSpeed: { name: "Reload Speed", unit: "%", group: "offense" },
    stability: { name: "Stability", unit: "%", group: "offense" },
    accuracy: { name: "Accuracy", unit: "%", group: "offense" },
    optimalRange: { name: "Optimal Range", unit: "%", group: "offense" },
    swapSpeed: { name: "Swap Speed", unit: "%", group: "offense" },
    ammoCapacity: { name: "Ammo Capacity", unit: "%", group: "offense" },
    explosiveDamage: { name: "Explosive Damage", unit: "%", group: "offense" },
    totalArmor: { name: "Total Armor", unit: "%", group: "defense" },
    armorFlat: { name: "Armor", unit: "", group: "defense" },
    armorRegen: { name: "Armor Regeneration", unit: "", group: "defense" },
    armorRegenPercent: { name: "Armor Regen", unit: "%", group: "defense" },
    armorOnKill: { name: "Armor on Kill", unit: "", group: "defense" },
    armorOnKillPercent: { name: "Armor on Kill", unit: "%", group: "defense" },
    healthFlat: { name: "Health", unit: "", group: "defense" },
    healthPercent: { name: "Total Health", unit: "%", group: "defense" },
    hazardProtection: { name: "Hazard Protection", unit: "%", group: "defense" },
    explosiveResistance: { name: "Explosive Resistance", unit: "%", group: "defense" },
    pulseResistance: { name: "Pulse Resistance", unit: "%", group: "defense" },
    burnResistance: { name: "Burn Resistance", unit: "%", group: "defense" },
    bleedResistance: { name: "Bleed Resistance", unit: "%", group: "defense" },
    shockResistance: { name: "Shock Resistance", unit: "%", group: "defense" },
    disruptResistance: { name: "Disrupt Resistance", unit: "%", group: "defense" },
    blindDeafResistance: { name: "Blind/Deaf Resistance", unit: "%", group: "defense" },
    disorientResistance: { name: "Disorient Resistance", unit: "%", group: "defense" },
    ensnareResistance: { name: "Ensnare Resistance", unit: "%", group: "defense" },
    protectionFromElites: { name: "Protection from Elites", unit: "%", group: "defense" },
    incomingRepairs: { name: "Incoming Repairs", unit: "%", group: "defense" },
    healthOnKill: { name: "Health on Kill", unit: "%", group: "defense" },
    increasedThreat: { name: "Increased Threat", unit: "%", group: "defense" },
    skillTier: { name: "Skill Tier", unit: "", group: "skill" },
    skillDamage: { name: "Skill Damage", unit: "%", group: "skill" },
    skillHaste: { name: "Skill Haste", unit: "%", group: "skill" },
    skillRepair: { name: "Repair Skills", unit: "%", group: "skill" },
    skillDuration: { name: "Skill Duration", unit: "%", group: "skill" },
    skillHealth: { name: "Skill Health", unit: "%", group: "skill" },
    skillEfficiency: { name: "Skill Efficiency", unit: "%", group: "skill" },
    statusEffects: { name: "Status Effects", unit: "%", group: "skill" },
    outgoingHealing: { name: "Outgoing Healing", unit: "%", group: "skill" },
    damageToElectronics: { name: "Damage to Electronics", unit: "%", group: "skill" },
    burnDuration: { name: "Burn Duration", unit: "%", group: "skill" }
  };

  var ALIAS = {
    "weapon damage": "weaponDamage",
    "critical hit chance": "criticalHitChance",
    "crit hit chance": "criticalHitChance",
    "critical hit damage": "criticalHitDamage",
    "headshot damage": "headshotDamage",
    "weapon handling": "weaponHandling",
    "damage to armor": "damageToArmor",
    "health damage": "damageToHealth",
    "damage to health": "damageToHealth",
    dtoc: "damageToTargetOutOfCover",
    "damage to toc": "damageToTargetOutOfCover",
    "damage to targets out of cover": "damageToTargetOutOfCover",
    "damage to target out of cover": "damageToTargetOutOfCover",
    "dmg to target out of cover": "damageToTargetOutOfCover",
    "assault rifle damage": "assaultRifleDamage",
    "smg damage": "smgDamage",
    "lmg damage": "lmgDamage",
    "rifle damage": "rifleDamage",
    "marksman rifle damage": "marksmanRifleDamage",
    "mmr damage": "marksmanRifleDamage",
    "shotgun damage": "shotgunDamage",
    "pistol damage": "pistolDamage",
    armor: "armorFlat",
    "total armor": "totalArmor",
    "armor regen": "armorRegenPercent",
    "armor regeneration": "armorRegen",
    "armor regeneration %": "armorRegenPercent",
    health: "healthFlat",
    "total health": "healthPercent",
    "hazard protection": "hazardProtection",
    "explosive resistance": "explosiveResistance",
    "skill tier": "skillTier",
    "skill haste": "skillHaste",
    "skill damage": "skillDamage",
    "skill repair": "skillRepair",
    "repair skills": "skillRepair",
    "status effects": "statusEffects",
    "skill duration": "skillDuration",
    "skill health": "skillHealth",
    "skill efficiency": "skillEfficiency",
    "protection from elites": "protectionFromElites",
    "incoming repairs": "incomingRepairs",
    "armor on kill": "armorOnKill",
    "armor on kill %": "armorOnKillPercent",
    "reload speed": "reloadSpeed",
    "reload speed %": "reloadSpeed",
    stability: "stability",
    accuracy: "accuracy",
    "magazine size": "magazineSize",
    "magazine size %": "magazineSize",
    "mag size": "magazineSize",
    "rate of fire": "rateOfFire",
    "rate of fire %": "rateOfFire",
    "optimal range": "optimalRange",
    "swap speed": "swapSpeed",
    "ammo capacity": "ammoCapacity",
    "explosive damage": "explosiveDamage",
    "pulse resistance": "pulseResistance",
    "burn resistance": "burnResistance",
    "bleed resistance": "bleedResistance",
    "ensnare resistance": "ensnareResistance",
    "shock resistance": "shockResistance",
    "disrupt resistance": "disruptResistance",
    "blind/deaf resistance": "blindDeafResistance",
    "disorient resistance": "disorientResistance",
    "increased threat": "increasedThreat",
    "health on kill": "healthOnKill",
    "health on kill %": "healthOnKill",
    "outgoing healing": "outgoingHealing",
    "damage to electronics": "damageToElectronics",
    "burn duration": "burnDuration",
    "extra rounds": "extraRounds"
  };

  function num(value) {
    var n = Number(value);
    return isFinite(n) ? n : 0;
  }

  function round(value, places) {
    var p = Math.pow(10, places == null ? 4 : places);
    return Math.round(value * p) / p;
  }

  function keyOf(name) {
    return String(name || "")
      .toLowerCase()
      .replace(/[%]/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function statId(name) {
    var raw = String(name || "").toLowerCase().replace(/\s+/g, " ").trim();
    if (!raw || raw === "a" || raw === "talent") return "";
    if (ALIAS[raw]) return ALIAS[raw];
    var key = raw.replace(/%/g, "").replace(/\s+/g, " ").trim();
    if (ALIAS[key]) return ALIAS[key];
    if (STATS[name]) return name;
    return "";
  }

  function weaponType(value) {
    var key = keyOf(value);
    return TYPE_ALIAS[key] || value || "";
  }

  function rulesOf(catalog) {
    var rules = (catalog && catalog.rules) || {};
    return {
      criticalHitChanceCap: num(rules.criticalHitChanceCap) || 60,
      skillTierCap: num(rules.skillTierCap) || 6,
      prototypeFactor: num(rules.prototypeFactor) || 1.5,
      skillTierCanPrototype: rules.skillTierCanPrototype === true,
      exoticCanPrototype: rules.exoticCanPrototype === true
    };
  }

  function rows(catalog, bucket) {
    var table = catalog && catalog[bucket];
    return Array.isArray(table) ? table : [];
  }

  function matchRow(list, name) {
    var id = statId(name);
    var key = keyOf(name);
    for (var i = 0; i < list.length; i++) {
      var row = list[i];
      if (!row) continue;
      if (id && (row.id === id || statId(row.name) === id || keyOf(row.name) === key)) return row;
    }
    return null;
  }

  function rangeFor(catalog, name, role, type) {
    var id = statId(name);
    var rules = rulesOf(catalog);
    if (!id) return { id: "", min: 0, max: null, protoMax: null, prototype: false, unit: "" };
    if (id === "skillTier" && !rules.skillTierCanPrototype) {
      return { id: id, min: 0, max: 1, protoMax: 1, prototype: false, unit: "" };
    }
    var row = null;
    if (role === "weapon-core") {
      var cores = (catalog && catalog.weaponCores && catalog.weaponCores[weaponType(type)]) || null;
      if (cores) {
        if (cores.core1 && keyOf(cores.core1.name) === keyOf(name)) row = cores.core1;
        if (cores.core2 && keyOf(cores.core2.name) === keyOf(name)) row = cores.core2;
      }
    } else if (role === "gear-core") {
      row = matchRow(rows(catalog, "gearCores"), name);
    } else if (role === "weapon-minor") {
      row = matchRow(rows(catalog, "weaponMinors"), name);
    } else if (role === "gear-minor") {
      row = matchRow(rows(catalog, "gearMinors"), name);
    } else if (role === "mod") {
      row = matchRow(rows(catalog, "modCaps"), name);
      var cap = row && row.max != null ? num(row.max) : null;
      return { id: id, min: 0, max: cap, protoMax: cap, prototype: false, unit: (row && row.unit) || (STATS[id] ? STATS[id].unit : "") };
    }
    var max = row && row.max != null && row.max !== "" ? num(row.max) : null;
    var protoMax = row && row.protoMax != null && row.protoMax !== "" ? num(row.protoMax) : null;
    if (max != null && protoMax == null && id !== "skillTier") protoMax = round(max * rules.prototypeFactor, 4);
    return {
      id: id,
      min: 0,
      max: max,
      protoMax: protoMax,
      prototype: max != null && protoMax != null && protoMax !== max,
      unit: (row && row.unit) || (STATS[id] ? STATS[id].unit : "")
    };
  }

  function itemIsExotic(item) {
    return keyOf(item && item.rarity) === "exotic";
  }

  function prototypeOn(item, catalog) {
    if (!item || !item.prototype) return false;
    if (itemIsExotic(item) && !rulesOf(catalog).exoticCanPrototype) return false;
    return true;
  }

  function clamp(value, min, max) {
    var n = num(value);
    if (min != null && n < min) n = min;
    if (max != null && n > max) n = max;
    return n;
  }

  function effectiveValue(catalog, item, name, value, role, type, mode, guaranteed) {
    var range = rangeFor(catalog, name, role, type);
    var proto = prototypeOn(item, catalog) && range.prototype;
    var amount = num(value);
    if (!range.id) return { id: "", value: 0, range: range };
    if (proto && guaranteed && keyOf(guaranteed) === keyOf(name)) amount = range.protoMax;
    if (proto && mode === "restricted") amount = range.max;
    else if (proto) amount = clamp(amount, range.max, range.protoMax);
    else if (range.max != null) amount = clamp(amount, range.min, range.max);
    return { id: range.id, value: amount, range: range };
  }

  function addStat(bag, id, value) {
    if (!id || !value) return;
    bag[id] = round((bag[id] || 0) + num(value), 4);
  }

  function parseBonusText(text) {
    if (!text) return [];
    return String(text).split(/\s*[·•|]\s*/).map(function (part) {
      var cleaned = part.replace(/^\+\s*/, "").trim();
      var match = cleaned.match(/^([+-]?\d+(?:\.\d+)?)\s*%?\s+(.+)$/);
      if (!match) return null;
      return { value: num(match[1]), name: match[2].trim() };
    }).filter(Boolean);
  }

  function emptyBag() {
    return {};
  }

  function slot(loadout, key) {
    return (loadout && loadout[key]) || {};
  }

  function named(value) {
    if (!value) return "";
    if (typeof value === "string") return value;
    return value.name || "";
  }

  function isNinja(item, catalog) {
    var name = keyOf(item && item.name);
    if (name.indexOf("ninjabike messenger backpack") >= 0) return true;
    var talent = keyOf(item && item.talent);
    if (talent === "resourceful" && name.indexOf("ninjabike") >= 0) return true;
    var sets = (catalog && catalog.gearsets) || [];
    void sets;
    return false;
  }

  function rarityOf(item) {
    var rarity = keyOf(item && item.rarity);
    if (rarity === "gearset" || rarity === "gear set" || rarity === "set") return "gear-set";
    return rarity;
  }

  function brandKey(item) {
    return (item && (item.brand || item.name)) || "";
  }

  function findByName(list, name) {
    var key = keyOf(name);
    if (!key || !list) return null;
    for (var i = 0; i < list.length; i++) {
      if (keyOf(list[i] && list[i].name) === key) return list[i];
      var aliases = (list[i] && list[i].aliases) || [];
      for (var a = 0; a < aliases.length; a++) if (keyOf(aliases[a]) === key) return list[i];
    }
    return null;
  }

  function pieceCounts(loadout, catalog) {
    var brands = {};
    var sets = {};
    var ninja = false;
    GEAR.forEach(function (key) {
      var item = slot(loadout, key);
      if (!item.name) return;
      if (isNinja(item, catalog)) {
        ninja = true;
        return;
      }
      var rarity = rarityOf(item);
      if (rarity === "gear-set") {
        var setName = item.brand || item.name;
        sets[setName] = (sets[setName] || 0) + 1;
        return;
      }
      if (rarity === "exotic") return;
      if (item.brand) brands[item.brand] = (brands[item.brand] || 0) + 1;
    });
    if (ninja) {
      Object.keys(sets).forEach(function (name) { sets[name] += 1; });
      Object.keys(brands).forEach(function (name) { brands[name] += 1; });
    }
    return { brands: brands, sets: sets, ninja: ninja };
  }

  function applyNamed(bag, name, value) {
    addStat(bag, statId(name), value);
  }

  function contributeItem(bag, catalog, item, kind, mode) {
    if (!item || !item.name) return;
    var type = item.type;
    var guaranteed = item.guaranteed || "";
    function take(name, value, role) {
      if (!name || value == null || value === "") return;
      var hit = effectiveValue(catalog, item, name, value, role, type, mode, guaranteed);
      addStat(bag, hit.id, hit.value);
    }
    if (kind === "weapon") {
      take(item.core, item.coreValue, "weapon-core");
      take(item.core2, item.core2Value, "weapon-core");
      (item.attributes || []).forEach(function (attr) {
        take(attr.name || attr.stat, attr.value, "weapon-minor");
      });
    } else {
      take(item.core, item.coreValue, "gear-core");
      (item.attributes || []).forEach(function (attr) {
        take(attr.name || attr.stat, attr.value, "gear-minor");
      });
      if (item.mod) take(item.mod, item.modValue, "mod");
    }
    (item.mods || []).forEach(function (mod) {
      if (!mod) return;
      take(mod.stat, mod.value, "mod");
      if (mod.statNeg) addStat(bag, statId(mod.statNeg), num(mod.valueNeg));
    });
  }

  function watchPoints(loadout, catalog) {
    var watch = (loadout && loadout.watch) || {};
    var nodes = (catalog && catalog.watch) || [];
    var points = watch.points || {};
    var out = [];
    nodes.forEach(function (node) {
      var spent = watch.max ? num(node.points || catalog.watchPoints || 50) : num(points[node.id]);
      var cap = num(node.points || catalog.watchPoints || 50);
      if (spent > cap) spent = cap;
      if (spent < 0) spent = 0;
      var value = round(spent * num(node.perPoint), 4);
      if (node.max != null && value > num(node.max)) value = num(node.max);
      out.push({ id: node.id, name: node.name, group: node.group, points: spent, value: value, unit: node.unit || "%" });
    });
    return out;
  }

  function specializationOf(loadout, catalog) {
    var name = named(loadout && loadout.specialization);
    var list = (catalog && catalog.specializations) || [];
    return findByName(list, name);
  }

  function expertiseWeaponDamage(loadout) {
    var primary = slot(loadout, "primary");
    if (!primary.name) return 0;
    return num(primary.expertise);
  }

  function armorMath(loadout, bag, catalog) {
    var armor = (catalog && catalog.armor) || {};
    var pieces = armor.pieces || {};
    var base = 0;
    var expertise = 0;
    GEAR.forEach(function (key) {
      var item = slot(loadout, key);
      if (!item.name) return;
      var piece = num(pieces[key]);
      base += piece;
      expertise += piece * (num(item.expertise) / 100);
    });
    var flatCores = num(bag.armorFlat);
    var before = base + flatCores + expertise;
    var percent = num(bag.totalArmor);
    return {
      pieceBase: round(base, 2),
      expertise: round(expertise, 2),
      cores: round(flatCores, 2),
      beforePercent: round(before, 2),
      totalArmorPercent: percent,
      total: Math.round(before * (1 + percent / 100))
    };
  }

  function healthMath(bag, catalog) {
    var base = catalog && catalog.armor ? catalog.armor.baseHealth : null;
    var flat = num(bag.healthFlat);
    var percent = num(bag.healthPercent);
    if (base == null || base === "") {
      return { base: null, flat: flat, percent: percent, total: null };
    }
    return {
      base: num(base),
      flat: flat,
      percent: percent,
      total: Math.round((num(base) + flat) * (1 + percent / 100))
    };
  }

  function bonusBlock(name, pieces, have, text, talentName, talentText) {
    var applied = [];
    if (have >= pieces && text) {
      parseBonusText(text).forEach(function (row) {
        applied.push({ name: row.name, id: statId(row.name), value: row.value });
      });
    }
    var talent = have >= 4 && talentName ? { name: talentName, text: talentText || "" } : null;
    return { name: name, pieces: have, need: pieces, applied: applied, talent: talent };
  }

  function buckets(stats, loadout) {
    var primary = slot(loadout, "primary");
    var typeId = TYPE_STAT[weaponType(primary.type)] || "";
    var wd = num(stats.weaponDamage);
    var typed = typeId ? num(stats[typeId]) : 0;
    return {
      weaponAndType: {
        weaponDamage: wd,
        weaponType: typeId,
        weaponTypeDamage: typed,
        factor: round(1 + (wd + typed) / 100, 6)
      },
      totalWeaponDamage: { factor: 1, pending: "phase-2" },
      critHead: {
        criticalHitChance: num(stats.criticalHitChance),
        criticalHitDamage: num(stats.criticalHitDamage),
        headshotDamage: num(stats.headshotDamage)
      },
      amplified: [],
      damageToArmor: round(1 + num(stats.damageToArmor) / 100, 6),
      damageToHealth: round(1 + num(stats.damageToHealth) / 100, 6),
      damageToTargetOutOfCover: round(1 + num(stats.damageToTargetOutOfCover) / 100, 6)
    };
  }

  function groupRows(stats) {
    var groups = { offense: [], defense: [], skill: [] };
    Object.keys(STATS).forEach(function (id) {
      if (!stats[id]) return;
      var meta = STATS[id];
      groups[meta.group].push({ id: id, name: meta.name, value: stats[id], unit: meta.unit });
    });
    return groups;
  }

  function compute(loadout, catalog) {
    loadout = loadout || {};
    catalog = catalog || {};
    var mode = loadout.mode === "restricted" ? "restricted" : "normal";
    var rules = rulesOf(catalog);
    var bag = emptyBag();
    WEAPONS.forEach(function (key) { contributeItem(bag, catalog, slot(loadout, key), "weapon", mode); });
    GEAR.forEach(function (key) { contributeItem(bag, catalog, slot(loadout, key), "gear", mode); });
    addStat(bag, "weaponDamage", expertiseWeaponDamage(loadout));

    var counts = pieceCounts(loadout, catalog);
    var bonuses = [];
    Object.keys(counts.brands).forEach(function (name) {
      var row = findByName(catalog.brands, name);
      if (!row) {
        bonuses.push({ name: name, pieces: counts.brands[name], missing: true, applied: [] });
        return;
      }
      [1, 2, 3].forEach(function (piece) {
        var block = bonusBlock(name, piece, counts.brands[name], row["bonus" + piece]);
        if (block.applied.length) {
          block.applied.forEach(function (stat) { addStat(bag, stat.id, stat.value); });
          bonuses.push(block);
        }
      });
    });
    Object.keys(counts.sets).forEach(function (name) {
      var row = findByName(catalog.gearsets, name);
      var have = counts.sets[name];
      if (!row) {
        bonuses.push({ name: name, pieces: have, missing: true, applied: [] });
        return;
      }
      [{ need: 2, text: row.bonus2 }, { need: 3, text: row.bonus3 }].forEach(function (tier) {
        var block = bonusBlock(name, tier.need, have, tier.text);
        if (block.applied.length) {
          block.applied.forEach(function (stat) { addStat(bag, stat.id, stat.value); });
          bonuses.push(block);
        }
      });
      if (have >= 4 && row.talent) {
        bonuses.push({
          name: name,
          pieces: have,
          need: 4,
          applied: [],
          talent: { name: row.talent, text: row.talentText || "" }
        });
      }
    });

    var watch = watchPoints(loadout, catalog);
    watch.forEach(function (node) { addStat(bag, node.id, node.value); });

    var spec = specializationOf(loadout, catalog);
    var specApplied = [];
    var specNoted = [];
    if (spec) {
      (spec.stats || []).forEach(function (row) {
        if (row.counts === false) specNoted.push(row);
        else {
          specApplied.push(row);
          addStat(bag, statId(row.name), row.value);
        }
      });
    }

    var chc = num(bag.criticalHitChance);
    var tier = num(bag.skillTier);
    var armor = armorMath(loadout, bag, catalog);
    var health = healthMath(bag, catalog);
    var grouped = groupRows(bag);
    var built = buckets(bag, loadout);
    return {
      mode: mode,
      stats: bag,
      groups: grouped,
      criticalHitChance: chc,
      criticalHitChanceCapped: Math.min(rules.criticalHitChanceCap, chc),
      criticalHitChanceCap: rules.criticalHitChanceCap,
      skillTier: tier,
      skillTierEffective: Math.min(rules.skillTierCap, tier),
      skillTierCap: rules.skillTierCap,
      overcharge: tier > rules.skillTierCap,
      armor: armor,
      health: health,
      bonuses: bonuses,
      watch: watch,
      ninja: counts.ninja,
      specialization: spec ? { name: spec.name, applied: specApplied, noted: specNoted } : { name: named(loadout.specialization), applied: [], noted: [] },
      buckets: built,
      damage: {
        phase: 2,
        perShot: null,
        crit: null,
        headshot: null,
        dps: null,
        buckets: built
      }
    };
  }

  return {
    STATS: STATS,
    WEAPONS: WEAPONS,
    GEAR: GEAR,
    statId: statId,
    parseBonusText: parseBonusText,
    rangeFor: rangeFor,
    weaponType: weaponType,
    compute: compute,
    buckets: function (loadout, catalog) {
      return compute(loadout, catalog).buckets;
    },
    damage: function (loadout, catalog) {
      return compute(loadout, catalog).damage;
    }
  };
});
