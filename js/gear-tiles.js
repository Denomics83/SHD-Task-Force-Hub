/* Inventory-style gear and weapon tiles for the public loadout and the Builder. */
(function () {
  window.STF = window.STF || {};

  var SLOT_GHOST = {
    mask: "assets/icons/slots/mask.svg",
    backpack: "assets/icons/slots/backpack.svg",
    chest: "assets/icons/slots/chest.svg",
    gloves: "assets/icons/slots/gloves.svg",
    holster: "assets/icons/slots/holster.svg",
    kneepads: "assets/icons/slots/kneepads.svg",
    AR: "assets/icons/slots/ar.svg",
    SMG: "assets/icons/slots/smg.svg",
    LMG: "assets/icons/slots/lmg.svg",
    Rifle: "assets/icons/slots/rifle.svg",
    MMR: "assets/icons/slots/mmr.svg",
    Shotgun: "assets/icons/slots/shotgun.svg",
    Pistol: "assets/icons/slots/pistol.svg"
  };
  var GENERIC_TALENT = "assets/icons/talents/generic.svg";
  var GENERIC_MOD = "assets/icons/mods/generic.svg";

  function esc(value) {
    if (STF.esc) return STF.esc(value);
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function iconFile(name) {
    var hit = STF.iconFor && STF.iconFor(name);
    return hit && hit.file ? hit.file : "";
  }

  STF.attrTone = function (name) {
    var text = String(name || "").toLowerCase();
    if (/skill|repair|haste|status|duration|charge/.test(text)) return "skill";
    if (/damage|critical|headshot|reload|accuracy|stability|ammo|handling|rate of fire|weapon|magazine/.test(text)) return "off";
    if (/armor|health|hazard|protection|regen|bleed|burn|ensnare|disrupt|shock|blind|disorient/.test(text)) return "def";
    return "off";
  };

  function ghostFor(slot, type) {
    if (SLOT_GHOST[type]) return SLOT_GHOST[type];
    return SLOT_GHOST[slot] || "";
  }

  STF.gearPips = function (item) {
    var pips = [];
    if (!item) return pips;
    if (item.core) pips.push({ tone: STF.attrTone(item.core), on: true });
    var attrs = Array.isArray(item.attributes) ? item.attributes : [];
    attrs.forEach(function (attr) {
      if (!attr) return;
      var name = attr.name || "";
      pips.push({ tone: name ? STF.attrTone(name) : "", on: !!name });
    });
    return pips.slice(0, 4);
  };

  STF.weaponPips = function (item) {
    var mods = (item && item.mods) || [];
    return ["optic", "muzzle", "magazine", "underbarrel"].map(function (slot) {
      var on = mods.some(function (mod) { return mod && mod.slot === slot && mod.name; });
      return { tone: "mod", on: on };
    });
  };

  function mark(src, cls) {
    if (!src) return "";
    return '<img class="inv-icon ' + cls + '" src="' + esc(src) + '" alt="">';
  }

  STF.invTile = function (opts) {
    opts = opts || {};
    var rarity = opts.rarity || "empty";
    var name = opts.name || opts.label || "Empty";
    var pips = (opts.pips || []).map(function (pip) {
      var tone = pip.on ? (pip.tone || "off") : "";
      return '<i class="' + (pip.on ? "is-on is-" + tone : "") + '"></i>';
    }).join("");
    var talents = (opts.talents || []).filter(Boolean).slice(0, 2).map(function (src) {
      return mark(src, "inv-talent");
    }).join("");
    var augs = (opts.augments || []).filter(Boolean).slice(0, 2).map(function (src) {
      return mark(src, "inv-aug");
    }).join("");
    var exp = opts.expertise == null || opts.expertise === "" ? "" : '<b class="inv-exp">' + esc(opts.expertise) + "</b>";
    var logo = opts.logo ? mark(opts.logo, "inv-logo" + (opts.nativeLogo ? " is-native" : "")) : '<span class="inv-logo"></span>';
    var ghost = opts.ghost ? mark(opts.ghost, "inv-ghost is-native") : "";
    return '<div class="inv-tile rarity-' + esc(rarity) + '">' +
      '<span class="inv-edge"></span>' +
      logo +
      ghost +
      '<span class="inv-copy"><strong>' + esc(name) + "</strong>" +
      (pips ? '<span class="inv-pips">' + pips + "</span>" : "") +
      "</span>" +
      (talents || augs ? '<span class="inv-side">' + talents + augs + "</span>" : "") +
      exp +
      "</div>";
  };

  STF.talentSrc = function (name) {
    if (!name) return "";
    return iconFile(name) || GENERIC_TALENT;
  };

  STF.specIcon = function (name) {
    var text = String(name || "").replace(/\s*\([^)]*\)\s*$/, "").trim();
    var hit = (STF.iconFor && (STF.iconFor(name) || STF.iconFor(text))) || null;
    return hit && hit.file ? hit.file : "";
  };
  STF.slotGhost = ghostFor;
  STF.logoSrc = function (item) {
    if (!item) return "";
    return iconFile(item.brand) || iconFile(item.name) || "";
  };

  var SIGNATURE = {
    Sharpshooter: { weapon: "TAC-50 C", type: "MMR", ammo: ".50" },
    Demolitionist: { weapon: "M32A1 MSGL", type: "Rifle", ammo: "40mm" },
    Survivalist: { weapon: "Crossbow", type: "Rifle", ammo: "Bolt" },
    Gunner: { weapon: "Minigun", type: "LMG", ammo: "7.62" },
    Technician: { weapon: "P-017 Launcher", type: "Rifle", ammo: "Missile" },
    Firewall: { weapon: "K8 JetStream", type: "Rifle", ammo: "Fuel" }
  };

  function numText(value, unit) {
    if (value == null || value === "") return "";
    var n = Number(value);
    if (!isFinite(n)) return String(value);
    var text = Math.abs(n) >= 1000 ? Math.round(n).toLocaleString("en-US") : String(Math.round(n * 10) / 10);
    if (text === "-0") text = "0";
    if (unit === "%") return text + "%";
    if (unit) return text + " " + unit;
    return text;
  }

  function valueUnit(name, value) {
    if (/skill tier|extra rounds/i.test(name)) return "";
    if (Math.abs(Number(value)) >= 100) return "";
    return "%";
  }

  function attrLine(name, value, unit) {
    var shown = numText(value, unit || (/%|damage|chance|regen|haste|speed/i.test(name) && Math.abs(Number(value)) < 500 ? "%" : ""));
    if (!shown) return name || "";
    return name + "  " + shown;
  }

  function pip(core, tone) {
    var kind = core ? "is-core" : "is-minor";
    return '<svg class="sheet-pip is-' + kind + " is-" + (tone || "off") + '" viewBox="0 0 16 16" aria-hidden="true">' +
      (core
        ? '<circle cx="8" cy="8" r="3.2" fill="none" stroke="currentColor" stroke-width="1.4"/><path d="M8 1.6v2.2M8 12.2v2.2M1.6 8h2.2M12.2 8h2.2M3.4 3.4l1.6 1.6M11 11l1.6 1.6M12.6 3.4 11 5M5 11l-1.6 1.6" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>'
        : '<circle cx="8" cy="8" r="5" fill="none" stroke="currentColor" stroke-width="1.6"/><circle cx="8" cy="8" r="2.1" fill="currentColor"/>') +
      "</svg>";
  }

  function modLines(mod) {
    var lines = [];
    (mod.stats || []).forEach(function (stat) {
      if (!stat || !stat.name) return;
      var n = Number(stat.value);
      var sign = isFinite(n) && n > 0 ? "+" : "";
      var unit = stat.unit || "%";
      lines.push(sign + (isFinite(n) ? n : "") + (unit === "%" ? "%" : unit ? " " + unit : "") + " " + stat.name);
    });
    if (!lines.length && mod.stat) {
      var n = Number(mod.value);
      var sign = isFinite(n) && n > 0 ? "+" : "";
      lines.push(sign + (isFinite(n) ? n : mod.value || "") + "% " + mod.stat);
    }
    if (mod.statNeg) {
      var neg = Number(mod.valueNeg);
      var signNeg = isFinite(neg) && neg > 0 ? "+" : "";
      lines.push(signNeg + (isFinite(neg) ? neg : "") + "% " + mod.statNeg);
    }
    if (mod.unit && mod.name && lines.length === 0 && mod.value != null && mod.value !== "") {
      lines.push(numText(mod.value, mod.unit));
    }
    return lines;
  }

  function titleClass(item) {
    var rarity = item && item.rarity;
    if (rarity === "exotic") return " is-exotic";
    if (rarity === "named") return " is-named";
    return "";
  }

  function pieceTitle(item) {
    if (!item) return "";
    if (item.rarity === "exotic" || item.rarity === "named") return item.name || "";
    return item.brand || item.name || "";
  }

  STF.sheetCard = function (item, slot) {
    item = item || {};
    slot = slot || "";
    if (!item.name && slot !== "watch") {
      return '<section class="sheet-wrap"><h3 class="sheet-title">Empty</h3><div class="sheet-panel"><p class="lede">Nothing equipped.</p></div></section>';
    }
    if (slot === "primary" || slot === "secondary" || slot === "sidearm") return weaponSheet(item);
    if (slot === "skill1" || slot === "skill2") return skillSheet(item);
    if (slot === "signature" || slot === "specialization") return specSheet(item);
    if (slot === "grenade") return grenadeSheet(item);
    return gearSheet(item, slot);
  };

  function gearSheet(item, slot) {
    var talent = item.talent ? '<img class="sheet-talent-icon inv-icon" src="' + esc(STF.talentSrc(item.talent)) + '" alt="">' : "";
    var showTalent = slot === "chest" || slot === "backpack" || slot === "kneepads" || !!item.talent;
    var rows = [];
    if (item.core) rows.push({ core: true, tone: STF.attrTone(item.core), text: attrLine(item.core, item.coreValue, valueUnit(item.core, item.coreValue)) });
    if (item.core2) rows.push({ core: true, tone: STF.attrTone(item.core2), text: attrLine(item.core2, item.core2Value, valueUnit(item.core2, item.core2Value)) });
    (item.attributes || []).forEach(function (attr) {
      if (!attr || !attr.name) return;
      rows.push({ core: false, tone: STF.attrTone(attr.name), text: attrLine(attr.name, attr.value, valueUnit(attr.name, attr.value)) });
    });
    if (item.mod) {
      var modName = typeof item.mod === "string" ? item.mod : (item.mod.name || item.mod.stat || "");
      if (modName) rows.push({ core: false, tone: STF.attrTone(modName), text: attrLine(modName, item.modValue, "%") });
    }
    return '<section class="sheet-wrap">' +
      '<h3 class="sheet-title' + titleClass(item) + '">' + esc(pieceTitle(item)) + "</h3>" +
      '<div class="sheet-panel">' +
      '<div class="sheet-hero">' +
      '<div class="sheet-brand rarity-' + esc(item.rarity === "gear-set" ? "gearset" : item.rarity === "high-end" ? "gold" : item.rarity || "gold") + '"><span class="inv-edge"></span>' +
      (STF.logoSrc(item) ? '<img class="sheet-logo inv-icon" src="' + esc(STF.logoSrc(item)) + '" alt="">' : "") +
      "</div>" +
      '<div class="sheet-slotcol">' +
      (ghostFor(slot) ? '<img class="sheet-slot inv-icon is-native" src="' + esc(ghostFor(slot)) + '" alt="">' : "") +
      (showTalent ? talent : "") +
      "</div>" +
      (item.talent ? '<strong class="sheet-talent">' + esc(item.talent) + "</strong>" : "<span></span>") +
      "</div>" +
      '<ul class="sheet-attrs">' + rows.map(function (row) {
        return "<li>" + pip(row.core, row.tone) + "<span>" + esc(row.text) + "</span></li>";
      }).join("") + "</ul></div></section>";
  }

  function weaponSheet(item) {
    var ghost = ghostFor("", item.type) || SLOT_GHOST.Rifle;
    var rarity = item.rarity === "exotic" ? "exotic" : item.rarity === "named" ? "named" : "gold";
    var mods = ["optic", "underbarrel", "magazine", "muzzle"].map(function (slotName) {
      var found = (item.mods || []).filter(function (mod) { return mod && mod.slot === slotName; })[0];
      var label = slotName.charAt(0).toUpperCase() + slotName.slice(1);
      var icon = found && found.name ? (iconFile(found.name) || GENERIC_MOD) : "";
      var lines = found ? modLines(found) : [];
      return '<div class="sheet-mod"><small>' + esc(label) + "</small>" +
        (icon ? '<img class="inv-icon is-native sheet-mod-icon" src="' + esc(icon) + '" alt="">' : "") +
        "<strong>" + esc(found && found.name ? found.name : "None") + "</strong>" +
        lines.map(function (line) { return "<em>" + esc(line) + "</em>"; }).join("") +
        "</div>";
    }).join("");
    var core = item.core ? attrLine(item.core, item.coreValue, "%") : "";
    return '<section class="sheet-wrap">' +
      '<h3 class="sheet-title' + titleClass(item) + '">' + esc(item.name) + "</h3>" +
      '<div class="sheet-panel">' +
      '<div class="sheet-hero is-weapon">' +
      '<div class="sheet-brand rarity-' + rarity + '"><span class="inv-edge"></span><img class="sheet-logo inv-icon is-native" src="' + esc(ghost) + '" alt=""></div>' +
      '<div class="sheet-slotcol">' + (item.talent ? '<img class="sheet-talent-icon inv-icon" src="' + esc(STF.talentSrc(item.talent)) + '" alt="">' : "") + "</div>" +
      (item.talent ? '<strong class="sheet-talent">' + esc(item.talent) + "</strong>" : "<span></span>") +
      "</div>" +
      (core ? '<ul class="sheet-attrs"><li>' + pip(true, STF.attrTone(item.core)) + "<span>" + esc(core) + "</span></li></ul>" : "") +
      '<div class="sheet-mods">' + mods + "</div></div></section>";
  }

  function skillSheet(item) {
    var family = item.family || "";
    var variant = item.variant || item.name || "";
    if (family && variant.indexOf(family) >= 0) variant = variant.replace(family, "").trim();
    var label = family ? "[" + family + "] " + (variant || item.name) : item.name;
    var icon = iconFile(item.name) || iconFile(item.variant) || "";
    var mods = (item.mods || []).map(function (mod) {
      if (!mod || !mod.name) return "";
      return '<div class="sheet-mod"><small>Mod</small><strong>' + esc(mod.name) + "</strong>" +
        (mod.value != null && mod.value !== "" ? "<em>" + esc(numText(mod.value, mod.unit || "%")) + "</em>" : "") +
        "</div>";
    }).join("");
    return '<section class="sheet-wrap"><h3 class="sheet-title">' + esc(label) + "</h3>" +
      '<div class="sheet-panel"><div class="sheet-hero">' +
      (icon ? '<img class="sheet-logo inv-icon is-native" src="' + esc(icon) + '" alt="">' : '<span class="sheet-logo"></span>') +
      "<strong class=\"sheet-talent\">" + esc(item.name) + "</strong></div>" +
      (mods ? '<div class="sheet-mods">' + mods + "</div>" : '<p class="lede">No mods slotted.</p>') +
      "</div></section>";
  }

  function specSheet(item) {
    var plain = String(item.name || "").replace(/\s*\([^)]*\)\s*$/, "").trim();
    var sig = SIGNATURE[plain] || SIGNATURE[item.name] || { weapon: "Signature weapon", type: "Rifle", ammo: "" };
    var spec = STF.specIcon(item.name);
    var gun = ghostFor("", sig.type);
    return '<section class="sheet-wrap"><h3 class="sheet-title">' + esc(item.name) + "</h3>" +
      '<div class="sheet-panel"><div class="sheet-spec">' +
      (spec ? '<img class="sheet-logo inv-icon is-native" src="' + esc(spec) + '" alt="">' : "") +
      '<img class="sheet-logo inv-icon is-native" src="' + esc(gun) + '" alt="">' +
      '<span class="sheet-ammo">' + esc(sig.ammo || "Ammo") + "</span>" +
      "<strong>" + esc(sig.weapon) + "</strong></div></div></section>";
  }

  function grenadeSheet(item) {
    var icon = iconFile(item.name);
    return '<section class="sheet-wrap"><h3 class="sheet-title">' + esc(item.name) + "</h3>" +
      '<div class="sheet-panel"><div class="sheet-hero">' +
      (icon ? '<img class="sheet-logo inv-icon is-native" src="' + esc(icon) + '" alt="">' : "") +
      "<strong class=\"sheet-talent\">" + esc(item.name) + "</strong></div></div></section>";
  }
})();
