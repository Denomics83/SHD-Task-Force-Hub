import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";

const require = createRequire(import.meta.url);
const catalogApi = require("../js/builder/catalog.js");
const calc = require("../js/builder/calc.js");

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
  talentCalc: read("data/td2/builder/talent-calc.json"),
  damageNotes: read("data/td2/builder/damage.json")
});

function close(actual, expected, label) {
  var tol = Math.max(1, Math.abs(expected) * 0.001);
  assert.ok(Math.abs(actual - expected) <= tol, (label || "") + " " + actual + " vs " + expected);
}

function lexington(extra) {
  return Object.assign({
    name: "Lexington",
    type: "AR",
    rarity: "named",
    talent: "",
    expertise: 0,
    core: "Assault Rifle Damage",
    coreValue: 15,
    core2: "Health Damage",
    core2Value: 21,
    attributes: [{ name: "Damage to TOC", value: 10 }],
    mods: []
  }, extra || {});
}

test("naked Lexington base row uses catalog RPM, mag, reload and base damage", function () {
  const loadout = catalogApi.blank(catalog.watch);
  loadout.primary = lexington({ coreValue: 0, core2Value: 0, attributes: [] });
  const row = calc.calculate(loadout, catalog, "primary", { weapon: "primary", outOfCover: false, talents: {} });
  assert.equal(row.baseDamage, 48699.5);
  assert.equal(row.baseRpm, 850);
  assert.equal(row.baseMag, 30);
  assert.equal(row.baseReload, 2.24);
  close(row.base.avgShot, 48699.5, "avg");
  close(row.base.dmgPerMag, 48699.5 * 30, "mag");
  close(row.base.burstDps, 48699.5 * 850 / 60, "burst");
  close(row.base.sustainedDps, (48699.5 * 30) / (30 * 60 / 850 + 2.24), "sustained");
});

test("Lexington shot uses separate weapon-damage, total-weapon-damage, amp, and pool buckets", function () {
  const loadout = catalogApi.blank(catalog.watch);
  loadout.primary = lexington({ talent: "Flatline" });
  loadout.mask = {
    name: "Test Mask",
    brand: "",
    rarity: "high-end",
    core: "Weapon Damage",
    coreValue: 15,
    attributes: [{ name: "Critical Hit Chance", value: 6 }, { name: "Critical Hit Damage", value: 12 }]
  };
  loadout.chest = {
    name: "Test Chest",
    brand: "",
    rarity: "high-end",
    talent: "Perfect Obliterate",
    core: "Weapon Damage",
    coreValue: 15,
    attributes: []
  };
  const assumptions = {
    weapon: "primary",
    outOfCover: true,
    talents: { "Perfect Obliterate": { on: true, stacks: 24, uptime: 100 } }
  };
  const row = calc.calculate(loadout, catalog, "primary", assumptions);
  const flatline = row.talents.filter(function (talent) { return talent.name === "Flatline"; })[0];
  assert.equal(flatline.modeled, false);
  assert.equal(flatline.note, "Not included in calculations");
  assert.equal(row.stats.totalWeaponDamage, 24);
  const wd = 1 + (15 + 15 + 15) / 100;
  const body = 48699.5 * wd * 1.24 * 1.21 * 1.10;
  close(row.health.body, body, "body");
  close(row.health.bodyCrit, body * (1 + 0.12), "crit");
  close(row.health.head, body * (1 + 0.55), "head");
  close(row.health.headCrit, body * (1 + 0.12 + 0.55), "head crit");
  const armorBody = 48699.5 * wd * 1.24 * 1.10;
  close(row.armorPool.body, armorBody, "armor");
  close(row.effective.avgShot, body * (1 + 0.06 * 0.12), "expected");
});

test("Killer, Glass Cannon and uptime follow the Build Station coefficients", function () {
  const loadout = catalogApi.blank(catalog.watch);
  loadout.primary = lexington({
    talent: "Killer",
    coreValue: 0,
    core2Value: 0,
    attributes: []
  });
  loadout.chest = {
    name: "Test Chest",
    brand: "",
    rarity: "high-end",
    talent: "Glass Cannon",
    core: "Weapon Damage",
    coreValue: 0,
    attributes: []
  };
  const full = calc.calculate(loadout, catalog, "primary", {
    outOfCover: false,
    talents: {
      Killer: { on: true, stacks: 1, uptime: 100 },
      "Glass Cannon": { on: true, stacks: 1, uptime: 50 }
    }
  });
  assert.equal(full.stats.criticalHitDamage, 70);
  assert.equal(full.stats.totalWeaponDamage, 0);
  const body = 48699.5 * 1.125;
  close(full.health.body, body, "glass half");
  close(full.health.bodyCrit, body * 1.7, "killer");
  const off = calc.calculate(loadout, catalog, "primary", {
    outOfCover: false,
    talents: { Killer: { on: false, stacks: 0, uptime: 100 }, "Glass Cannon": { on: false, stacks: 0, uptime: 100 } }
  });
  close(off.health.body, 48699.5, "bare");
  assert.equal(off.stats.criticalHitDamage, 0);
});

test("Striker stacks are one amplified multiplier and the backpack raises the per-stack value", function () {
  function piece(talent) {
    return {
      name: "Striker's Battlegear",
      brand: "Striker's Battlegear",
      rarity: "gear-set",
      talent: talent || "",
      core: "Weapon Damage",
      coreValue: 15,
      attributes: []
    };
  }
  const loadout = catalogApi.blank(catalog.watch);
  loadout.primary = lexington({ coreValue: 15, core2Value: 0, attributes: [], expertise: 0 });
  loadout.mask = piece();
  loadout.chest = piece("Press the Advantage");
  loadout.holster = piece();
  loadout.backpack = piece();
  const plain = calc.calculate(loadout, catalog, "primary", {
    outOfCover: false,
    talents: { "Striker's Gamble": { on: true, stacks: 100, uptime: 100 } }
  });
  const wd = 1 + (60 + 15) / 100;
  close(plain.health.body, 48699.5 * wd * 1.65, "striker 100");
  assert.equal(plain.stats.totalWeaponDamage, 0);
  loadout.backpack = piece("Risk Management");
  const bag = calc.calculate(loadout, catalog, "primary", {
    outOfCover: false,
    talents: { "Striker's Gamble": { on: true, stacks: 100, uptime: 100 } }
  });
  close(bag.health.body, 48699.5 * wd * 2, "striker backpack");
  const capped = calc.calculate(loadout, catalog, "primary", {
    outOfCover: false,
    talents: { "Striker's Gamble": { on: true, stacks: 250, uptime: 100 } }
  });
  close(capped.health.body, 48699.5 * wd * (1 + 2), "chest cap 200");
});

test("summary exposes the compact fields for the public build page", function () {
  const saved = catalogApi.fromSaved({ loadout: read("data/td2/builder/sample-eclipse.json") }, catalog);
  saved.calculator = { weapon: "primary", outOfCover: true, talents: {} };
  const summary = calc.summary(saved, catalog);
  assert.equal(summary.name, "Lexington");
  assert.equal(summary.weapon, "primary");
  assert.equal(typeof summary.effDmgPerMag, "number");
  assert.equal(typeof summary.effAvgShot, "number");
  assert.equal(typeof summary.effBurstDps, "number");
  assert.equal(typeof summary.effSustainedDps, "number");
  assert.equal(summary.weapons.secondary.name, "Big Alejandro");
  assert.ok(summary.effAvgShot > summary.avgShot);
  const again = catalogApi.toPublic(saved);
  again.computed = summary;
  assert.equal(again.computed.effDmgPerMag, summary.effDmgPerMag);
  assert.equal(again.primary.name, "Lexington");
});
