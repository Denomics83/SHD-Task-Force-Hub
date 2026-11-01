/* Desktop builder: slot grid, item editor, live stats. */
(function () {
  var GEAR = ["mask", "backpack", "chest", "gloves", "holster", "kneepads"];
  var WEAPONS = ["primary", "secondary", "sidearm"];
  var MOD_ORDER = ["optic", "muzzle", "magazine", "underbarrel"];
  var MOD_LABEL = { optic: "Optic", muzzle: "Muzzle", magazine: "Magazine", underbarrel: "Underbarrel" };
  var LABELS = {
    primary: "Primary", secondary: "Secondary", sidearm: "Sidearm",
    mask: "Mask", backpack: "Backpack", chest: "Chest", gloves: "Gloves",
    holster: "Holster", kneepads: "Kneepads", skill1: "Skill 1", skill2: "Skill 2",
    grenade: "Grenade", specialization: "Specialization", watch: "SHD Watch"
  };

  function esc(value) {
    if (window.STF && STF.esc) return STF.esc(value);
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function num(value) {
    var n = Number(value);
    return isFinite(n) ? n : 0;
  }

  function format(value, unit) {
    var n = Math.round(num(value) * 100) / 100;
    var text = String(n);
    if (Math.abs(n) >= 1000) text = Math.round(n).toLocaleString("en-US");
    return text + (unit || "");
  }

  function rarityClass(item) {
    var rarity = (item && item.rarity) || "";
    if (rarity === "gear-set") return "gearset";
    if (rarity === "exotic") return "exotic";
    if (rarity === "named") return "named";
    if (rarity === "high-end" || item && item.name) return "gold";
    return "empty";
  }

  function stepFor(max) {
    if (max == null) return 0.1;
    if (max >= 1000) return 1;
    if (max >= 80) return 0.5;
    return 0.1;
  }

  function mount(host, options) {
    options = options || {};
    var catalog = null;
    var state = null;
    var selected = "primary";
    var meta = blankMeta(options.record);
    var save = options.onSave || null;

    function blankMeta(record) {
      return {
        id: record && record.id || "",
        name: record && record.name || "",
        category: record && record.category || "solo",
        playstyle: record && record.playstyle || "",
        short: record && record.short_description || "",
        published: record ? !!record.published : true,
        notes: record && record.notes_html ? String(record.notes_html).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim() : ""
      };
    }

    function status(message, kind) {
      var node = host.querySelector("#bb-status");
      if (!node) return;
      node.textContent = message || "";
      node.className = "admin-status" + (kind ? " is-" + kind : "");
    }

    function sheet() {
      return ShadeEngine.compute(state, catalog);
    }

    function plan() {
      return ShadeCatalog.slotPlan(selected, state[selected], catalog);
    }

    function range(name, role) {
      var item = state[selected] || {};
      return ShadeEngine.rangeFor(catalog, name, role, item.type);
    }

    function limits(name, role, cap) {
      var item = state[selected] || {};
      var span = range(name, role);
      if (cap && cap.max != null && cap.max !== "") {
        var max = num(cap.max);
        var protoMax = cap.protoMax != null && cap.protoMax !== "" ? num(cap.protoMax) : max;
        span = {
          id: span.id,
          min: 0,
          max: max,
          protoMax: protoMax,
          prototype: protoMax !== max && span.id !== "skillTier",
          unit: cap.unit || span.unit || ""
        };
      }
      var proto = !!(item.prototype && span.prototype && ShadeCatalog.slotPlan(selected, item, catalog).prototype !== false);
      if (item.rarity === "exotic") proto = false;
      if (!span.prototype) proto = false;
      var min = proto ? span.max : 0;
      var max = proto ? span.protoMax : span.max;
      return { min: min == null ? 0 : min, max: max, unit: span.unit || "", known: max != null, proto: proto };
    }

    var panel = "build";

    function paint() {
      paintSlots();
      paintEditor();
      paintStats();
      var calcHost = host.querySelector("#bb-calc");
      if (panel === "calculator" && calcHost && window.ShadeCalcUI) ShadeCalcUI.render(calcHost, state, catalog);
    }

    function paintSlots() {
      var node = host.querySelector("#bb-slots");
      if (!node) return;
      function tile(key, gear) {
        var item = state[key] || {};
        var name = item.name || LABELS[key];
        var on = key === selected ? " is-on" : "";
        var proto = item.prototype ? '<i class="bb-proto">Prototype</i>' : "";
        var art = gear ? '<span class="bb-tile-art"></span>' : "";
        return '<button type="button" class="bb-tile' + (gear ? " bb-gear" : "") + ' rarity-' + rarityClass(item) + on + '" data-slot="' + key + '">' +
          '<span class="bb-tile-copy"><span>' + esc(LABELS[key]) + "</span><strong>" + esc(name) + "</strong>" + proto + "</span>" +
          art + "</button>";
      }
      var specName = (state.specialization && state.specialization.name) || "";
      var watchOn = state.watch && state.watch.max;
      var grenadeName = (state.grenade && state.grenade.name) || "";
      node.innerHTML =
        '<div class="bb-slot-row bb-slot-2">' +
        '<button type="button" class="bb-tile rarity-' + (specName ? "gold" : "empty") + (selected === "specialization" ? " is-on" : "") + '" data-slot="specialization"><span>Specialization</span><strong>' + esc(specName || "Specialization") + "</strong></button>" +
        '<button type="button" class="bb-tile rarity-gold' + (selected === "watch" ? " is-on" : "") + '" data-slot="watch"><span>SHD Watch</span><strong>' + (watchOn ? "Max" : "Custom") + "</strong></button>" +
        "</div>" +
        '<p class="bb-kicker">Loadout</p>' +
        '<div class="bb-slot-row bb-slot-3">' + WEAPONS.map(function (key) { return tile(key); }).join("") + "</div>" +
        '<div class="bb-slot-row bb-slot-2">' + tile("mask", true) + tile("backpack", true) + "</div>" +
        '<div class="bb-slot-row bb-slot-2">' + tile("chest", true) + tile("gloves", true) + "</div>" +
        '<div class="bb-slot-row bb-slot-2">' + tile("holster", true) + tile("kneepads", true) + "</div>" +
        '<div class="bb-slot-row bb-slot-3">' + tile("skill1") + tile("skill2") +
        '<button type="button" class="bb-tile rarity-' + (grenadeName ? "gold" : "empty") + (selected === "grenade" ? " is-on" : "") + '" data-slot="grenade"><span>Grenade</span><strong>' + esc(grenadeName || "Grenade") + "</strong></button>" +
        "</div>";
    }

    function atMax(value, lim) {
      return lim && lim.max != null && Math.abs(num(value) - num(lim.max)) < 0.001;
    }

    function slider(label, value, lim, bind, index, locked, maxed) {
      var max = lim.max == null ? Math.max(num(value), 1) : lim.max;
      var min = lim.min || 0;
      var current = value === "" || value == null ? min : num(value);
      var step = stepFor(max);
      var on = !!(lim.proto && (maxed || atMax(current, lim)));
      var maxBtn = lim.proto
        ? '<button type="button" class="bb-max' + (on ? " is-on" : "") + '" data-max="' + bind + '"' +
          (index == null ? "" : ' data-index="' + index + '"') + (locked ? " disabled" : "") +
          ' aria-pressed="' + (on ? "true" : "false") + '">MAX</button>'
        : "";
      return '<div class="bb-slide">' +
        "<span><em>" + esc(label) + "</em><strong data-readout>" + esc(format(current, lim.unit)) + "</strong></span>" +
        '<div class="bb-slide-row">' +
        '<input type="range" min="' + min + '" max="' + max + '" step="' + step + '" value="' + current + '" data-bind="' + bind + '"' +
        (index == null ? "" : ' data-index="' + index + '"') + (locked ? " disabled" : "") + ">" +
        maxBtn + "</div>" +
        (lim.known ? "" : '<small>No sourced max. The typed value is still counted.</small>') +
        "</div>";
    }

    function key(value) {
      return String(value || "").toLowerCase().replace(/\s+/g, " ").trim();
    }

    function signedStat(stat) {
      var n = Number(stat && stat.value);
      if (!isFinite(n)) return "";
      var sign = n > 0 ? "+" : "";
      if (!stat.unit && stat.name === "Extra Rounds") return sign + n + " " + stat.name;
      return sign + n + "% " + stat.name;
    }

    function modLine(mod) {
      if (!mod || !mod.name) return "None";
      var parts = (mod.stats || []).map(signedStat).filter(Boolean);
      if (!parts.length && mod.stat) {
        parts.push(signedStat({ name: mod.stat, value: mod.value, unit: "%" }));
        if (mod.statNeg) parts.push(signedStat({ name: mod.statNeg, value: mod.valueNeg, unit: "%" }));
      }
      return parts.length ? mod.name + ", " + parts.join(", ") : mod.name;
    }

    function modsFor(slotName, type) {
      var rows = (catalog.weaponMods[slotName] || []).slice();
      var kind = ShadeEngine.weaponType(type);
      if (!kind) return rows;
      return rows.filter(function (row) { return (row.fits || []).indexOf(kind) >= 0; });
    }

    function optionHTML(rows, current, labeler) {
      var html = '<option value="">—</option>';
      var seen = {};
      rows.forEach(function (row) {
        var value = typeof row === "string" ? row : row.name;
        if (!value || seen[value]) return;
        seen[value] = 1;
        html += '<option value="' + esc(value) + '"' + (value === current ? " selected" : "") + ">" + esc(labeler ? labeler(row) : value) + "</option>";
      });
      if (current && !seen[current]) html += '<option value="' + esc(current) + '" selected>' + esc(current) + "</option>";
      return html;
    }

    function paintEditor() {
      var node = host.querySelector("#bb-editor");
      if (!node) return;
      if (selected === "watch") return node.innerHTML = watchEditor();
      if (selected === "specialization") return node.innerHTML = specEditor();
      if (selected === "grenade") return node.innerHTML = grenadeEditor();
      if (selected === "skill1" || selected === "skill2") return node.innerHTML = skillEditor();
      if (WEAPONS.indexOf(selected) >= 0) return node.innerHTML = weaponEditor();
      node.innerHTML = gearEditor();
    }

    function weaponEditor() {
      var item = state[selected];
      var cores = catalog.weaponCores[ShadeEngine.weaponType(item.type)] || {};
      var minor = (item.attributes || [])[0] || { name: "", value: "" };
      var lim1 = limits(item.core || (cores.core1 && cores.core1.name), "weapon-core");
      var lim2 = item.core2 ? limits(item.core2, "weapon-core") : null;
      var limA = limits(minor.name, "weapon-minor");
      var talentLocked = item.talentLocked || item.rarity === "exotic";
      var notes = ShadeCatalog.fixedNotes(catalog, item);
      var mods = MOD_ORDER.map(function (slot) {
        var mod = (item.mods || []).filter(function (row) { return row.slot === slot; })[0] || null;
        var choices = modsFor(slot, item.type);
        var options = '<li><button type="button" data-mod-pick="' + slot + '" data-mod-name="">None</button></li>' +
          choices.map(function (row) {
            var on = mod && mod.name === row.name ? " is-on" : "";
            return '<li><button type="button" class="' + on.trim() + '" data-mod-pick="' + slot + '" data-mod-name="' + esc(row.name) + '">' + esc(modLine(row)) + "</button></li>";
          }).join("");
        if (!choices.length) options = '<li><button type="button" disabled>No attachments for this weapon</button></li>';
        return '<div class="bb-mod"><span>' + MOD_LABEL[slot] + '</span>' +
          '<button type="button" class="bb-mod-btn" data-mod-open="' + slot + '" aria-expanded="false" aria-haspopup="listbox">' + esc(mod ? modLine(mod) : "None") + "</button>" +
          '<ul class="bb-mod-menu" hidden data-mod-menu="' + slot + '" role="listbox">' + options + "</ul></div>";
      }).join("");
      return head(item, "Choose weapon") +
        toggle(item) +
        expertiseField(item) +
        (item.core ? slider(item.core, item.coreValue, lim1, "core", null, false, item.coreMax) : '<p class="lede">Pick a weapon to set its cores.</p>') +
        (lim2 ? slider(item.core2, item.core2Value, lim2, "core2", null, false, item.core2Max) : "") +
        "<h4>Minor attribute</h4>" +
        '<label>Stat <select data-minor="0"' + (minor.locked ? " disabled" : "") + ">" + optionHTML(catalog.weaponMinors, minor.name) + "</select></label>" +
        (minor.name ? slider(minor.name, minor.value, limA, "attr", 0, minor.locked, minor.maxed) : "") +
        "<h4>Mods</h4>" + mods +
        '<label>Talent <select data-field="talent"' + (talentLocked ? " disabled" : "") + ">" + optionHTML(catalog.talents.weapon, item.talent) + "</select></label>" +
        notesHTML(notes);
    }

    function minorChoices(attr) {
      return catalog.gearMinors.filter(function (row) {
        if (attr.exclude && attr.exclude.indexOf(row.name) >= 0) return false;
        if (attr.pool && row.category && row.category !== attr.pool) return false;
        return true;
      });
    }

    function gearEditor() {
      var item = state[selected];
      var layout = ShadeCatalog.slotPlan(selected, item, catalog);
      item.attributes = item.attributes || [];
      while (item.attributes.length < layout.minors) item.attributes.push({ name: "", value: "" });
      var attrs = item.attributes.slice(0, layout.minors).map(function (attr, index) {
        var lim = limits(attr.name, "gear-minor", attr);
        return '<label>Attribute ' + (index + 1) +
          '<select data-minor="' + index + '"' + (attr.locked ? " disabled" : "") + ">" + optionHTML(minorChoices(attr), attr.name) + "</select></label>" +
          (attr.name ? slider(attr.name, attr.value, lim, "attr", index, false, attr.maxed) : "");
      }).join("");
      var mod = "";
      if (layout.mods > 0) {
        mod = "<h4>Mod" + (layout.mods > 1 ? "s" : "") + "</h4>" + modField(item, "mod", item.mod, item.modValue);
        if (layout.mods > 1) mod += modField(item, "mod2", item.mod2, item.mod2Value);
      }
      var talent = "";
      if (layout.talent) {
        var pool = (selected === "chest" ? catalog.talents.chest : selected === "backpack" ? catalog.talents.backpack : []).slice();
        talent = '<label>Talent <select data-field="talent"' + (item.talentLocked || layout.talentLocked ? " disabled" : "") + ">" + optionHTML(pool, item.talent) + "</select></label>";
      }
      var note = layout.note ? '<p class="lede">' + esc(layout.note) + "</p>" : "";
      return head(item, "Choose piece") +
        (layout.prototype === false ? '<p class="lede">Exotics cannot be Prototype.</p>' : toggle(item)) +
        expertiseField(item) +
        coreFields(item) +
        (layout.minors ? "<h4>Minor attributes</h4>" + attrs : "") +
        note + mod + talent +
        notesHTML(ShadeCatalog.fixedNotes(catalog, item));
    }

    function modField(item, field, name, value) {
      var lim = limits(name, "mod");
      return '<label>Stat <select data-field="' + field + '">' + optionHTML(catalog.modNames.length ? catalog.modNames : catalog.modCaps, name) + "</select></label>" +
        (name ? slider(name, value, lim, field) : "");
    }

    function coreFields(item) {
      var rule = ShadeCatalog.coreRule(catalog, item);
      var note = rule.note ? '<p class="lede">' + esc(rule.note) + "</p>" : "";
      if (rule.multi) {
        return note + rule.cores.map(function (name, index) {
          var bind = index === 0 ? "core" : "core" + (index + 1);
          var value = item[bind === "core" ? "coreValue" : bind + "Value"];
          var maxed = item[bind === "core" ? "coreMax" : bind + "Max"];
          return slider(name, value, limits(name, "gear-core"), bind, null, false, maxed);
        }).join("");
      }
      var choices = rule.options && rule.options.length ? rule.options : catalog.gearCores;
      return '<label>Core <select data-field="core"' + (rule.locked ? " disabled" : "") + ">" + optionHTML(choices, item.core) + "</select></label>" +
        note +
        (item.core ? slider(item.core, item.coreValue, limits(item.core, "gear-core"), "core", null, false, item.coreMax) : "");
    }

    function skillFamily(item) {
      var skill = (catalog.skills || []).filter(function (row) { return row.name === item.name || row.name === item.variant; })[0];
      return (skill && skill.family) || item.family || "";
    }

    function skillSlots(item) {
      var family = skillFamily(item);
      var row = catalog.skillMods && catalog.skillMods.families && catalog.skillMods.families[family];
      return (row && row.slots) || [];
    }

    function syncSkillMods(item) {
      var slots = skillSlots(item);
      var prev = item.mods || [];
      item.mods = slots.map(function (slot) {
        var found = prev.filter(function (mod) { return mod && mod.slot === slot.name; })[0] || { slot: slot.name, name: "", value: "" };
        var match = (slot.mods || []).filter(function (mod) {
          return mod.name === found.name && (mod.specialization || "") === (found.specialization || "");
        })[0];
        if (!match) return { slot: slot.name, name: "", value: "", unit: "", max: null, specialization: "" };
        return {
          slot: slot.name,
          name: match.name,
          value: found.value === "" || found.value == null ? match.max : found.value,
          unit: match.unit || "",
          max: match.max,
          specialization: match.specialization || ""
        };
      });
      item.family = skillFamily(item);
      return slots;
    }

    function skillModLabel(mod) {
      var who = mod.specialization ? " (" + mod.specialization + ")" : "";
      if (mod.max == null) return mod.name + who + " (max not listed)";
      var amount = mod.unit === "%" ? "+" + mod.max + "%" : "+" + mod.max;
      return mod.name + " " + amount + who;
    }

    function skillEditor() {
      var item = state[selected];
      var skill = (catalog.skills || []).filter(function (row) { return row.name === item.name; })[0];
      var variants = (skill && skill.variants) || [];
      var slots = item.name ? syncSkillMods(item) : [];
      var mods = slots.map(function (slot, index) {
        var current = item.mods[index] || {};
        var options = '<option value="">—</option>' + (slot.mods || []).map(function (mod, modIndex) {
          var on = mod.name === current.name && (mod.specialization || "") === (current.specialization || "");
          return '<option value="' + modIndex + '"' + (on ? " selected" : "") + ">" + esc(skillModLabel(mod)) + "</option>";
        }).join("");
        var sliderHtml = "";
        if (current.name && current.max != null) {
          var max = num(current.max);
          var value = current.value === "" || current.value == null ? 0 : num(current.value);
          var step = max % 1 ? "0.1" : "1";
          sliderHtml = '<div class="bb-slide"><span><em>' + esc(current.name) + "</em><strong data-readout>" +
            esc(format(value, current.unit || "")) + "</strong></span>" +
            '<div class="bb-slide-row"><input type="range" min="0" max="' + max + '" step="' + step + '" value="' + value +
            '" data-bind="skillmod" data-index="' + index + '"></div></div>';
        } else if (current.name) {
          sliderHtml = '<p class="lede">No sourced maximum for this mod.</p>';
        }
        return "<h4>" + esc(slot.name) + "</h4><label>Mod <select data-skill-mod=\"" + index + "\">" + options + "</select></label>" + sliderHtml;
      }).join("");
      return head(item, "Choose skill") +
        '<label>Variant <select data-field="variant">' + optionHTML(variants, item.variant || item.name) + "</select></label>" +
        expertiseField(item) +
        mods +
        '<p class="lede">Skill damage, repair and duration by tier are phase 3. Chosen mod bonuses are listed on the sheet.</p>';
    }

    function grenadeEditor() {
      var name = (state.grenade && state.grenade.name) || "";
      var spec = (state.grenade && state.grenade.specialization) || "";
      return '<p class="bb-kicker">Grenade</p>' +
        "<h3>" + esc(name || "Empty slot") + "</h3>" +
        (spec ? '<p class="lede">' + esc(spec) + "</p>" : "") +
        '<p class="admin-row"><button type="button" class="admin-btn" data-grenade-pick>Choose grenade</button>' +
        '<button type="button" class="admin-btn admin-btn-ghost" data-grenade-clear>Clear</button></p>';
    }

    function specEditor() {
      var current = state.specialization.name || "";
      var buttons = catalog.specializations.map(function (row) {
        var on = row.name === current ? " is-on" : "";
        return '<button type="button" class="bb-chip' + on + '" data-spec="' + esc(row.name) + '">' + esc(row.name) + "</button>";
      }).join("");
      var row = catalog.specializations.filter(function (item) { return item.name === current; })[0];
      var lines = row ? (row.stats || []).map(function (stat) {
        var note = stat.counts === false ? " (conditional, not added to the sheet total)" : "";
        return "<li>" + esc(stat.name) + " " + esc(stat.value) + note + "</li>";
      }).join("") : "";
      return '<p class="bb-kicker">Specialization</p><div class="bb-chips">' + buttons + "</div>" +
        (lines ? "<ul>" + lines + "</ul>" : '<p class="lede">Pick a specialization. Its passive stats land on the sheet.</p>') +
        '<p class="lede">Grenade: ' + esc(state.grenade.name || "—") + "</p>";
    }

    function watchEditor() {
      var groups = ["offense", "defense", "utility", "handling"];
      var html = groups.map(function (group) {
        var rows = catalog.watch.filter(function (node) { return node.group === group; }).map(function (node) {
          var spent = state.watch.max ? (catalog.watchPoints || 50) : num(state.watch.points[node.id]);
          var value = Math.min(num(node.max), spent * num(node.perPoint));
          return '<div class="bb-slide"><span><em>' + esc(node.name) + "</em><strong>" + esc(format(value, node.unit || "%")) + "</strong></span>" +
            '<input type="range" min="0" max="' + (catalog.watchPoints || 50) + '" step="1" value="' + spent + '" data-watch="' + esc(node.id) + '"></div>';
        }).join("");
        return "<h4>" + esc(group) + "</h4>" + rows;
      }).join("");
      return '<p class="bb-kicker">SHD Watch</p><p class="admin-row"><button type="button" class="admin-btn" data-watch-max>Max all</button></p>' + html +
        '<p class="lede">Each node is 50 points. Max all is the SHD 1000 watch.</p>';
    }

    function head(item, pickLabel) {
      var rarity = item.rarity;
      if (!rarity && (selected === "skill1" || selected === "skill2")) rarity = item.name ? (item.family || skillFamily(item) || "Skill") : "Empty";
      if (!rarity) rarity = "Empty";
      return '<p class="bb-kicker">' + esc(LABELS[selected]) + "</p>" +
        '<p class="slot-rarity">' + esc(rarity) + "</p>" +
        "<h3>" + esc(item.name || "Empty slot") + "</h3>" +
        '<p class="admin-row"><button type="button" class="admin-btn" data-pick>' + esc(pickLabel) + '</button>' +
        '<button type="button" class="admin-btn admin-btn-ghost" data-clear>Clear</button></p>';
    }

    function toggle(item) {
      if (item.rarity === "exotic") return "";
      return '<label class="bb-switch"><span>Prototype</span><input type="checkbox" data-field="prototype"' + (item.prototype ? " checked" : "") + '><i aria-hidden="true"></i></label>';
    }

    function expertiseField(item) {
      var max = (catalog.armor && catalog.armor.expertiseMax) || 30;
      return '<label>Expertise <input data-field="expertise" type="number" min="0" max="' + max + '" step="1" value="' + num(item.expertise) + '"></label>';
    }

    function notesHTML(notes) {
      if (!notes || !notes.length) return "";
      return '<ul class="bb-notes">' + notes.map(function (note) { return "<li>" + esc(note) + "</li>"; }).join("") + "</ul>";
    }

    function paintStats() {
      var node = host.querySelector("#bb-stats");
      if (!node || !state) return;
      var live = sheet();
      var mode = state.mode === "restricted" ? "restricted" : "normal";
      function rows(list) {
        return (list || []).map(function (row) {
          return "<li><span>" + esc(row.name) + "</span><strong>" + esc(format(row.value, row.unit)) + "</strong></li>";
        }).join("");
      }
      var chc = live.criticalHitChance > live.criticalHitChanceCap
        ? format(live.criticalHitChance, "%") + " (capped " + live.criticalHitChanceCap + "%)"
        : format(live.criticalHitChanceCapped, "%");
      var tier = format(live.skillTierEffective, "") + (live.overcharge ? " (overcharge " + format(live.skillTier, "") + ")" : "");
      var bonusLines = live.bonuses.map(function (row) {
        var stats = (row.applied || []).map(function (stat) { return stat.name + " " + format(stat.value, ""); }).join(", ");
        var talent = row.talent ? row.talent.name : "";
        return "<li><span>" + esc(row.name) + " " + esc(row.need || row.pieces) + "pc</span><strong>" + esc(stats || talent || "No flat stat") + "</strong></li>";
      }).join("");
      var spec = live.specialization || { applied: [], noted: [] };
      var specLines = (spec.applied || []).map(function (row) {
        return "<li><span>" + esc(row.name) + "</span><strong>" + esc(row.value) + "</strong></li>";
      }).join("");
      var noted = (spec.noted || []).map(function (row) { return esc(row.name); }).join(", ");
      function skillModLines(liveSheet) {
        var lines = (liveSheet.skillMods || []).map(function (mod) {
          var who = mod.specialization ? " (" + mod.specialization + ")" : "";
          return "<li><span>" + esc(mod.skill + " · " + mod.slot) + "</span><strong>" +
            esc(mod.name + who + " " + format(mod.value, mod.unit || "")) + "</strong></li>";
        }).join("");
        return lines || "<li><span>None</span><strong>—</strong></li>";
      }
      var health = live.health.total == null
        ? "Flat " + format(live.health.flat, "") + " · " + format(live.health.percent, "%") + " (base health not sourced)"
        : format(live.health.total, "");
      node.innerHTML =
        '<p class="bb-kicker">Stats</p>' +
        '<label>Mode <select data-mode><option value="normal"' + (mode === "normal" ? " selected" : "") + '>Normal</option>' +
        '<option value="restricted"' + (mode === "restricted" ? " selected" : "") + ">Prototype disabled (Raid/Incursion/DZ/Conflict)</option></select></label>" +
        '<section><h4>Offense</h4><ul class="bb-stat">' +
        "<li><span>Weapon Damage</span><strong>" + esc(format(live.stats.weaponDamage || 0, "%")) + "</strong></li>" +
        weaponTypeLine(live) +
        "<li><span>Critical Hit Chance</span><strong>" + esc(chc) + "</strong></li>" +
        "<li><span>Critical Hit Damage</span><strong>" + esc(format(live.stats.criticalHitDamage || 0, "%")) + "</strong></li>" +
        "<li><span>Headshot Damage</span><strong>" + esc(format(live.stats.headshotDamage || 0, "%")) + "</strong></li>" +
        rows(live.groups.offense.filter(function (row) {
          return ["weaponDamage", "criticalHitChance", "criticalHitDamage", "headshotDamage", "assaultRifleDamage", "smgDamage", "lmgDamage", "rifleDamage", "marksmanRifleDamage", "shotgunDamage", "pistolDamage"].indexOf(row.id) < 0;
        })) + "</ul></section>" +
        '<section><h4>Defense</h4><ul class="bb-stat">' +
        "<li><span>Armor</span><strong>" + esc(format(live.armor.total, "")) + "</strong></li>" +
        "<li><span>Health</span><strong>" + esc(health) + "</strong></li>" +
        "<li><span>Armor Regen</span><strong>" + esc(format(live.stats.armorRegen || 0, "")) + (live.stats.armorRegenPercent ? " + " + esc(format(live.stats.armorRegenPercent, "%")) : "") + "</strong></li>" +
        rows(live.groups.defense.filter(function (row) {
          return ["armorFlat", "totalArmor", "armorRegen", "armorRegenPercent", "healthFlat", "healthPercent"].indexOf(row.id) < 0;
        })) + "</ul></section>" +
        '<section><h4>Skill</h4><ul class="bb-stat">' +
        "<li><span>Skill Tier</span><strong>" + esc(tier) + "</strong></li>" +
        rows(live.groups.skill.filter(function (row) { return row.id !== "skillTier"; })) +
        "</ul></section>" +
        '<section><h4>Skill mods</h4><ul class="bb-stat">' + skillModLines(live) + "</ul></section>" +
        '<section><h4>Bonuses</h4><ul class="bb-stat">' + (bonusLines || "<li><span>None</span><strong>—</strong></li>") + "</ul></section>" +
        '<section><h4>' + esc(spec.name || "Specialization") + '</h4><ul class="bb-stat">' + (specLines || "<li><span>None</span><strong>—</strong></li>") + "</ul>" +
        (noted ? '<p class="lede">' + noted + " stays off the total.</p>" : "") + "</section>" +
        '<p class="lede">Damage per shot and DPS are phase 2. Buckets are on the share JSON under damage.buckets.</p>' +
        '<details class="bb-share"><summary>Share JSON</summary><textarea readonly rows="8">' + esc(JSON.stringify(ShadeCatalog.toPublic(state))) + "</textarea></details>";
    }

    function weaponTypeLine(live) {
      var ids = ["assaultRifleDamage", "smgDamage", "lmgDamage", "rifleDamage", "marksmanRifleDamage", "shotgunDamage", "pistolDamage"];
      return ids.filter(function (id) { return live.stats[id]; }).map(function (id) {
        return "<li><span>" + esc(ShadeEngine.STATS[id].name) + "</span><strong>" + esc(format(live.stats[id], "%")) + "</strong></li>";
      }).join("");
    }

    function readMeta() {
      meta.name = host.querySelector("#bb-name").value.trim();
      meta.category = host.querySelector("#bb-category").value;
      meta.playstyle = host.querySelector("#bb-playstyle").value;
      meta.short = host.querySelector("#bb-short").value.trim();
      meta.published = host.querySelector("#bb-published").checked;
      meta.notes = host.querySelector("#bb-notes").value.trim();
      host.querySelector("#bb-short-count").textContent = meta.short.length + " / 140";
    }

    function payload() {
      readMeta();
      var notes = meta.notes ? "<p>" + esc(meta.notes) + "</p>" : "";
      return {
        id: meta.id,
        category: meta.category,
        playstyle: meta.playstyle,
        name: meta.name,
        short_description: meta.short,
        notes_html: notes,
        loadout: (function () {
        var load = ShadeCatalog.toPublic(state);
        if (window.ShadeCalc && catalog) load.computed = ShadeCalc.summary(state, catalog);
        return load;
      })(),
        published: meta.published
      };
    }

    function setCoreValue(item, field, stat, role) {
      var lim = limits(stat, role);
      if (lim.max == null) return;
      if (item.prototype && lim.proto) {
        item[field] = lim.min;
        if (field === "coreValue") item.coreMax = false;
        if (field === "core2Value") item.core2Max = false;
        if (field === "core3Value") item.core3Max = false;
      } else {
        item[field] = lim.max;
      }
    }

    function boundStat(item, bind, index) {
      if (bind === "core") return item.core;
      if (bind === "core2") return item.core2;
      if (bind === "core3") return item.core3;
      return (item.attributes[Number(index)] || {}).name;
    }

    function boundRole(bind) {
      if (bind === "attr") return WEAPONS.indexOf(selected) >= 0 ? "weapon-minor" : "gear-minor";
      return WEAPONS.indexOf(selected) >= 0 ? "weapon-core" : "gear-core";
    }

    function flagMax(item, bind, index, on) {
      if (bind === "core") item.coreMax = on;
      else if (bind === "core2") item.core2Max = on;
      else if (bind === "core3") item.core3Max = on;
      else if (bind === "attr" && item.attributes[index]) item.attributes[index].maxed = on;
      if (!on) item.guaranteed = "";
    }

    function writeStat(item, bind, index, value, on) {
      if (bind === "core") item.coreValue = value;
      else if (bind === "core2") item.core2Value = value;
      else if (bind === "core3") item.core3Value = value;
      else if (bind === "attr" && item.attributes[index]) item.attributes[index].value = value;
      flagMax(item, bind, index, on);
    }

    function applyField(target) {
      var item = state[selected];
      var field = target.getAttribute("data-field");
      if (field === "prototype") {
        item.prototype = target.checked && item.rarity !== "exotic";
        if (item.prototype) item.expertise = (catalog.armor && catalog.armor.expertiseMax) || 30;
        return "editor";
      }
      if (field === "expertise") {
        item.expertise = Math.max(0, Math.min((catalog.armor && catalog.armor.expertiseMax) || 30, num(target.value)));
        return "stats";
      }
      if (field === "talent") {
        item.talent = target.value;
        return "stats";
      }
      if (field === "variant") {
        item.variant = target.value;
        var picked = (catalog.skills || []).filter(function (row) { return row.name === target.value; })[0];
        if (picked) {
          item.name = picked.name;
          item.catalogId = picked.id || item.catalogId;
          item.family = picked.family || item.family;
        }
        syncSkillMods(item);
        return "editor";
      }
      var skillSlot = target.getAttribute("data-skill-mod");
      if (skillSlot != null) {
        var slots = skillSlots(item);
        var slot = slots[Number(skillSlot)] || { name: "", mods: [] };
        var choice = slot.mods[Number(target.value)];
        item.mods[Number(skillSlot)] = choice ? {
          slot: slot.name,
          name: choice.name,
          value: choice.max == null ? "" : choice.max,
          unit: choice.unit || "",
          max: choice.max,
          specialization: choice.specialization || ""
        } : { slot: slot.name, name: "", value: "", unit: "", max: null, specialization: "" };
        return "editor";
      }
      if (field === "core") {
        item.core = target.value;
        setCoreValue(item, "coreValue", item.core, "gear-core");
        return "editor";
      }
      if (field === "mod" || field === "mod2") {
        var modValueField = field === "mod" ? "modValue" : "mod2Value";
        item[field] = target.value;
        var lim = limits(item[field], "mod");
        item[modValueField] = lim.max == null ? 0 : lim.max;
        return "editor";
      }
      var minor = target.getAttribute("data-minor");
      if (minor != null) {
        var row = item.attributes[Number(minor)] || { name: "", value: "" };
        row.name = target.value;
        row.locked = false;
        row.max = null;
        row.protoMax = null;
        row.statId = "";
        var role = WEAPONS.indexOf(selected) >= 0 ? "weapon-minor" : "gear-minor";
        var limMinor = limits(row.name, role);
        row.value = limMinor.max == null ? 0 : (item.prototype && limMinor.proto ? limMinor.min : limMinor.max);
        row.maxed = false;
        item.attributes[Number(minor)] = row;
        return "editor";
      }
      var modSlot = target.getAttribute("data-mod-slot");
      if (modSlot) {
        var choice = (catalog.weaponMods[modSlot] || []).filter(function (row) { return row.name === target.value; })[0];
        item.mods = (item.mods || []).filter(function (row) { return row.slot !== modSlot; });
        if (choice) item.mods.push(chosenMod(modSlot, choice));
        return "editor";
      }
      return "";
    }

    function applyRange(target) {
      var item = state[selected];
      var bind = target.getAttribute("data-bind");
      var value = num(target.value);
      var index = target.getAttribute("data-index");
      if (bind === "mod") item.modValue = value;
      else if (bind === "mod2") item.mod2Value = value;
      else if (bind === "skillmod") {
        var skillRow = (item.mods || [])[Number(index)] || {};
        skillRow.value = value;
        if (item.mods) item.mods[Number(index)] = skillRow;
      } else {
        var name = boundStat(item, bind, index);
        var role = boundRole(bind);
        var cap = bind === "attr" ? (item.attributes[Number(index)] || null) : null;
        var lim = limits(name, role, cap);
        writeStat(item, bind, Number(index), value, atMax(value, lim));
      }
      var slide = target.closest(".bb-slide");
      var readout = slide && slide.querySelector("[data-readout]");
      var maxBtn = slide && slide.querySelector(".bb-max");
      if (maxBtn && bind !== "mod") {
        var nameOn = boundStat(item, bind, index);
        var roleOn = boundRole(bind);
        var capOn = bind === "attr" ? (item.attributes[Number(index)] || null) : null;
        var on = atMax(value, limits(nameOn, roleOn, capOn));
        maxBtn.classList.toggle("is-on", on);
        maxBtn.setAttribute("aria-pressed", on ? "true" : "false");
      }
      if (readout) {
        var unit = readout.textContent.indexOf("%") >= 0 || (bind !== "core" || ShadeEngine.statId(item.core) !== "armorFlat") ? "%" : "";
        var shown = boundStat(item, bind, index);
        if ((bind === "core" || bind === "core2" || bind === "core3") && (shown === "Armor" || shown === "Skill Tier")) unit = "";
        if (bind === "mod" && item.mod === "Armor on Kill") unit = "";
        if (bind === "skillmod") unit = ((item.mods || [])[Number(index)] || {}).unit || "";
        readout.textContent = format(value, unit);
      }
      paintStats();
    }

    function clearSlot() {
      if (WEAPONS.indexOf(selected) >= 0) state[selected] = ShadeCatalog.emptyWeapon();
      else if (GEAR.indexOf(selected) >= 0) state[selected] = ShadeCatalog.emptyGear();
      else if (selected === "skill1" || selected === "skill2") state[selected] = { name: "", catalogId: "", family: "", variant: "", expertise: 0, mods: [] };
      paint();
    }

    function openPicker() {
      if (selected === "grenade") return openGrenadePicker();
      if (WEAPONS.indexOf(selected) >= 0) return openWeaponPicker();
      if (GEAR.indexOf(selected) >= 0) return openGearPicker();
      if (selected === "skill1" || selected === "skill2") return openSkillPicker();
    }

    function openGrenadePicker() {
      var rows = (catalog.grenades || []).map(function (row) {
        return { name: row.name, rarity: "high-end", specialization: row.specialization || "", id: row.id || "" };
      });
      modal("<h3>Choose grenade</h3>" + grid(rows, "data-grenade", function (row) { return row.specialization || "Grenade"; }), function (e) {
        var pick = e.target.closest && e.target.closest("[data-grenade]");
        if (!pick) return;
        var found = (catalog.grenades || []).filter(function (row) { return row.name === pick.getAttribute("data-grenade"); })[0] || {};
        state.grenade = {
          name: found.name || pick.getAttribute("data-grenade"),
          catalogId: found.id || "",
          specialization: found.specialization || ""
        };
        closeModal();
        paint();
      });
    }

    function modal(html, onClick) {
      closeModal();
      var el = document.createElement("div");
      el.id = "bb-modal";
      el.className = "desk-modal";
      el.innerHTML = '<div class="desk-sheet bb-sheet"><button type="button" class="desk-x" data-close aria-label="Close">×</button>' + html + "</div>";
      document.body.appendChild(el);
      el.addEventListener("click", function (e) {
        if (e.target === el || e.target.closest("[data-close]")) return closeModal();
        onClick(e);
      });
      el.addEventListener("input", function (e) {
        if (e.target.getAttribute && e.target.getAttribute("data-search") != null) onClick({ target: e.target, search: true });
      });
    }

    function closeModal() {
      var old = document.getElementById("bb-modal");
      if (old) old.remove();
    }

    function brandLogo(name) {
      var row = (catalog.brands || []).filter(function (item) { return key(item.name) === key(name); })[0];
      return row && row.icon ? row.icon : "";
    }

    function grid(rows, attr, label) {
      if (!rows.length) return '<p class="lede">Nothing in this list.</p>';
      return '<div class="bb-grid">' + rows.map(function (row) {
        var logo = row.icon ? '<img class="bb-logo" src="' + esc(row.icon) + '" alt="">' : "";
        return '<button type="button" class="bb-pick rarity-' + rarityClass(row) + '" ' + attr + '="' + esc(row.name) + '">' +
          '<span class="bb-pick-copy"><strong>' + esc(row.name) + "</strong><small>" + esc(label(row)) + "</small></span>" +
          logo + "</button>";
      }).join("") + "</div>";
    }

    function openWeaponPicker() {
      var type = catalog.weaponTypes[0] || "AR";
      var quality = "all";
      var query = "";
      function rows() {
        return catalog.weapons.filter(function (row) {
          if (row.type !== type) return false;
          if (quality !== "all" && row.rarity !== quality) return false;
          if (query && row.name.toLowerCase().indexOf(query) < 0) return false;
          return true;
        }).map(function (row) {
          var exotic = catalog.exoticByName[key(row.name)];
          return {
            name: row.name,
            type: row.type,
            rarity: row.rarity,
            icon: (row.rarity === "exotic" && exotic && exotic.icon) || row.icon || ""
          };
        });
      }
      function html() {
        var types = catalog.weaponTypes.map(function (name) {
          return '<button type="button" class="bb-chip' + (name === type ? " is-on" : "") + '" data-type="' + esc(name) + '">' + esc(name) + "</button>";
        }).join("");
        var quals = ["all", "high-end", "named", "exotic"].map(function (name) {
          return '<button type="button" class="bb-chip' + (name === quality ? " is-on" : "") + '" data-quality="' + name + '">' + esc(name) + "</button>";
        }).join("");
        return "<h3>Choose " + esc(LABELS[selected]) + "</h3><input data-search placeholder=\"Search\" value=\"" + esc(query) + "\">" +
          '<div class="bb-chips">' + types + "</div><div class=\"bb-chips\">" + quals + "</div>" +
          grid(rows(), "data-weapon", function (row) { return row.rarity || row.type; });
      }
      function draw(keepFocus) {
        var body = document.querySelector("#bb-modal .bb-sheet");
        if (!body) return;
        var next = html();
        body.innerHTML = '<button type="button" class="desk-x" data-close aria-label="Close">×</button>' + next;
        if (keepFocus) {
          var input = body.querySelector("[data-search]");
          if (input) { input.focus(); input.setSelectionRange(query.length, query.length); }
        }
      }
      modal(html(), function (e) {
        if (e.search || (e.target && e.target.getAttribute && e.target.getAttribute("data-search") != null && e.type !== "click")) {
          query = (e.target.value || "").toLowerCase();
          draw(true);
          return;
        }
        var typeBtn = e.target.closest && e.target.closest("[data-type]");
        if (typeBtn) { type = typeBtn.getAttribute("data-type"); draw(false); return; }
        var qualBtn = e.target.closest && e.target.closest("[data-quality]");
        if (qualBtn) { quality = qualBtn.getAttribute("data-quality"); draw(false); return; }
        var pick = e.target.closest && e.target.closest("[data-weapon]");
        if (!pick) return;
        var found = catalog.weapons.filter(function (row) { return row.name === pick.getAttribute("data-weapon"); })[0];
        if (found) chooseWeapon(found);
      });
    }

    function chooseWeapon(row) {
      var named = catalog.namedWeaponByName[key(row.name)];
      var exotic = catalog.exoticByName[key(row.name)];
      var cores = catalog.weaponCores[ShadeEngine.weaponType(row.type)] || {};
      var talent = (exotic && exotic.talent) || (named && named.perfectTalent) || row.talent || "";
      state[selected] = {
        name: row.name,
        catalogId: row.id || "",
        type: row.type || "",
        rarity: row.rarity || "",
        talent: talent,
        talentLocked: !!((exotic && exotic.talent) || (named && named.perfectTalent)),
        prototype: false,
        expertise: state[selected].expertise || 0,
        guaranteed: "",
        core: cores.core1 ? cores.core1.name : "",
        coreValue: cores.core1 ? cores.core1.max : "",
        core2: cores.core2 ? cores.core2.name : "",
        core2Value: cores.core2 ? cores.core2.max : "",
        attributes: [{ name: "", value: "" }],
        mods: []
      };
      closeModal();
      paint();
    }

    function openGearPicker() {
      var tab = "gearset";
      var query = "";
      function rows() {
        var list = [];
        if (tab === "brand") {
          list = catalog.brands.map(function (row) { return { name: row.name, rarity: "high-end", brand: row.name, id: row.id, icon: row.icon || "" }; });
        } else if (tab === "gearset") {
          list = catalog.gearsets.map(function (row) { return { name: row.name, rarity: "gear-set", brand: row.name, id: row.id, icon: row.icon || "" }; });
        } else if (tab === "named") {
          list = catalog.namedGear.filter(function (row) { return key(row.slot) === key(selected); }).map(function (row) {
            return { name: row.name, rarity: "named", brand: row.brand, id: row.id, icon: brandLogo(row.brand) };
          });
        } else {
          list = catalog.exotics.filter(function (row) {
            return key(row.kind) !== "weapon" && key(row.slot) === key(selected);
          }).map(function (row) { return { name: row.name, rarity: "exotic", brand: "", id: row.id, icon: row.icon || "" }; });
        }
        if (!query) return list;
        return list.filter(function (row) { return row.name.toLowerCase().indexOf(query) >= 0; });
      }
      function html() {
        var chips = [["gearset", "Gear set"], ["brand", "Brand"], ["named", "Named"], ["exotic", "Exotic"]].map(function (pair) {
          return '<button type="button" class="bb-chip' + (pair[0] === tab ? " is-on" : "") + '" data-tab="' + pair[0] + '">' + pair[1] + "</button>";
        }).join("");
        return "<h3>Choose " + esc(LABELS[selected]) + "</h3><input data-search placeholder=\"Search\" value=\"" + esc(query) + "\">" +
          '<div class="bb-chips">' + chips + "</div>" + grid(rows(), "data-gear", function (row) { return row.rarity; });
      }
      function draw(keepFocus) {
        var body = document.querySelector("#bb-modal .bb-sheet");
        if (!body) return;
        body.innerHTML = '<button type="button" class="desk-x" data-close aria-label="Close">×</button>' + html();
        if (keepFocus) {
          var input = body.querySelector("[data-search]");
          if (input) { input.focus(); input.setSelectionRange(query.length, query.length); }
        }
      }
      modal(html(), function (e) {
        if (e.search) { query = (e.target.value || "").toLowerCase(); draw(true); return; }
        var tabBtn = e.target.closest && e.target.closest("[data-tab]");
        if (tabBtn) { tab = tabBtn.getAttribute("data-tab"); draw(false); return; }
        var pick = e.target.closest && e.target.closest("[data-gear]");
        if (!pick) return;
        chooseGear(pick.getAttribute("data-gear"), tab);
      });
    }

    function maxForCore(name) {
      var row = catalog.gearCores.filter(function (item) { return item.name === name; })[0];
      return row && row.max != null ? row.max : "";
    }

    function chooseGear(name, tab) {
      var next = ShadeCatalog.emptyGear();
      next.name = name;
      next.attributes = [];
      if (tab === "brand") {
        var brand = catalog.brands.filter(function (row) { return row.name === name; })[0] || {};
        next.catalogId = brand.id || "";
        next.brand = brand.name || name;
        next.rarity = "high-end";
        next.core = brand.core || "Weapon Damage";
        next.coreValue = maxForCore(next.core);
      } else if (tab === "gearset") {
        var set = catalog.gearsets.filter(function (row) { return row.name === name; })[0] || {};
        next.catalogId = set.id || "";
        next.brand = set.name || name;
        next.rarity = "gear-set";
        next.core = set.core && set.core !== "Mixed" ? set.core : "Weapon Damage";
        next.coreValue = maxForCore(next.core);
        next.talent = selected === "chest" ? (set.chestTalent || "") : selected === "backpack" ? (set.backpackTalent || "") : "";
        next.talentLocked = true;
      } else if (tab === "named") {
        var named = catalog.namedGear.filter(function (row) { return row.name === name; })[0] || {};
        next.catalogId = named.id || "";
        next.brand = named.brand || "";
        next.rarity = "named";
        next.core = named.core || "Weapon Damage";
        next.coreValue = maxForCore(next.core);
        next.talent = named.perfectTalent || "";
        next.talentLocked = !!named.perfectTalent;
      } else {
        var exotic = catalog.exotics.filter(function (row) { return row.name === name; })[0] || {};
        next.catalogId = exotic.id || "";
        next.rarity = "exotic";
        next.talent = exotic.talent || "";
        next.talentLocked = true;
        next.core = "Weapon Damage";
        next.coreValue = maxForCore(next.core);
        next.prototype = false;
      }
      ShadeCatalog.applyLayout(catalog, next, selected);
      ShadeCatalog.assignCores(catalog, next);
      state[selected] = next;
      closeModal();
      paint();
    }

    function applyFixed(item, rows) {
      var used = 0;
      (rows || []).forEach(function (row) {
        if (!row || !ShadeEngine.statId(row.name)) return;
        var match = String(row.value || row.name).match(/([+-]?\d+(?:\.\d+)?)/);
        if (!match) return;
        if (!item.attributes[used]) item.attributes[used] = { name: "", value: "" };
        item.attributes[used].name = row.name;
        item.attributes[used].value = num(match[1]);
        item.attributes[used].locked = true;
        used += 1;
      });
    }

    function openSkillPicker() {
      modal("<h3>Choose a skill</h3>" + grid(catalog.skills, "data-skill", function (row) { return row.family || ""; }), function (e) {
        var pick = e.target.closest && e.target.closest("[data-skill]");
        if (!pick) return;
        var skill = catalog.skills.filter(function (row) { return row.name === pick.getAttribute("data-skill"); })[0];
        state[selected] = {
          name: skill.name,
          catalogId: skill.id || "",
          family: skill.family || "",
          variant: skill.name || ((skill.variants && skill.variants[0]) || ""),
          expertise: 0,
          mods: []
        };
        closeModal();
        paint();
      });
    }

    function grenadeFor(name) {
      var detail = (catalog.specDetails || []).filter(function (row) { return row.name === name; })[0];
      if (detail && detail.grenade) return detail.grenade;
      var row = (catalog.grenades || []).filter(function (item) { return item.specialization === name; })[0];
      return row ? row.name : "";
    }

    function grenadeRecord(specName) {
      var label = grenadeFor(specName);
      var row = (catalog.grenades || []).filter(function (item) {
        return item.name === label || item.specialization === specName;
      })[0];
      return {
        name: (row && row.name) || label || "",
        catalogId: (row && row.id) || "",
        specialization: (row && row.specialization) || ""
      };
    }

    function shell() {
      var plays = (catalog.playstyles || ["DPS"]).map(function (name) {
        return '<option value="' + esc(name) + '"' + (name === meta.playstyle ? " selected" : "") + ">" + esc(name) + "</option>";
      }).join("");
      host.innerHTML =
        '<form class="bb-meta" id="bb-form">' +
        '<p class="bb-kicker">Shade Hub Builder</p>' +
        "<label>Category <select id=\"bb-category\">" +
        ["solo", "team", "incursion", "raid", "pvp", "escalation"].map(function (name) {
          return '<option value="' + name + '"' + (name === meta.category ? " selected" : "") + ">" + name + "</option>";
        }).join("") + "</select></label>" +
        "<label>Playstyle <select id=\"bb-playstyle\">" + plays + "</select></label>" +
        '<label>Name <input id="bb-name" required value="' + esc(meta.name) + '"></label>' +
        '<label>Short description <input id="bb-short" maxlength="140" required value="' + esc(meta.short) + '"><small id="bb-short-count">' + meta.short.length + " / 140</small></label>" +
        '<label class="bb-check"><input id="bb-published" type="checkbox"' + (meta.published ? " checked" : "") + "> Published</label>" +
        '<p class="admin-row"><button type="button" class="admin-btn admin-btn-ghost" data-sample>Load Eclipse sample</button>' +
        '<button class="admin-btn" type="submit">Save build</button></p>' +
        '<p id="bb-status" class="admin-status" role="status"></p></form>' +
        '<div class="bb-tabs">' +
        '<button type="button" class="bb-chip' + (panel === "build" ? " is-on" : "") + '" data-bb-tab="build">Build</button>' +
        '<button type="button" class="bb-chip' + (panel === "calculator" ? " is-on" : "") + '" data-bb-tab="calculator">Calculator</button>' +
        "</div>" +
        '<div id="bb-build-panel"' + (panel === "build" ? "" : " hidden") + '>' +
        '<div class="bb-columns"><section class="bb-panel" id="bb-slots"></section><section class="bb-panel bb-editor" id="bb-editor"></section><section class="bb-panel bb-stats" id="bb-stats"></section></div>' +
        '<label class="bb-notes-label">Notes <textarea id="bb-notes" rows="4">' + esc(meta.notes) + "</textarea></label></div>" +
        '<div id="bb-calc" class="bb-panel"' + (panel === "calculator" ? "" : " hidden") + "></div>";
    }

    function chosenMod(slotName, choice) {
      var stats = (choice.stats || []).map(function (stat) {
        return { name: stat.name, value: stat.value, unit: stat.unit || "" };
      });
      var first = stats[0] || { name: choice.stat || "", value: choice.value };
      return {
        slot: slotName,
        name: choice.name,
        stats: stats,
        stat: first.name || "",
        value: first.value == null ? "" : first.value,
        statNeg: "",
        valueNeg: ""
      };
    }

    function closeModMenus() {
      host.querySelectorAll(".bb-mod-menu").forEach(function (menu) { menu.hidden = true; });
      host.querySelectorAll("[data-mod-open]").forEach(function (btn) { btn.setAttribute("aria-expanded", "false"); });
    }

    host.addEventListener("click", function (e) {
      var tabBtn = e.target.closest("[data-bb-tab]");
      if (tabBtn && host.contains(tabBtn)) {
        panel = tabBtn.getAttribute("data-bb-tab") === "calculator" ? "calculator" : "build";
        var buildPanel = host.querySelector("#bb-build-panel");
        var calcHost = host.querySelector("#bb-calc");
        if (buildPanel) buildPanel.hidden = panel !== "build";
        if (calcHost) calcHost.hidden = panel !== "calculator";
        host.querySelectorAll("[data-bb-tab]").forEach(function (btn) {
          btn.classList.toggle("is-on", btn.getAttribute("data-bb-tab") === panel);
        });
        if (panel === "calculator" && calcHost && window.ShadeCalcUI) ShadeCalcUI.render(calcHost, state, catalog);
        return;
      }
      var maxBtn = e.target.closest("[data-max]");
      if (maxBtn && host.contains(maxBtn) && !maxBtn.disabled) {
        var item = state[selected];
        var bind = maxBtn.getAttribute("data-max");
        var index = Number(maxBtn.getAttribute("data-index"));
        var name = boundStat(item, bind, index);
        var role = boundRole(bind);
        var cap = bind === "attr" ? (item.attributes[index] || null) : null;
        var lim = limits(name, role, cap);
        var on = maxBtn.classList.contains("is-on");
        writeStat(item, bind, index, on ? lim.min : lim.max, !on);
        paint();
        return;
      }
      var opener = e.target.closest("[data-mod-open]");
      if (opener && host.contains(opener)) {
        var menu = host.querySelector('[data-mod-menu="' + opener.getAttribute("data-mod-open") + '"]');
        var willOpen = menu && menu.hidden;
        closeModMenus();
        if (menu && willOpen) {
          menu.hidden = false;
          opener.setAttribute("aria-expanded", "true");
        }
        return;
      }
      var modPick = e.target.closest("[data-mod-pick]");
      if (modPick && host.contains(modPick)) {
        var modSlotName = modPick.getAttribute("data-mod-pick");
        var modName = modPick.getAttribute("data-mod-name") || "";
        var item = state[selected];
        var choice = (catalog.weaponMods[modSlotName] || []).filter(function (row) { return row.name === modName; })[0];
        item.mods = (item.mods || []).filter(function (row) { return row.slot !== modSlotName; });
        if (choice) item.mods.push(chosenMod(modSlotName, choice));
        closeModMenus();
        paint();
        return;
      }
      if (!e.target.closest(".bb-mod")) closeModMenus();
      var slotBtn = e.target.closest("[data-slot]");
      if (e.target.closest("[data-grenade-pick]")) return openGrenadePicker();
      if (e.target.closest("[data-grenade-clear]")) {
        state.grenade = { name: "", catalogId: "" };
        paint();
        return;
      }
      if (slotBtn && host.contains(slotBtn)) {
        selected = slotBtn.getAttribute("data-slot");
        paintSlots();
        paintEditor();
        if (selected === "grenade") {
          if (!state.grenade || !state.grenade.name) openGrenadePicker();
          return;
        }
        if (!state[selected] || !state[selected].name) {
          if (selected !== "watch" && selected !== "specialization") openPicker();
        }
        return;
      }
      if (e.target.closest("[data-pick]")) return openPicker();
      if (e.target.closest("[data-clear]")) return clearSlot();
      if (e.target.closest("[data-watch-max]")) {
        state.watch.max = true;
        catalog.watch.forEach(function (node) { state.watch.points[node.id] = catalog.watchPoints || 50; });
        paint();
        return;
      }
      var specBtn = e.target.closest("[data-spec]");
      if (specBtn) {
        state.specialization = { name: specBtn.getAttribute("data-spec") };
        state.grenade = grenadeRecord(state.specialization.name);
        paint();
        return;
      }
      if (e.target.closest("[data-sample]")) return loadSample();
    });

    host.addEventListener("change", function (e) {
      if (e.target.getAttribute("data-mode") != null) {
        state.mode = e.target.value === "restricted" ? "restricted" : "normal";
        paintStats();
        return;
      }
      if (e.target.getAttribute("data-watch")) return;
      if (e.target.id && e.target.id.indexOf("bb-") === 0 && e.target.id !== "bb-form") return;
      var effect = applyField(e.target);
      if (effect === "editor") paint();
      else if (effect === "stats") { paintSlots(); paintStats(); }
    });

    host.addEventListener("input", function (e) {
      var watchId = e.target.getAttribute("data-watch");
      if (watchId) {
        state.watch.max = false;
        state.watch.points[watchId] = num(e.target.value);
        var node = catalog.watch.filter(function (row) { return row.id === watchId; })[0];
        var strong = e.target.parentElement && e.target.parentElement.querySelector("strong");
        if (node && strong) strong.textContent = format(Math.min(num(node.max), num(e.target.value) * num(node.perPoint)), node.unit || "%");
        paintSlots();
        paintStats();
        return;
      }
      if (e.target.type === "range" && e.target.getAttribute("data-bind")) applyRange(e.target);
      if (e.target.id === "bb-short") host.querySelector("#bb-short-count").textContent = e.target.value.length + " / 140";
    });

    host.addEventListener("submit", async function (e) {
      if (e.target.id !== "bb-form") return;
      e.preventDefault();
      var body = payload();
      if (!body.name) return status("Name is required.", "err");
      if (body.short_description.length > 140) return status("Short description is over 140 characters.", "err");
      if (!save) return status("Preview only. Save from Admin after you log in.", "err");
      status("Saving…");
      try {
        var id = await save(body);
        if (id) meta.id = id;
        status("Saved.", "ok");
      } catch (err) {
        status(err.message || String(err), "err");
      }
    });

    async function loadSample() {
      try {
      var doc = await (options.fetchJSON || STF.fetchJSON)("data/td2/builder/sample-eclipse.json");
      state = ShadeCatalog.fromSaved({ loadout: doc }, catalog);
      if (!meta.name) meta.name = "Eclipse Protocol";
      if (!meta.short) meta.short = "Lexington, Big Alejandro, four-piece Eclipse.";
      if (catalog.playstyles.indexOf("Skill") >= 0) meta.playstyle = "Skill";
      else if (!meta.playstyle) meta.playstyle = catalog.playstyles[0] || "";
      var name = host.querySelector("#bb-name");
      var short = host.querySelector("#bb-short");
      var play = host.querySelector("#bb-playstyle");
      if (name && !name.value) name.value = meta.name;
      if (short && !short.value) short.value = meta.short;
      if (play && meta.playstyle) play.value = meta.playstyle;
      selected = "mask";
      paint();
      status("Loaded the Eclipse sample.", "ok");
      } catch (err) {
        status(err.message || String(err), "err");
      }
    }

    host.classList.add("bb-root");
    host.innerHTML = '<p class="lede">Loading catalog…</p>';
    ShadeCatalog.load(options.fetchJSON || STF.fetchJSON).then(function (loaded) {
      catalog = loaded;
      state = ShadeCatalog.fromSaved(options.record || { loadout: {} }, catalog);
      if (!meta.playstyle) meta.playstyle = (catalog.playstyles || [])[0] || "";
      shell();
      paint();
      if (catalog.errors && catalog.errors.length) status(catalog.errors[0], "err");
      if (options.sample) loadSample();
    }).catch(function (err) {
      host.innerHTML = '<p class="admin-status is-err">' + esc(err.message || String(err)) + "</p>";
    });
  }

  window.ShadeBuilder = { mount: mount };
})();
