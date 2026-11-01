/* Turns data/td2 JSON into the tables the stats engine reads. Missing fields stay empty. */
(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.ShadeCatalog = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  var WEAPONS = ["primary", "secondary", "sidearm"];
  var GEAR = ["mask", "backpack", "chest", "gloves", "holster", "kneepads"];
  var FILES = [
    "weapons", "brands", "gearsets", "named", "exotics", "attributes", "talents",
    "skills", "specializations", "grenades", "playstyles"
  ];
  var BUILDER_FILES = ["attributes", "weapon-cores", "watch", "specializations", "armor", "rules", "mods", "core-rules"];
  var GEAR_CORES = ["Weapon Damage", "Armor", "Skill Tier"];

  function list(doc, key) {
    if (!doc) return [];
    if (Array.isArray(doc)) return doc;
    if (key && Array.isArray(doc[key])) return doc[key];
    if (Array.isArray(doc.items)) return doc.items;
    return [];
  }

  function keyOf(name) {
    return String(name || "").toLowerCase().replace(/[%]/g, "").replace(/\s+/g, " ").trim();
  }

  function byName(items) {
    var map = {};
    (items || []).forEach(function (item) {
      if (item && item.name) map[keyOf(item.name)] = item;
    });
    return map;
  }

  function adapt(files) {
    files = files || {};
    var attributes = files.attributes || {};
    var extra = files.builderAttributes || {};
    var minors = list(attributes, "minors").concat(list(extra, "gearMinors"));
    var cores = (files.weaponCores && files.weaponCores.types) || {};
    var watchDoc = files.watch || {};
    var namedDoc = files.named || {};
    var namedGear = list(namedDoc, "gear");
    var namedWeapons = list(namedDoc, "weapons");
    var weapons = list(files.weapons, "items");
    var exotics = list(files.exotics, "items");
    var specDetails = list(files.specializations, "details");
    var specStats = list(files.builderSpecs, "items");
    if (!specStats.length) specStats = list(files.specializations, "items").filter(function (row) { return row && row.stats; });
    var specNames = list(files.specializations, "items").filter(function (row) { return typeof row === "string"; });
    specNames.forEach(function (name) {
      if (!specStats.some(function (row) { return row.name === name; })) specStats.push({ name: name, stats: [] });
    });
    return {
      weapons: weapons,
      weaponTypes: (files.weapons && files.weapons.types) || ["AR", "SMG", "LMG", "Rifle", "MMR", "Shotgun", "Pistol"],
      namedWeapons: namedWeapons,
      namedGear: namedGear,
      brands: list(files.brands, "items"),
      gearsets: list(files.gearsets, "items"),
      exotics: exotics,
      skills: list(files.skills, "items"),
      talents: {
        weapon: list(files.talents, "weapon"),
        chest: list(files.talents, "chest"),
        backpack: list(files.talents, "backpack")
      },
      gearCores: list(attributes, "cores"),
      gearMinors: minors.filter(function (row) { return !row.group || row.group === "gear"; }),
      weaponMinors: minors.filter(function (row) { return row.group === "weapon"; }),
      modCaps: list(attributes, "modCaps"),
      modNames: list(attributes, "mods"),
      weaponCores: cores,
      watch: watchDoc.nodes || [],
      watchPoints: watchDoc.pointsPerNode || 50,
      specializations: specStats,
      specDetails: specDetails,
      grenades: list(files.grenades, "items"),
      playstyles: list(files.playstyles),
      armor: files.armor || {},
      rules: files.rules || {},
      weaponMods: (files.mods && files.mods.slots) || {},
      coreRules: files.coreRules || { open: GEAR_CORES, items: [] },
      namedWeaponByName: byName(namedWeapons),
      namedGearByName: byName(namedGear),
      exoticByName: byName(exotics),
      weaponByName: byName(weapons)
    };
  }

  async function load(fetchJSON) {
    var files = {};
    var errors = [];
    await Promise.all(FILES.map(async function (name) {
      try { files[name] = await fetchJSON("data/td2/" + name + ".json"); }
      catch (err) {
        files[name] = null;
        errors.push(name + ": " + (err && err.message ? err.message : String(err)));
      }
    }));
    await Promise.all(BUILDER_FILES.map(async function (name) {
      var key = name === "attributes" ? "builderAttributes" : name === "weapon-cores" ? "weaponCores" : name === "specializations" ? "builderSpecs" : name === "core-rules" ? "coreRules" : name;
      try { files[key] = await fetchJSON("data/td2/builder/" + name + ".json"); }
      catch (err) { errors.push(name + ": " + (err && err.message ? err.message : String(err))); }
    }));
    var catalog = adapt({
      weapons: files.weapons,
      brands: files.brands,
      gearsets: files.gearsets,
      named: files.named,
      exotics: files.exotics,
      attributes: files.attributes,
      talents: files.talents,
      skills: files.skills,
      specializations: files.specializations,
      grenades: files.grenades,
      playstyles: files.playstyles,
      builderAttributes: files.builderAttributes,
      weaponCores: files.weaponCores,
      watch: files.watch,
      builderSpecs: files.builderSpecs,
      armor: files.armor,
      rules: files.rules,
      mods: files.mods,
      coreRules: files.coreRules
    });
    catalog.errors = errors;
    return catalog;
  }

  function emptyWeapon() {
    return {
      name: "", catalogId: "", type: "", rarity: "", talent: "", talentLocked: false,
      prototype: false, expertise: 0, guaranteed: "",
      core: "", coreValue: "", coreMax: false, core2: "", core2Value: "", core2Max: false,
      attributes: [], mods: []
    };
  }

  function emptyGear() {
    return {
      name: "", catalogId: "", brand: "", rarity: "", talent: "", talentLocked: false,
      prototype: false, expertise: 0, guaranteed: "",
      core: "", coreValue: "", coreMax: false, coreLocked: false,
      attributes: [], mod: "", modValue: ""
    };
  }

  function emptySkill() {
    return { name: "", catalogId: "", variant: "", expertise: 0 };
  }

  function blank(watchNodes) {
    var points = {};
    (watchNodes || []).forEach(function (node) { points[node.id] = 0; });
    return {
      version: 1,
      mode: "normal",
      specialization: { name: "" },
      grenade: { name: "" },
      watch: { max: false, points: points },
      primary: emptyWeapon(),
      secondary: emptyWeapon(),
      sidearm: emptyWeapon(),
      mask: emptyGear(),
      backpack: emptyGear(),
      chest: emptyGear(),
      gloves: emptyGear(),
      holster: emptyGear(),
      kneepads: emptyGear(),
      skill1: emptySkill(),
      skill2: emptySkill()
    };
  }

  function copy(value) {
    return JSON.parse(JSON.stringify(value || {}));
  }

  function sameName(a, b) {
    return String(a || "").toLowerCase().replace(/\s+/g, " ").trim() === String(b || "").toLowerCase().replace(/\s+/g, " ").trim() && String(a || "").trim() !== "";
  }

  function applyLegacyMax(item) {
    if (!item || !item.guaranteed) return;
    if (sameName(item.core, item.guaranteed)) item.coreMax = true;
    if (sameName(item.core2, item.guaranteed)) item.core2Max = true;
    if (sameName(item.mod, item.guaranteed)) item.modMax = true;
    (item.attributes || []).forEach(function (attr) {
      if (sameName(attr.name, item.guaranteed)) attr.maxed = true;
    });
  }

  function fromSaved(record, catalog) {
    var next = blank(catalog && catalog.watch);
    var load = (record && record.loadout) || record || {};
    next.mode = load.mode === "restricted" ? "restricted" : "normal";
    next.version = 1;
    if (load.watch && load.watch.points) next.watch = copy(load.watch);
    else if (load.watch && load.watch.max) next.watch.max = true;
    var specName = "";
    if (typeof load.specialization === "string") specName = load.specialization;
    else if (load.specialization && load.specialization.name) specName = load.specialization.name;
    next.specialization = { name: specName };
    if (typeof load.grenade === "string") next.grenade = { name: load.grenade, catalogId: "" };
    else if (load.grenade && load.grenade.name && load.grenade.name !== "SHD Watch") {
      next.grenade = {
        name: load.grenade.name,
        catalogId: load.grenade.catalogId || "",
        specialization: load.grenade.specialization || ""
      };
    } else next.grenade = { name: "", catalogId: "" };
    var knownGrenade = ((catalog && catalog.grenades) || []).filter(function (row) {
      return sameName(row.name, next.grenade.name);
    })[0];
    if (knownGrenade) {
      if (!next.grenade.catalogId) next.grenade.catalogId = knownGrenade.id || "";
      if (!next.grenade.specialization) next.grenade.specialization = knownGrenade.specialization || "";
    }
    WEAPONS.forEach(function (key) {
      if (load[key]) next[key] = Object.assign(emptyWeapon(), copy(load[key]));
      if (!Array.isArray(next[key].attributes)) next[key].attributes = [];
      if (!Array.isArray(next[key].mods)) next[key].mods = [];
      applyLegacyMax(next[key]);
    });
    GEAR.forEach(function (key) {
      if (load[key]) next[key] = Object.assign(emptyGear(), copy(load[key]));
      if (!Array.isArray(next[key].attributes)) next[key].attributes = [];
      if (next[key].mod && typeof next[key].mod === "object") {
        next[key].modValue = next[key].mod.value || next[key].modValue || "";
        next[key].mod = next[key].mod.stat || next[key].mod.name || "";
      }
      applyLegacyMax(next[key]);
      if (next[key].name) assignCores(catalog, next[key]);
    });
    ["skill1", "skill2"].forEach(function (key) {
      if (load[key]) next[key] = Object.assign(emptySkill(), copy(load[key]));
    });
    return next;
  }

  function toPublic(loadout) {
    var out = {
      version: 1,
      mode: loadout.mode === "restricted" ? "restricted" : "normal",
      specialization: { name: (loadout.specialization && loadout.specialization.name) || "" },
      grenade: {
        name: (loadout.grenade && loadout.grenade.name) || "",
        catalogId: (loadout.grenade && loadout.grenade.catalogId) || "",
        specialization: (loadout.grenade && loadout.grenade.specialization) || ""
      },
      watch: copy(loadout.watch || { max: false, points: {} })
    };
    WEAPONS.forEach(function (key) {
      var item = loadout[key] || emptyWeapon();
      out[key] = {
        name: item.name || "",
        catalogId: item.catalogId || "",
        type: item.type || "",
        rarity: item.rarity || "",
        talent: item.talent || "",
        prototype: !!item.prototype,
        expertise: Number(item.expertise) || 0,
        guaranteed: item.guaranteed || "",
        core: item.core || "",
        coreValue: item.coreValue === "" || item.coreValue == null ? "" : Number(item.coreValue),
        coreMax: !!item.coreMax,
        core2: item.core2 || "",
        core2Value: item.core2Value === "" || item.core2Value == null ? "" : Number(item.core2Value),
        core2Max: !!item.core2Max,
        attributes: (item.attributes || []).map(function (attr) {
          return {
            name: attr.name || "",
            value: attr.value === "" || attr.value == null ? "" : Number(attr.value),
            maxed: !!attr.maxed
          };
        }),
        mods: (item.mods || []).map(function (mod) {
          return {
            slot: mod.slot || "",
            name: mod.name || "",
            stat: mod.stat || "",
            value: mod.value === "" || mod.value == null ? "" : Number(mod.value),
            statNeg: mod.statNeg || "",
            valueNeg: mod.valueNeg === "" || mod.valueNeg == null ? "" : Number(mod.valueNeg),
            stats: (mod.stats || []).map(function (stat) {
              return {
                name: stat.name || "",
                value: stat.value === "" || stat.value == null ? "" : Number(stat.value),
                unit: stat.unit || ""
              };
            })
          };
        })
      };
    });
    GEAR.forEach(function (key) {
      var item = loadout[key] || emptyGear();
      out[key] = {
        name: item.name || "",
        catalogId: item.catalogId || "",
        brand: item.brand || "",
        rarity: item.rarity || "",
        talent: item.talent || "",
        prototype: !!item.prototype,
        expertise: Number(item.expertise) || 0,
        guaranteed: item.guaranteed || "",
        core: item.core || "",
        coreValue: item.coreValue === "" || item.coreValue == null ? "" : Number(item.coreValue),
        coreMax: !!item.coreMax,
        core2: item.core2 || "",
        core2Value: item.core2Value === "" || item.core2Value == null ? "" : Number(item.core2Value),
        core2Max: !!item.core2Max,
        core3: item.core3 || "",
        core3Value: item.core3Value === "" || item.core3Value == null ? "" : Number(item.core3Value),
        core3Max: !!item.core3Max,
        attributes: (item.attributes || []).map(function (attr) {
          return {
            name: attr.name || "",
            value: attr.value === "" || attr.value == null ? "" : Number(attr.value),
            maxed: !!attr.maxed
          };
        }),
        mod: item.mod || "",
        modValue: item.modValue === "" || item.modValue == null ? "" : Number(item.modValue)
      };
    });
    ["skill1", "skill2"].forEach(function (key) {
      var item = loadout[key] || emptySkill();
      out[key] = { name: item.name || "", catalogId: item.catalogId || "", variant: item.variant || "", expertise: Number(item.expertise) || 0 };
    });
    return out;
  }

  function coreKey(name) {
    return keyOf(name).replace(/['’.]/g, "").replace(/^the /, "");
  }

  function findCoreRule(catalog, item) {
    var rows = (catalog && catalog.coreRules && catalog.coreRules.items) || [];
    var name = coreKey(item && item.name);
    for (var i = 0; i < rows.length; i++) {
      if (coreKey(rows[i] && rows[i].name) === name) return rows[i];
    }
    return null;
  }

  function coreNote(row) {
    if (!row || !row.file) return "";
    var limited = row.options && row.options.length && row.options.length < GEAR_CORES.length;
    if (!row.locked && !limited) return "";
    var detail = row.cores && row.cores.length > 1
      ? "Fixed cores: " + row.cores.join(", ") + "."
      : row.locked
        ? "Fixed core: " + row.cores[0] + "."
        : "Cores: " + row.options.join(" or ") + ".";
    return detail + " Source: Division 2 Community Data Hub " + row.file + " (" + row.token + ").";
  }

  function coreRule(catalog, item) {
    var open = (catalog && catalog.coreRules && catalog.coreRules.open) || GEAR_CORES;
    var row = findCoreRule(catalog, item);
    if (row) {
      var cores = row.cores && row.cores.length ? row.cores.slice() : [];
      var options = row.options && row.options.length ? row.options.slice() : (cores.length === 1 ? cores.slice() : open.slice());
      return {
        locked: !!row.locked,
        multi: cores.length > 1,
        options: options,
        cores: cores.length ? cores : options.slice(),
        note: coreNote(row),
        sourced: true
      };
    }
    var rarity = keyOf(item && item.rarity);
    if (rarity === "exotic") {
      var kept = item && item.core ? item.core : "Weapon Damage";
      return {
        locked: true,
        multi: false,
        options: [kept],
        cores: [kept],
        note: "Fixed core: " + kept + ". This exotic is not in the community core table, so the saved core stays.",
        sourced: false
      };
    }
    return { locked: false, multi: false, options: open.slice(), cores: open.slice(), note: "", sourced: false };
  }

  function coreCap(catalog, name) {
    var rows = (catalog && catalog.gearCores) || [];
    for (var i = 0; i < rows.length; i++) {
      if (keyOf(rows[i] && rows[i].name) === keyOf(name) && rows[i].max != null) return rows[i].max;
    }
    return "";
  }

  function assignCores(catalog, item) {
    var rule = coreRule(catalog, item);
    if (!item) return rule;
    var fields = [
      ["core", "coreValue", "coreMax"],
      ["core2", "core2Value", "core2Max"],
      ["core3", "core3Value", "core3Max"]
    ];
    if (rule.multi) {
      rule.cores.forEach(function (name, index) {
        var field = fields[index];
        var same = keyOf(item[field[0]]) === keyOf(name);
        item[field[0]] = name;
        if (!same || item[field[1]] === "" || item[field[1]] == null) {
          item[field[1]] = coreCap(catalog, name);
          item[field[2]] = false;
        }
      });
      item.coreLocked = true;
      return rule;
    }
    item.core2 = "";
    item.core2Value = "";
    item.core2Max = false;
    item.core3 = "";
    item.core3Value = "";
    item.core3Max = false;
    if (rule.locked) {
      var fixed = (rule.cores && rule.cores[0]) || "";
      if (keyOf(item.core) !== keyOf(fixed)) {
        item.core = fixed;
        item.coreValue = coreCap(catalog, fixed);
        item.coreMax = false;
      }
      item.coreLocked = true;
      return rule;
    }
    item.coreLocked = false;
    if (item.core && rule.options.indexOf(item.core) < 0) {
      item.core = rule.options[0] || "";
      item.coreValue = coreCap(catalog, item.core);
      item.coreMax = false;
    }
    return rule;
  }

  function slotPlan(slot, item) {
    var gear = {
      mask: { minors: 1, mod: true, talent: false },
      chest: { minors: 1, mod: true, talent: true },
      backpack: { minors: 1, mod: true, talent: true },
      gloves: { minors: 2, mod: false, talent: false },
      holster: { minors: 2, mod: false, talent: false },
      kneepads: { minors: 2, mod: false, talent: false }
    }[slot];
    if (!gear) return { minors: 1, mod: true, talent: true };
    var rarity = keyOf(item && item.rarity);
    if (rarity === "gear-set") {
      return { minors: 1, mod: gear.mod, talent: slot === "chest" || slot === "backpack", coreLocked: false, talentLocked: true, prototype: true };
    }
    if (rarity === "exotic") {
      return { minors: Math.max(gear.minors, 1), mod: gear.mod, talent: true, coreLocked: false, talentLocked: true, prototype: false };
    }
    return { minors: gear.minors, mod: gear.mod, talent: gear.talent, coreLocked: false, talentLocked: !!(item && item.talentLocked), prototype: true };
  }

  function fixedTalent(catalog, item) {
    if (!item || !item.name) return "";
    var exotic = catalog.exoticByName[keyOf(item.name)];
    if (exotic && exotic.talent) return exotic.talent;
    var namedWeapon = catalog.namedWeaponByName[keyOf(item.name)];
    if (namedWeapon && namedWeapon.perfectTalent) return namedWeapon.perfectTalent;
    var namedGear = catalog.namedGearByName[keyOf(item.name)];
    if (namedGear && namedGear.perfectTalent) return namedGear.perfectTalent;
    return "";
  }

  function fixedNotes(catalog, item) {
    var notes = [];
    var namedWeapon = catalog.namedWeaponByName[keyOf(item && item.name)];
    var namedGear = catalog.namedGearByName[keyOf(item && item.name)];
    var rows = (namedWeapon && namedWeapon.fixedAttributes) || (namedGear && namedGear.fixedAttributes) || [];
    rows.forEach(function (row) {
      if (row && row.name) notes.push(row.name + (row.value ? " " + row.value : ""));
    });
    return notes;
  }

  return {
    WEAPONS: WEAPONS,
    GEAR: GEAR,
    adapt: adapt,
    load: load,
    blank: blank,
    fromSaved: fromSaved,
    toPublic: toPublic,
    slotPlan: slotPlan,
    coreRule: coreRule,
    assignCores: assignCores,
    fixedTalent: fixedTalent,
    fixedNotes: fixedNotes,
    emptyWeapon: emptyWeapon,
    emptyGear: emptyGear
  };
});
