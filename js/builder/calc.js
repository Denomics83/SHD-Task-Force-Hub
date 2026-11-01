/* Damage per shot and DPS. No DOM. Reads the phase 1 stats sheet, then applies buckets. */
(function (root, factory) {
  var engine = typeof module === "object" && module.exports ? require("./engine.js") : root.ShadeEngine;
  var api = factory(engine);
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.ShadeCalc = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (engine) {
  var WEAPONS = ["primary", "secondary", "sidearm"];
  var TYPE_STAT = {
    AR: "assaultRifleDamage",
    SMG: "smgDamage",
    LMG: "lmgDamage",
    Rifle: "rifleDamage",
    MMR: "marksmanRifleDamage",
    Shotgun: "shotgunDamage",
    Pistol: "pistolDamage"
  };

  function num(value) {
    if (typeof value === "string") value = value.replace(/,/g, "").replace(/s$/i, "");
    var n = Number(value);
    return isFinite(n) ? n : 0;
  }

  function keyOf(value) {
    return String(value || "")
      .toLowerCase()
      .replace(/[’']/g, "")
      .replace(/[%]/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function findByName(list, name) {
    var key = keyOf(name);
    if (!key || !list) return null;
    for (var i = 0; i < list.length; i++) {
      if (keyOf(list[i] && list[i].name) === key) return list[i];
    }
    return null;
  }

  function weaponCard(catalog, item) {
    if (!item || !item.name) return null;
    return findByName(catalog && catalog.weapons, item.name) || findByName(catalog && catalog.namedWeapons, item.name);
  }

  function cardNumber(card, fields) {
    if (!card) return null;
    for (var i = 0; i < fields.length; i++) {
      if (card[fields[i]] != null && card[fields[i]] !== "") return num(card[fields[i]]);
    }
    return null;
  }

  function sheetFor(loadout, catalog, slot) {
    var copy = JSON.parse(JSON.stringify(loadout || {}));
    WEAPONS.forEach(function (key) {
      if (key !== slot) copy[key] = { name: "", attributes: [], mods: [] };
    });
    if (copy[slot]) copy[slot].expertise = 0;
    return engine.compute(copy, catalog);
  }

  function assumptionsOf(loadout) {
    var raw = (loadout && loadout.calculator) || {};
    return {
      weapon: WEAPONS.indexOf(raw.weapon) >= 0 ? raw.weapon : "primary",
      outOfCover: raw.outOfCover !== false,
      talents: raw.talents || {}
    };
  }

  function talentRows(catalog) {
    var doc = (catalog && catalog.talentCalc) || {};
    return doc.talents || doc.items || [];
  }

  function definition(catalog, name) {
    return findByName(talentRows(catalog), name);
  }

  function setCounts(loadout) {
    var counts = {};
    ["mask", "backpack", "chest", "gloves", "holster", "kneepads"].forEach(function (key) {
      var item = (loadout && loadout[key]) || {};
      var rarity = keyOf(item.rarity);
      if (!item.name || rarity === "exotic") return;
      if (rarity === "gear-set" || rarity === "gearset") {
        var name = item.brand || item.name;
        counts[name] = (counts[name] || 0) + 1;
      }
    });
    return counts;
  }

  function equippedNames(loadout, slot) {
    var names = [];
    var weapon = loadout && loadout[slot];
    if (weapon && weapon.talent) names.push({ name: weapon.talent, where: slot });
    ["mask", "chest", "backpack", "gloves", "holster", "kneepads"].forEach(function (key) {
      var item = loadout && loadout[key];
      if (item && item.talent) names.push({ name: item.talent, where: key });
    });
    return names;
  }

  function gearsetTalent(catalog, loadout) {
    var extra = [];
    var counts = setCounts(loadout);
    var sets = (catalog && catalog.gearsets) || [];
    Object.keys(counts).forEach(function (setName) {
      if (counts[setName] < 4) return;
      var row = findByName(sets, setName);
      if (row && row.talent) extra.push({ name: row.talent, where: "set", setName: row.name, pieces: counts[setName] });
    });
    return extra;
  }

  function activeTalents(loadout, catalog, slot) {
    var list = equippedNames(loadout, slot).concat(gearsetTalent(catalog, loadout));
    var seen = {};
    return list.filter(function (row) {
      var key = keyOf(row.name);
      if (!key || seen[key]) return false;
      seen[key] = 1;
      return true;
    });
  }

  function savedTalent(assumptions, name) {
    var bag = assumptions.talents || {};
    var direct = bag[name];
    if (direct) return direct;
    var key = keyOf(name);
    var names = Object.keys(bag);
    for (var i = 0; i < names.length; i++) {
      if (keyOf(names[i]) === key) return bag[names[i]];
    }
    return { on: false, stacks: 0, uptime: 100 };
  }

  function resolvedDef(def, loadout) {
    var effects = (def.effects || []).map(function (effect) {
      return {
        stat: effect.stat,
        value: num(effect.value),
        perStack: num(effect.perStack)
      };
    });
    var maxStacks = num(def.maxStacks);
    var chest = loadout && loadout.chest;
    var backpack = loadout && loadout.backpack;
    if (def.chest && chest && keyOf(chest.talent) === keyOf(def.chest.talent)) {
      if (def.chest.maxStacks) maxStacks = num(def.chest.maxStacks);
      if (def.chest.value != null) {
        effects = effects.map(function (effect) {
          if (effect.perStack) return effect;
          return { stat: effect.stat, value: num(def.chest.value), perStack: effect.perStack };
        });
      }
    }
    if (def.backpack && backpack && keyOf(backpack.talent) === keyOf(def.backpack.talent)) {
      if (def.backpack.perStack != null) {
        effects = effects.map(function (effect) {
          return { stat: effect.stat, value: effect.value, perStack: num(def.backpack.perStack) };
        });
      }
    }
    return { maxStacks: maxStacks, effects: effects, stackLabel: def.stackLabel || "stacks" };
  }

  function talentBonus(def, saved) {
    if (!saved.on) return { twd: 0, awd: 0, chd: 0, rpm: 0, amps: [] };
    var stacks = Math.max(0, num(saved.stacks));
    if (def.maxStacks) stacks = Math.min(stacks, def.maxStacks);
    var uptime = saved.uptime == null ? 100 : num(saved.uptime);
    uptime = Math.max(0, Math.min(100, uptime)) / 100;
    var out = { twd: 0, awd: 0, chd: 0, rpm: 0, amps: [] };
    var amp = 0;
    def.effects.forEach(function (effect) {
      var amount = (num(effect.value) + num(effect.perStack) * stacks) * uptime;
      if (effect.stat === "twd") out.twd += amount;
      else if (effect.stat === "awd" || effect.stat === "weaponDamage") out.awd += amount;
      else if (effect.stat === "chd") out.chd += amount;
      else if (effect.stat === "rpm" || effect.stat === "rateOfFire") out.rpm += amount;
      else if (effect.stat === "amp") amp += amount;
    });
    if (amp) out.amps.push(amp);
    return out;
  }

  function typeStat(item, catalog) {
    var card = weaponCard(catalog, item);
    var type = engine.weaponType((item && item.type) || (card && card.type) || "");
    return TYPE_STAT[type] || "";
  }

  function rates(card, stats, talentRpm) {
    var baseDamage = cardNumber(card, ["baseDamage", "base"]);
    var baseRpm = cardNumber(card, ["baseRpm", "rpm", "RPM"]);
    var baseMag = cardNumber(card, ["baseMag", "mag", "magSize"]);
    var baseReload = cardNumber(card, ["reload", "reloadSeconds"]);
    if (baseReload != null && baseReload > 30) baseReload = baseReload / 1000;
    var innateHead = cardNumber(card, ["headshot", "hsd"]);
    var missing = baseDamage == null || baseRpm == null || baseMag == null || baseReload == null;
    var rpm = (baseRpm || 0) * (1 + (num(stats.rateOfFire) + num(talentRpm)) / 100);
    var mag = (baseMag || 0) * (1 + num(stats.magazineSize) / 100) + num(stats.extraRounds);
    var reloadDenom = 1 + num(stats.reloadSpeed) / 100;
    if (reloadDenom < 0.05) reloadDenom = 0.05;
    var reload = (baseReload || 0) / reloadDenom;
    return {
      sourced: !missing,
      baseDamage: baseDamage,
      baseRpm: baseRpm,
      baseMag: baseMag,
      baseReload: baseReload,
      innateHeadshot: innateHead || 0,
      rpm: rpm,
      mag: mag,
      reload: reload
    };
  }

  function pace(damage, rpm, mag, reload) {
    var avg = num(damage);
    var burst = rpm > 0 ? avg * rpm / 60 : 0;
    var perMag = avg * mag;
    var cycle = rpm > 0 ? (mag * 60 / rpm) + reload : 0;
    var sustained = cycle > 0 ? perMag / cycle : 0;
    return { avgShot: avg, dmgPerMag: perMag, burstDps: burst, sustainedDps: sustained };
  }

  function round(value) {
    return Math.round(num(value) * 100) / 100;
  }

  function calculate(loadout, catalog, slot, assumptions) {
    slot = WEAPONS.indexOf(slot) >= 0 ? slot : "primary";
    assumptions = assumptions || assumptionsOf(loadout);
    catalog = catalog || {};
    var item = (loadout && loadout[slot]) || {};
    var sheet = sheetFor(loadout, catalog, slot);
    var stats = sheet.stats || {};
    var cap = num((catalog.damageNotes && catalog.damageNotes.criticalHitChanceCap) || (catalog.rules && catalog.rules.criticalHitChanceCap) || 60) || 60;
    var bonuses = { twd: 0, awd: 0, chd: 0, rpm: 0, amps: [] };
    var listed = activeTalents(loadout, catalog, slot).map(function (row) {
      var def = definition(catalog, row.name);
      var saved = savedTalent(assumptions, row.name);
      if (!def) {
        return { name: row.name, where: row.where, modeled: false, note: "Not included in calculations", on: false, stacks: 0, maxStacks: 0, uptime: 100 };
      }
      var resolved = resolvedDef(def, loadout);
      var gain = talentBonus(resolved, saved);
      bonuses.twd += gain.twd;
      bonuses.awd += gain.awd;
      bonuses.chd += gain.chd;
      bonuses.rpm += gain.rpm;
      gain.amps.forEach(function (amp) { bonuses.amps.push(amp); });
      return {
        name: row.name,
        where: row.where,
        modeled: true,
        note: "",
        on: !!saved.on,
        stacks: num(saved.stacks),
        maxStacks: resolved.maxStacks,
        stackLabel: resolved.stackLabel,
        uptime: saved.uptime == null ? 100 : num(saved.uptime)
      };
    });
    var card = weaponCard(catalog, item);
    var weapon = rates(card, stats, bonuses.rpm);
    var expertise = num(item.expertise);
    var typeId = typeStat(item, catalog);
    var allWeaponDamage = num(stats.weaponDamage);
    var typeDamage = typeId ? num(stats[typeId]) : 0;
    var specDamage = 0;
    ((sheet.specialization && sheet.specialization.applied) || []).forEach(function (row) {
      if (engine.statId(row.name) === "weaponDamage") specDamage += num(row.value);
    });
    var chc = Math.min(cap, Math.max(0, num(stats.criticalHitChance)));
    var chd = num(stats.criticalHitDamage) + bonuses.chd;
    var hsd = num(stats.headshotDamage);
    var dta = num(stats.damageToArmor);
    var dth = num(stats.damageToHealth);
    var dtoc = assumptions.outOfCover === false ? 0 : num(stats.damageToTargetOutOfCover);
    var wdFactor = 1 + (allWeaponDamage + typeDamage + expertise + bonuses.awd) / 100;
    var twdFactor = 1 + bonuses.twd / 100;
    var ampFactor = bonuses.amps.reduce(function (product, amp) { return product * (1 + amp / 100); }, 1);
    var outOfCover = assumptions.outOfCover !== false;

    function scaled(pool) {
      if (!weapon.sourced) return null;
      var poolFactor = 1 + (pool === "armor" ? dta : dth) / 100;
      var coverFactor = 1 + dtoc / 100;
      return weapon.baseDamage * wdFactor * twdFactor * ampFactor * poolFactor * coverFactor;
    }

    function hit(base, crit, head) {
      if (base == null) return null;
      var headTerm = head ? (weapon.innateHeadshot + hsd) / 100 : 0;
      var critTerm = crit ? chd / 100 : 0;
      return base * (1 + critTerm + headTerm);
    }

    var healthBase = scaled("health");
    var armorBase = scaled("armor");
    var body = hit(healthBase, false, false);
    var expected = body == null ? null : body * (1 + (chc / 100) * (chd / 100));
    var basePace = weapon.sourced ? pace(weapon.baseDamage, weapon.baseRpm, weapon.baseMag, weapon.baseReload) : null;
    var effPace = weapon.sourced ? pace(expected, weapon.rpm, weapon.mag, weapon.reload) : null;
    return {
      weapon: slot,
      name: item.name || "",
      sourced: weapon.sourced,
      outOfCover: outOfCover,
      baseDamage: weapon.baseDamage,
      rpm: weapon.sourced ? round(weapon.rpm) : null,
      baseRpm: weapon.baseRpm,
      mag: weapon.sourced ? round(weapon.mag) : null,
      baseMag: weapon.baseMag,
      reload: weapon.sourced ? round(weapon.reload) : null,
      baseReload: weapon.baseReload,
      innateHeadshot: weapon.innateHeadshot,
      base: basePace,
      effective: effPace,
      stats: {
        allWeaponDamage: round(allWeaponDamage),
        specialization: round(specDamage),
        weaponDamage: round(typeDamage + expertise),
        totalWeaponDamage: round(bonuses.twd),
        criticalHitChance: round(chc),
        criticalHitDamage: round(chd),
        headshotDamage: round(hsd),
        damageToArmor: round(dta),
        damageToHealth: round(dth),
        damageToTargetOutOfCover: round(dtoc)
      },
      health: {
        body: body,
        bodyCrit: hit(healthBase, true, false),
        head: hit(healthBase, false, true),
        headCrit: hit(healthBase, true, true)
      },
      armorPool: {
        body: hit(armorBase, false, false),
        bodyCrit: hit(armorBase, true, false),
        head: hit(armorBase, false, true),
        headCrit: hit(armorBase, true, true)
      },
      talents: listed,
      factors: {
        weaponDamageFactor: round(wdFactor),
        totalWeaponDamageFactor: round(twdFactor),
        amplified: bonuses.amps.map(function (amp) { return round(1 + amp / 100); })
      }
    };
  }

  function compact(row) {
    if (!row) return null;
    var eff = row.effective || {};
    var base = row.base || {};
    return {
      weapon: row.weapon,
      name: row.name,
      sourced: row.sourced,
      outOfCover: row.outOfCover,
      rpm: row.rpm,
      mag: row.mag,
      reload: row.reload,
      baseDamage: row.baseDamage,
      avgShot: base.avgShot == null ? null : round(base.avgShot),
      dmgPerMag: base.dmgPerMag == null ? null : round(base.dmgPerMag),
      burstDps: base.burstDps == null ? null : round(base.burstDps),
      sustainedDps: base.sustainedDps == null ? null : round(base.sustainedDps),
      effAvgShot: eff.avgShot == null ? null : round(eff.avgShot),
      effDmgPerMag: eff.dmgPerMag == null ? null : round(eff.dmgPerMag),
      effBurstDps: eff.burstDps == null ? null : round(eff.burstDps),
      effSustainedDps: eff.sustainedDps == null ? null : round(eff.sustainedDps),
      allWeaponDamage: row.stats.allWeaponDamage,
      specialization: row.stats.specialization,
      weaponDamage: row.stats.weaponDamage,
      totalWeaponDamage: row.stats.totalWeaponDamage,
      criticalHitChance: row.stats.criticalHitChance,
      criticalHitDamage: row.stats.criticalHitDamage,
      headshotDamage: row.stats.headshotDamage,
      damageToArmor: row.stats.damageToArmor,
      damageToHealth: row.stats.damageToHealth,
      damageToTargetOutOfCover: row.stats.damageToTargetOutOfCover,
      body: row.health.body == null ? null : round(row.health.body),
      bodyCrit: row.health.bodyCrit == null ? null : round(row.health.bodyCrit),
      head: row.health.head == null ? null : round(row.health.head),
      headCrit: row.health.headCrit == null ? null : round(row.health.headCrit),
      bodyArmor: row.armorPool.body == null ? null : round(row.armorPool.body),
      bodyCritArmor: row.armorPool.bodyCrit == null ? null : round(row.armorPool.bodyCrit),
      headArmor: row.armorPool.head == null ? null : round(row.armorPool.head),
      headCritArmor: row.armorPool.headCrit == null ? null : round(row.armorPool.headCrit)
    };
  }

  function summary(loadout, catalog) {
    var assumptions = assumptionsOf(loadout);
    var weapons = {};
    WEAPONS.forEach(function (slot) {
      var item = loadout && loadout[slot];
      weapons[slot] = item && item.name ? compact(calculate(loadout, catalog, slot, assumptions)) : null;
    });
    var selected = weapons[assumptions.weapon] || weapons.primary || weapons.secondary || weapons.sidearm || {
      weapon: assumptions.weapon,
      name: "",
      sourced: false
    };
    var out = {};
    Object.keys(selected).forEach(function (key) { out[key] = selected[key]; });
    out.weapon = assumptions.weapon;
    out.weapons = weapons;
    return out;
  }

  return {
    assumptionsOf: assumptionsOf,
    calculate: calculate,
    summary: summary,
    activeTalents: activeTalents,
    definition: definition
  };
});
