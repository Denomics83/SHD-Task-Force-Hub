import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";

const require = createRequire(import.meta.url);
const engine = require("../js/builder/engine.js");
const catalogApi = require("../js/builder/catalog.js");

function read(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

const catalog = catalogApi.adapt({
  weapons: read("data/td2/weapons.json"),
  brands: read("data/td2/brands.json"),
  gearsets: read("data/td2/gearsets.json"),
  named: read("data/td2/named.json"),
  exotics: read("data/td2/exotics.json"),
  attributes: read("data/td2/attributes.json"),
  talents: read("data/td2/talents.json"),
  skills: read("data/td2/skills.json"),
  specializations: read("data/td2/specializations.json"),
  grenades: read("data/td2/grenades.json"),
  playstyles: read("data/td2/playstyles.json"),
  builderAttributes: read("data/td2/builder/attributes.json"),
  weaponCores: read("data/td2/builder/weapon-cores.json"),
  watch: read("data/td2/builder/watch.json"),
  builderSpecs: read("data/td2/builder/specializations.json"),
  armor: read("data/td2/builder/armor.json"),
  rules: read("data/td2/builder/rules.json"),
  mods: read("data/td2/builder/mods.json"),
  coreRules: read("data/td2/builder/core-rules.json"),
  layouts: read("data/td2/builder/layouts.json"),
  skillMods: read("data/td2/builder/skill-mods.json")
});

function gear(name, brand, rarity, core, coreValue, attributes) {
  return {
    name: name,
    brand: brand || name,
    rarity: rarity,
    core: core,
    coreValue: coreValue,
    attributes: attributes || [],
    mod: "",
    modValue: ""
  };
}

test("bonus text splits brand and gear-set lines", function () {
  assert.deepEqual(engine.parseBonusText("+15% Skill Haste · +30% Hazard Protection"), [
    { value: 15, name: "Skill Haste" },
    { value: 30, name: "Hazard Protection" }
  ]);
  assert.deepEqual(engine.parseBonusText("+1 Skill Tier"), [{ value: 1, name: "Skill Tier" }]);
});

test("six weapon-damage cores sum to 90", function () {
  const loadout = catalogApi.blank(catalog.watch);
  ["mask", "chest", "holster", "backpack", "gloves", "kneepads"].forEach(function (slot) {
    loadout[slot] = gear("Grupo Sombra S.A.", "Grupo Sombra S.A.", "high-end", "Weapon Damage", 15);
    loadout[slot].brand = slot === "mask" ? "Grupo Sombra S.A." : "Walker, Harris & Co.";
  });
  loadout.mask.brand = "Česká Výroba s.r.o.";
  loadout.chest.brand = "Grupo Sombra S.A.";
  loadout.holster.brand = "Walker, Harris & Co.";
  loadout.backpack.brand = "Providence Defense";
  loadout.gloves.brand = "Fenris Group AB";
  loadout.kneepads.brand = "Sokolov Concern";
  const sheet = engine.compute(loadout, catalog);
  assert.equal(sheet.stats.weaponDamage, 96);
  assert.equal(sheet.stats.criticalHitChance, 8);
  assert.equal(sheet.stats.criticalHitDamage, 13);
  assert.equal(sheet.stats.headshotDamage, 13);
  assert.equal(sheet.stats.assaultRifleDamage, 12);
  assert.equal(sheet.stats.smgDamage, 12);
  assert.ok(sheet.stats.weaponDamage !== sheet.stats.assaultRifleDamage);
});

test("max watch fills all 16 nodes", function () {
  const loadout = catalogApi.blank(catalog.watch);
  loadout.watch.max = true;
  const sheet = engine.compute(loadout, catalog);
  assert.equal(sheet.watch.length, 16);
  assert.equal(sheet.stats.weaponDamage, 10);
  assert.equal(sheet.stats.criticalHitChance, 10);
  assert.equal(sheet.stats.criticalHitDamage, 20);
  assert.equal(sheet.stats.headshotDamage, 20);
  assert.equal(sheet.stats.totalArmor, 10);
  assert.equal(sheet.stats.skillHaste, 10);
  assert.equal(sheet.stats.skillDuration, 20);
  assert.equal(sheet.stats.ammoCapacity, 20);
});

test("partial watch uses per-point values", function () {
  const loadout = catalogApi.blank(catalog.watch);
  loadout.watch.points.weaponDamage = 25;
  loadout.watch.points.criticalHitDamage = 10;
  const sheet = engine.compute(loadout, catalog);
  assert.equal(sheet.stats.weaponDamage, 5);
  assert.equal(sheet.stats.criticalHitDamage, 4);
  assert.equal(sheet.stats.criticalHitChance || 0, 0);
});

test("prototype widens gear crit damage and raid mode clamps it", function () {
  const loadout = catalogApi.blank(catalog.watch);
  loadout.mask = gear("Providence Defense", "Providence Defense", "high-end", "Weapon Damage", 15, [
    { name: "Critical Hit Damage", value: 18 }
  ]);
  loadout.mask.prototype = true;
  loadout.mask.guaranteed = "Critical Hit Damage";
  const normal = engine.compute(loadout, catalog);
  assert.equal(normal.stats.criticalHitDamage, 18);
  loadout.mode = "restricted";
  const raid = engine.compute(loadout, catalog);
  assert.equal(raid.stats.criticalHitDamage, 12);
  assert.equal(raid.mode, "restricted");
});

test("guaranteed prototype roll forces the new max", function () {
  const loadout = catalogApi.blank(catalog.watch);
  loadout.chest = gear("Ceska", "Česká Výroba s.r.o.", "high-end", "Weapon Damage", 15, [
    { name: "Critical Hit Chance", value: 6 }
  ]);
  loadout.chest.prototype = true;
  loadout.chest.guaranteed = "Critical Hit Chance";
  const sheet = engine.compute(loadout, catalog);
  assert.equal(sheet.stats.criticalHitChance, 9 + 8);
});

test("several prototype attributes can be maxed together", function () {
  const loadout = catalogApi.blank(catalog.watch);
  loadout.chest = gear("Ceska", "Česká Výroba s.r.o.", "high-end", "Weapon Damage", 15, [
    { name: "Critical Hit Chance", value: 6, maxed: true },
    { name: "Critical Hit Damage", value: 12, maxed: true }
  ]);
  loadout.chest.prototype = true;
  loadout.chest.coreMax = true;
  const sheet = engine.compute(loadout, catalog);
  assert.equal(sheet.stats.weaponDamage, 22.5);
  assert.equal(sheet.stats.criticalHitChance, 9 + 8);
  assert.equal(sheet.stats.criticalHitDamage, 18);
});

test("skill tier does not widen on prototype items", function () {
  const range = engine.rangeFor(catalog, "Skill Tier", "gear-core", "");
  assert.equal(range.max, 1);
  assert.equal(range.prototype, false);
  const loadout = catalogApi.blank(catalog.watch);
  loadout.mask = gear("Eclipse Protocol", "Eclipse Protocol", "gear-set", "Skill Tier", 1.5);
  loadout.mask.prototype = true;
  const sheet = engine.compute(loadout, catalog);
  assert.equal(sheet.skillTier, 1);
});

test("gear-set cores recalibrate across the three catalog ranges", function () {
  const plan = catalogApi.slotPlan("mask", { name: "Eclipse Protocol", rarity: "gear-set" });
  assert.equal(plan.coreLocked, false);
  const rule = catalogApi.coreRule(catalog, { name: "Eclipse Protocol", rarity: "gear-set" });
  assert.equal(rule.locked, false);
  assert.deepEqual(rule.options, ["Weapon Damage", "Armor", "Skill Tier"]);
  const brand = catalogApi.coreRule(catalog, { name: "Providence Defense", rarity: "high-end" });
  assert.equal(brand.locked, false);
  const saved = catalogApi.fromSaved({ loadout: read("data/td2/builder/sample-eclipse.json") }, catalog);
  assert.equal(saved.mask.coreLocked, false);
  assert.equal(saved.chest.coreLocked, false);
  assert.equal(saved.mask.core, "Skill Tier");
  const weapon = engine.rangeFor(catalog, "Weapon Damage", "gear-core", "");
  const armor = engine.rangeFor(catalog, "Armor", "gear-core", "");
  assert.equal(weapon.max, 15);
  assert.equal(weapon.protoMax, 22.5);
  assert.equal(weapon.prototype, true);
  assert.equal(armor.max, 170000);
  assert.equal(armor.protoMax, 255000);
  const loadout = catalogApi.blank(catalog.watch);
  loadout.mask = gear("Eclipse Protocol", "Eclipse Protocol", "gear-set", "Weapon Damage", 15);
  loadout.mask.prototype = true;
  loadout.mask.coreMax = true;
  let sheet = engine.compute(loadout, catalog);
  assert.equal(sheet.stats.weaponDamage, 22.5);
  loadout.mask.core = "Armor";
  loadout.mask.coreValue = 170000;
  loadout.mask.coreMax = false;
  sheet = engine.compute(loadout, catalog);
  assert.equal(sheet.stats.weaponDamage || 0, 0);
  assert.equal(sheet.armor.beforePercent, 80297 + 170000);
  loadout.mask.core = "Skill Tier";
  loadout.mask.coreValue = 1;
  sheet = engine.compute(loadout, catalog);
  assert.equal(sheet.skillTier, 1);
});

test("only sourced fixed cores stay locked", function () {
  const coyote = catalogApi.coreRule(catalog, { name: "Coyote's Mask", rarity: "exotic" });
  assert.equal(coyote.locked, true);
  assert.equal(coyote.sourced, true);
  assert.deepEqual(coyote.cores, ["Weapon Damage"]);
  const investor = catalogApi.coreRule(catalog, { name: "Investor", rarity: "exotic" });
  assert.equal(investor.locked, false);
  assert.deepEqual(investor.options, ["Weapon Damage", "Armor", "Skill Tier"]);
  const picaro = catalogApi.fromSaved({
    loadout: { holster: { name: "Picaros Holster", rarity: "named", core: "Weapon Damage", coreValue: 15, attributes: [] } }
  }, catalog);
  assert.equal(picaro.holster.coreLocked, false);
  assert.equal(picaro.holster.core, "Armor");
  assert.equal(picaro.holster.coreValue, 170000);
  const turmoil = catalogApi.coreRule(catalog, { name: "Turmoil", rarity: "named" });
  assert.equal(turmoil.locked, true);
  assert.deepEqual(turmoil.cores, ["Weapon Damage"]);
  const cloak = catalogApi.coreRule(catalog, { name: "Cloak", rarity: "named" });
  assert.equal(cloak.locked, true);
  read("data/td2/exotics.json").items.filter(function (row) { return row.kind === "gear"; }).forEach(function (row) {
    assert.equal(catalogApi.coreRule(catalog, row).sourced, true, row.name);
  });
});

test("gear pieces use their catalog slot layout", function () {
  const equalizer = catalogApi.slotPlan("chest", { name: "Equalizer", rarity: "named" }, catalog);
  assert.equal(equalizer.minors, 2);
  assert.equal(equalizer.mods, 1);
  assert.equal(equalizer.talent, true);
  const savedChest = catalogApi.fromSaved({
    loadout: {
      chest: {
        name: "Equalizer",
        rarity: "named",
        core: "Weapon Damage",
        coreValue: 15,
        talent: "Perfect Obliterate",
        attributes: [{ name: "Critical Hit Chance", value: 6 }]
      }
    }
  }, catalog).chest;
  assert.equal(savedChest.attributes.length, 2);
  assert.equal(savedChest.attributes[0].name, "Critical Hit Chance");
  assert.equal(savedChest.attributes[0].value, 6);
  assert.equal(savedChest.attributes[1].name, "");
  assert.equal(catalogApi.slotPlan("mask", { name: "Providence Defense", rarity: "high-end" }, catalog).minors, 2);
  assert.equal(catalogApi.slotPlan("chest", { name: "Eclipse Protocol", rarity: "gear-set" }, catalog).minors, 1);
  assert.equal(catalogApi.slotPlan("holster", { name: "Eclipse Protocol", rarity: "gear-set" }, catalog).mods, 0);

  const chill = catalogApi.slotPlan("mask", { name: "Chill Out", rarity: "named" }, catalog);
  assert.equal(chill.minors, 1);
  assert.equal(chill.mods, 2);
  assert.equal(chill.talent, false);
  const chillItem = catalogApi.fromSaved({
    loadout: {
      mask: {
        name: "Chill Out",
        rarity: "named",
        core: "Armor",
        coreValue: 170000,
        attributes: [{ name: "Hazard Protection", value: 8 }],
        mod: "Skill Haste",
        modValue: 12
      }
    }
  }, catalog).mask;
  assert.equal(chillItem.attributes.length, 1);
  assert.equal(chillItem.mod, "Skill Haste");
  chillItem.mod2 = "Critical Hit Chance";
  chillItem.mod2Value = 6;
  const chillSheet = engine.compute({ mask: chillItem }, catalog);
  assert.equal(chillSheet.stats.skillHaste, 12);
  assert.equal(chillSheet.stats.criticalHitChance, 6);

  const investor = catalogApi.slotPlan("mask", { name: "Investor", rarity: "exotic" }, catalog);
  assert.equal(investor.minors, 3);
  assert.equal(investor.mods, 0);
  assert.equal(investor.talent, true);
  const investorItem = catalogApi.fromSaved({
    loadout: {
      mask: {
        name: "Investor",
        rarity: "exotic",
        core: "Armor",
        coreValue: 100000,
        talent: "Slotted",
        attributes: [{ name: "Critical Hit Chance", value: 4 }],
        mod: "Skill Haste",
        modValue: 12
      }
    }
  }, catalog).mask;
  assert.equal(investorItem.attributes.length, 3);
  assert.equal(investorItem.attributes[0].value, 4);
  assert.equal(investorItem.mod, "");
  assert.deepEqual(investorItem.attributes[0].exclude, ["Headshot Damage", "Health", "Repair Skills"]);

  const memento = catalogApi.fromSaved({
    loadout: { backpack: { name: "Memento", rarity: "exotic", core: "Weapon Damage", coreValue: 12, attributes: [{ name: "Critical Hit Chance", value: 6 }] } }
  }, catalog).backpack;
  assert.equal(memento.attributes.length, 0);
  assert.equal(memento.core2, "Armor");
  assert.equal(memento.core3, "Skill Tier");
  const sheet = engine.compute({ backpack: memento }, catalog);
  assert.equal(sheet.stats.weaponDamage, 12);
  assert.equal(sheet.skillTier, 1);
  assert.equal(sheet.stats.criticalHitChance || 0, 0);
});

test("memento keeps all three fixed cores on the sheet", function () {
  const loadout = catalogApi.fromSaved({
    loadout: { backpack: { name: "Memento", rarity: "exotic", core: "Weapon Damage", coreValue: 12, attributes: [] } }
  }, catalog);
  assert.equal(loadout.backpack.coreValue, 12);
  assert.equal(loadout.backpack.core2, "Armor");
  assert.equal(loadout.backpack.core2Value, 170000);
  assert.equal(loadout.backpack.core3, "Skill Tier");
  assert.equal(loadout.backpack.core3Value, 1);
  const sheet = engine.compute(loadout, catalog);
  assert.equal(sheet.stats.weaponDamage, 12);
  assert.equal(sheet.skillTier, 1);
  assert.equal(sheet.armor.beforePercent, 130844 + 170000);
  assert.equal(catalogApi.toPublic(loadout).backpack.core3, "Skill Tier");
});

test("exotic prototype flag is ignored", function () {
  const loadout = catalogApi.blank(catalog.watch);
  loadout.primary = {
    name: "Big Alejandro",
    type: "LMG",
    rarity: "exotic",
    prototype: true,
    guaranteed: "LMG Damage",
    core: "LMG Damage",
    coreValue: 22.5,
    core2: "Damage to TOC",
    core2Value: 18,
    attributes: [],
    mods: []
  };
  const sheet = engine.compute(loadout, catalog);
  assert.equal(sheet.stats.lmgDamage, 15);
  assert.equal(sheet.stats.damageToTargetOutOfCover, 12);
});

test("weapon type damage stays out of the weapon damage bucket", function () {
  const loadout = catalogApi.blank(catalog.watch);
  loadout.primary = {
    name: "Lexington",
    type: "AR",
    rarity: "named",
    expertise: 15,
    core: "Assault Rifle Damage",
    coreValue: 15,
    core2: "Health Damage",
    core2Value: 21,
    attributes: [{ name: "Damage to TOC", value: 10 }],
    mods: []
  };
  loadout.gloves = gear("Fenris Group AB", "Fenris Group AB", "high-end", "Weapon Damage", 15);
  const sheet = engine.compute(loadout, catalog);
  assert.equal(sheet.stats.weaponDamage, 15 + 15);
  assert.equal(sheet.stats.assaultRifleDamage, 15 + 12);
  assert.equal(sheet.stats.damageToHealth, 21);
  assert.equal(sheet.buckets.weaponAndType.factor, 1.57);
  assert.equal(sheet.damage.perShot, null);
  assert.equal(sheet.damage.dps, null);
  assert.equal(sheet.damage.phase, 2);
});

test("gunner conditional reload is not added to reload speed", function () {
  const loadout = catalogApi.blank(catalog.watch);
  loadout.specialization = { name: "Gunner" };
  const sheet = engine.compute(loadout, catalog);
  assert.equal(sheet.stats.pulseResistance, 50);
  assert.equal(sheet.stats.armorOnKillPercent, 10);
  assert.equal(sheet.stats.reloadSpeed || 0, 0);
  assert.equal(sheet.specialization.noted.length, 1);
});

test("critical hit chance caps at 60", function () {
  const loadout = catalogApi.blank(catalog.watch);
  loadout.watch.max = true;
  ["mask", "chest", "holster", "backpack", "gloves", "kneepads"].forEach(function (slot) {
    loadout[slot] = gear("Brand " + slot, "Yaahl Gear", "high-end", "Weapon Damage", 15, [
      { name: "Critical Hit Chance", value: 6 },
      { name: "Critical Hit Chance", value: 6 }
    ]);
  });
  const sheet = engine.compute(loadout, catalog);
  assert.ok(sheet.criticalHitChance > 60);
  assert.equal(sheet.criticalHitChanceCapped, 60);
});

test("armor is piece base plus cores, then total armor percent", function () {
  const loadout = catalogApi.blank(catalog.watch);
  loadout.chest = gear("Badger Tuff", "Badger Tuff", "high-end", "Armor", 170000);
  loadout.chest.expertise = 10;
  const sheet = engine.compute(loadout, catalog);
  const base = 157961;
  const before = base + 170000 + base * 0.1;
  assert.equal(sheet.armor.beforePercent, Math.round(before * 100) / 100);
  assert.equal(sheet.armor.total, Math.round(before));
  loadout.watch.max = true;
  const watched = engine.compute(loadout, catalog);
  assert.equal(watched.armor.total, Math.round(before * 1.1));
});

test("ninjabike backpack adds a piece to the other brand", function () {
  const loadout = catalogApi.blank(catalog.watch);
  loadout.mask = gear("Česká Výroba s.r.o.", "Česká Výroba s.r.o.", "high-end", "Weapon Damage", 15);
  loadout.backpack = {
    name: "NinjaBike Messenger Backpack",
    brand: "",
    rarity: "exotic",
    talent: "Resourceful",
    core: "Weapon Damage",
    coreValue: 15,
    attributes: []
  };
  const sheet = engine.compute(loadout, catalog);
  assert.equal(sheet.ninja, true);
  assert.equal(sheet.stats.criticalHitChance, 8);
  assert.equal(sheet.stats.shotgunDamage, 24);
});

test("eclipse sample matches the hand totals", function () {
  const loadout = read("data/td2/builder/sample-eclipse.json");
  const sheet = engine.compute(loadout, catalog);
  assert.equal(sheet.stats.weaponDamage, 25);
  assert.equal(sheet.stats.assaultRifleDamage, 15);
  assert.equal(sheet.stats.lmgDamage, 15);
  assert.equal(sheet.stats.damageToHealth, 21);
  assert.equal(sheet.stats.damageToTargetOutOfCover, 22);
  assert.equal(sheet.stats.criticalHitChance, 34.5);
  assert.equal(sheet.stats.criticalHitDamage, 20);
  assert.equal(sheet.stats.headshotDamage, 20);
  assert.equal(sheet.stats.statusEffects, 80);
  assert.equal(sheet.stats.skillHaste, 73);
  assert.equal(sheet.stats.hazardProtection, 50);
  assert.equal(sheet.stats.explosiveResistance, 30);
  assert.equal(sheet.stats.skillDuration, 30);
  assert.equal(sheet.skillTier, 6);
  assert.equal(sheet.stats.reloadSpeed, 0);
  assert.equal(sheet.stats.extraRounds, 20);
  assert.equal(sheet.stats.pulseResistance, 50);
  assert.equal(sheet.armor.total, 726015);
  const talent = sheet.bonuses.filter(function (row) { return row.talent; })[0];
  assert.equal(talent.talent.name, "Indirect Transmission");
  loadout.mode = "restricted";
  const raid = engine.compute(loadout, catalog);
  assert.equal(raid.stats.statusEffects, 75);
  assert.equal(raid.stats.lmgDamage, 15);
  assert.equal(raid.skillTier, 6);
});

test("public loadout keeps the fields the build page reads", function () {
  const saved = catalogApi.fromSaved({ loadout: read("data/td2/builder/sample-eclipse.json") }, catalog);
  const pub = catalogApi.toPublic(saved);
  assert.equal(pub.primary.name, "Lexington");
  assert.equal(pub.primary.core, "Assault Rifle Damage");
  assert.equal(pub.primary.attributes[0].name, "Damage to TOC");
  assert.equal(pub.mask.brand, "Eclipse Protocol");
  assert.equal(pub.mask.prototype, true);
  assert.equal(pub.mask.attributes[0].maxed, true);
  assert.equal(pub.specialization.name, "Survivalist");
  assert.equal(pub.secondary.talent, "Cover Shooter");
  assert.equal(pub.secondary.rarity, "exotic");
});

test("a saved loadout without a grenade still loads", function () {
  const loadout = catalogApi.fromSaved({ loadout: { primary: { name: "Police M4", type: "AR" } } }, catalog);
  assert.equal(loadout.grenade.name, "");
  assert.equal(catalogApi.toPublic(loadout).grenade.name, "");
  assert.equal(catalogApi.toPublic(loadout).grenade.catalogId, "");
  const named = catalogApi.fromSaved({ loadout: { grenade: { name: "Incendiary Grenade" } } }, catalog);
  assert.equal(named.grenade.catalogId, "grenade-incendiary-grenade");
  assert.equal(named.grenade.specialization, "Survivalist");
  assert.equal(catalogApi.toPublic(named).grenade.specialization, "Survivalist");
});

test("legacy admin loadouts still sum", function () {
  const record = {
    loadout: {
      specialization: { name: "Demolitionist" },
      grenade: { name: "Demolitionist Grenade" },
      primary: { name: "Police M4", type: "AR", rarity: "high-end", talent: "Optimist", attributes: [] },
      mask: { name: "Providence Defense", brand: "Providence Defense", rarity: "high-end", core: "Weapon Damage", coreValue: "15", attributes: [{ name: "Critical Hit Chance", value: "6" }] }
    }
  };
  const loadout = catalogApi.fromSaved(record, catalog);
  const sheet = engine.compute(loadout, catalog);
  assert.equal(sheet.stats.weaponDamage, 15);
  assert.equal(sheet.stats.criticalHitChance, 6);
  assert.equal(sheet.stats.headshotDamage, 13);
  assert.equal(sheet.stats.explosiveDamage, 10);
  assert.equal(sheet.stats.pulseResistance, 50);
});

test("skill mods follow the sourced slot list and still load without them", function () {
  const pulse = catalog.skillMods.families.Pulse;
  assert.equal(pulse.slots.length, 2);
  assert.equal(pulse.slots[0].name, "Coil");
  assert.equal(pulse.slots[1].name, "Housing");
  assert.ok(pulse.slots[0].mods.some(function (mod) { return mod.name === "Radius" && mod.max === 10 && !mod.specialization; }));
  assert.ok(pulse.slots[0].mods.some(function (mod) { return mod.name === "Radius" && mod.max === 15 && mod.specialization === "Gunner"; }));
  assert.equal(pulse.slots[0].mods.some(function (mod) { return mod.name === "Charge Speed"; }), false);
  assert.equal(catalog.skillMods.families.Turret.slots.length, 3);
  assert.equal(catalog.skillMods.families.Decoy.slots.length, 2);
  const old = catalogApi.fromSaved({ loadout: { skill2: { name: "Banshee Pulse", variant: "Banshee Pulse" } } }, catalog);
  assert.equal(old.skill2.name, "Banshee Pulse");
  assert.deepEqual(old.skill2.mods, []);
  old.skill2.mods = [{ slot: "Coil", name: "Radius", value: 10, unit: "%" }];
  const sheet = engine.compute(old, catalog);
  assert.equal(sheet.skillMods.length, 1);
  assert.equal(sheet.skillMods[0].skill, "Banshee Pulse");
  assert.equal(sheet.skillMods[0].slot, "Coil");
  assert.equal(sheet.skillMods[0].value, 10);
  assert.equal(catalogApi.toPublic(old).skill2.mods[0].name, "Radius");
  assert.equal(sheet.stats.skillHaste || 0, 0);
});

test("weapon attachments add their bonuses and penalties", function () {
  const optic = catalog.weaponMods.optic.find(function (row) { return row.name === "Digital Scope"; });
  const mag = catalog.weaponMods.magazine.find(function (row) { return row.name === "Sturdy Extended 5.56 Mag"; });
  assert.ok(optic.fits.includes("AR"));
  assert.ok(optic.stats.some(function (stat) { return stat.value > 0; }));
  assert.ok(optic.stats.some(function (stat) { return stat.value < 0; }));
  assert.ok(mag.fits.includes("AR") && !mag.fits.includes("Pistol"));
  const loadout = catalogApi.blank(catalog.watch);
  loadout.primary = {
    name: "FAMAS 2010",
    type: "AR",
    rarity: "high-end",
    attributes: [],
    mods: [
      { slot: "optic", name: optic.name, stats: optic.stats },
      { slot: "magazine", name: mag.name, stats: mag.stats }
    ]
  };
  const sheet = engine.compute(loadout, catalog);
  assert.equal(sheet.stats.headshotDamage, 45);
  assert.equal(sheet.stats.criticalHitDamage, -5);
  assert.equal(sheet.stats.extraRounds, 20);
  assert.equal(sheet.stats.reloadSpeed, -10);
});
