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
})();
