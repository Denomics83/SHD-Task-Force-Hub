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
  mods: read("data/td2/builder/mods.json")
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
