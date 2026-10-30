/* Desktop build creator. Catalogs live in data/td2/. */
window.BuildAdmin = (function () {
  var host = null;
  var cat = null;
  var state = null;
  var selected = "primary";

  var WEAPONS = ["primary", "secondary", "sidearm"];
  var GEAR = ["mask", "backpack", "chest", "gloves", "holster", "kneepads"];
  var SKILLS = ["skill1", "skill2"];
  var MOD_SLOTS = { mask: 1, chest: 1, backpack: 1 };
  var TALENT_SLOTS = { chest: 1, backpack: 1 };

  function emptyWeapon() {
    return { name: "", type: "", rarity: "", talent: "", attributes: [] };
  }
  function emptyGear() {
    return { name: "", brand: "", rarity: "", core: "", coreValue: "", attributes: [], mod: "", talent: "" };
  }
  function emptySkill() {
    return { name: "", variant: "" };
  }
  function blank() {
    return {
      specialization: "",
      grenade: "",
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

  function clone(obj) {
    return JSON.parse(JSON.stringify(obj || {}));
  }

  function fromRecord(record) {
    var next = blank();
    var load = (record && record.loadout) || {};
    Object.keys(next).forEach(function (key) {
      if (load[key]) next[key] = Object.assign(next[key], clone(load[key]));
    });
    if (typeof load.specialization === "string") next.specialization = load.specialization;
    if (load.specialization && load.specialization.name) next.specialization = load.specialization.name;
    if (typeof load.grenade === "string") next.grenade = load.grenade;
    if (load.grenade && load.grenade.name) next.grenade = load.grenade.name;
    GEAR.concat(WEAPONS).forEach(function (key) {
      if (!Array.isArray(next[key].attributes)) next[key].attributes = [];
    });
    return next;
  }

  async function loadCatalogs() {
    var names = ["playstyles", "specializations", "grenades", "attributes", "gearsets", "brands", "exotics", "weapons", "talents", "skills"];
    var out = {};
    await Promise.all(names.map(async function (name) {
      out[name] = await STF.fetchJSON("data/td2/" + name + ".json");
    }));
    return out;
  }

  function items(name) {
    var doc = cat[name];
    if (Array.isArray(doc)) return doc;
    return (doc && doc.items) || [];
  }

  function rarityClass(item) {
    var rarity = (item && item.rarity) || "";
    if (rarity === "gear-set") return "gearset";
    if (rarity === "exotic") return "exotic";
    if (rarity === "named") return "named";
    if (rarity === "high-end" || rarity === "brand") return "gold";
    return "empty";
  }

  function label(key) {
    return {
      primary: "Primary", secondary: "Secondary", sidearm: "Sidearm",
      mask: "Mask", backpack: "Backpack", chest: "Chest", gloves: "Gloves",
      holster: "Holster", kneepads: "Kneepads", skill1: "Skill", skill2: "Skill"
    }[key] || key;
  }

  function tile(key) {
    var item = state[key] || {};
    var name = item.name || label(key);
    var picked = key === selected ? " is-picked" : "";
    return (
      '<button type="button" class="ba-tile rarity-' + rarityClass(item) + picked + '" data-slot="' + key + '">' +
      '<span class="ba-slot">' + STF.esc(label(key)) + "</span>" +
      "<strong>" + STF.esc(name) + "</strong>" +
      "</button>"
    );
  }

  function optionList(values, current) {
    var html = '<option value="">—</option>';
    values.forEach(function (value) {
      var selectedAttr = value === current ? " selected" : "";
      html += '<option value="' + STF.esc(value) + '"' + selectedAttr + ">" + STF.esc(value) + "</option>";
    });
    if (current && values.indexOf(current) < 0) {
      html += '<option value="' + STF.esc(current) + '" selected>' + STF.esc(current) + "</option>";
    }
    return html;
  }

  function attrRow(attr, index, maxHint) {
    return (
      '<div class="ba-attr" data-index="' + index + '">' +
      '<select data-attr="name">' + optionList(minorNames(), attr.name || "") + "</select>" +
      '<input data-attr="value" inputmode="decimal" value="' + STF.esc(attr.value || "") + '" placeholder="Value">' +
      "<small>" + STF.esc(maxHint(attr.name)) + "</small>" +
      '<button type="button" data-remove-attr="' + index + '" aria-label="Remove attribute">×</button>' +
      "</div>"
    );
  }

  function minorNames() {
    return (cat.attributes.minors || []).map(function (row) { return row.name; });
  }

  function maxHint(name) {
    var rows = (cat.attributes.cores || []).concat(cat.attributes.minors || []);
    var found = rows.filter(function (row) { return row.name === name; })[0];
    if (!found || found.max == null || found.max === "") return "No sourced max";
    return "Max " + found.max + (found.unit || "");
  }

  function editor() {
    var key = selected;
    var item = state[key];
    if (!item) return "<p>Select a slot.</p>";
    if (WEAPONS.indexOf(key) >= 0) return weaponEditor(key, item);
    if (GEAR.indexOf(key) >= 0) return gearEditor(key, item);
    if (SKILLS.indexOf(key) >= 0) return skillEditor(key, item);
    return "";
  }

  function weaponEditor(key, item) {
    var attrs = (item.attributes || []).map(function (attr, index) {
      return attrRow(attr, index, maxHint);
    }).join("");
    return (
      "<p class=\"slot-rarity\">" + STF.esc(item.rarity || "Weapon") + "</p>" +
      "<h3>" + STF.esc(item.name || label(key)) + "</h3>" +
      '<p><button type="button" class="admin-btn" data-change="' + key + '">Choose weapon</button></p>' +
      "<label>Talent <select data-field=\"talent\">" + optionList(cat.talents.weapon || [], item.talent || "") + "</select></label>" +
      "<h4>Attributes</h4>" +
      '<div class="ba-attrs">' + (attrs || '<p class="lede">No attributes yet.</p>') + "</div>" +
      '<button type="button" class="admin-btn admin-btn-ghost" data-add-attr="' + key + '">Add attribute</button>'
    );
  }

  function gearEditor(key, item) {
    var cores = (cat.attributes.cores || []).map(function (row) { return row.name; });
    var attrs = (item.attributes || []).map(function (attr, index) {
      return attrRow(attr, index, maxHint);
    }).join("");
    var talent = "";
    if (TALENT_SLOTS[key]) {
      var pool = (cat.talents[key] || []).slice();
      items("gearsets").forEach(function (set) {
        var extra = key === "chest" ? set.chestTalent : set.backpackTalent;
        if (extra && pool.indexOf(extra) < 0) pool.push(extra);
      });
      talent = "<label>Talent <select data-field=\"talent\">" + optionList(pool, item.talent || "") + "</select></label>";
    }
    var mod = "";
    if (MOD_SLOTS[key]) {
      mod = "<label>Mod <select data-field=\"mod\">" + optionList(cat.attributes.mods || [], item.mod || "") + "</select></label>";
    }
    return (
      "<p class=\"slot-rarity\">" + STF.esc(item.rarity || "Gear") + "</p>" +
      "<h3>" + STF.esc(item.name || label(key)) + "</h3>" +
      '<p><button type="button" class="admin-btn" data-change="' + key + '">Choose piece</button></p>' +
      '<label>Core <select data-field="core">' + optionList(cores, item.core || "") + "</select></label>" +
      '<label>Core value <input data-field="coreValue" inputmode="decimal" value="' + STF.esc(item.coreValue || "") + '"> <small>' + STF.esc(maxHint(item.core)) + "</small></label>" +
      "<h4>Minor attributes</h4>" +
      '<div class="ba-attrs">' + (attrs || '<p class="lede">No minor attributes yet.</p>') + "</div>" +
      '<button type="button" class="admin-btn admin-btn-ghost" data-add-attr="' + key + '">Add attribute</button>' +
      mod + talent
    );
  }

  function skillEditor(key, item) {
    var skill = items("skills").filter(function (row) { return row.name === item.name; })[0];
    var variants = (skill && skill.variants) || [];
    return (
      "<p class=\"slot-rarity\">Skill</p>" +
      "<h3>" + STF.esc(item.name || label(key)) + "</h3>" +
      '<p><button type="button" class="admin-btn" data-change="' + key + '">Choose skill</button></p>' +
      "<label>Variant <select data-field=\"variant\">" + optionList(variants, item.variant || "") + "</select></label>"
    );
  }

  function paint() {
    if (!host) return;
    var specs = items("specializations");
    var grenades = items("grenades").map(function (row) {
      return row.specialization ? row.specialization + " · " + row.name : row.name;
    });
    host.innerHTML =
      '<div class="ba-top">' +
      "<label>Specialization <select data-meta=\"specialization\">" + optionList(specs, state.specialization) + "</select></label>" +
      "<label>Grenade <select data-meta=\"grenade\">" + optionList(grenades, state.grenade) + "</select></label>" +
      "</div>" +
      '<div class="ba-board">' +
      '<div class="ba-row ba-row-3">' + WEAPONS.map(tile).join("") + "</div>" +
      '<div class="ba-row ba-row-2">' + GEAR.map(tile).join("") + "</div>" +
      '<div class="ba-row ba-row-2">' + SKILLS.map(tile).join("") + "</div>" +
      "</div>" +
      '<aside class="ba-editor" id="ba-editor">' + editor() + "</aside>";
  }

  function closeModal() {
    var old = document.getElementById("ba-modal");
    if (old) old.remove();
  }

  function openModal(html, onClick) {
    closeModal();
    var el = document.createElement("div");
    el.id = "ba-modal";
    el.className = "desk-modal";
    el.innerHTML = '<div class="desk-sheet ba-sheet"><button type="button" class="desk-x" data-close aria-label="Close">×</button>' + html + "</div>";
    document.body.appendChild(el);
    el.addEventListener("click", function (e) {
      if (e.target === el || e.target.closest("[data-close]")) return closeModal();
      onClick(e);
    });
  }

  function openWeaponPicker(key) {
    var types = (cat.weapons.types || []).concat(["Unclassified"]);
    function grid(type) {
      var rows = items("weapons").filter(function (row) {
        if (type === "Unclassified") return !row.type;
        return row.type === type;
      });
      if (!rows.length) return '<p class="lede">No weapons in this type.</p>';
      return '<div class="ba-grid">' + rows.map(function (row) {
        return '<button type="button" class="ba-pick rarity-' + rarityClass(row) + '" data-weapon="' + STF.esc(row.name) + '"><strong>' + STF.esc(row.name) + "</strong><small>" + STF.esc(row.rarity) + "</small></button>";
      }).join("") + "</div>";
    }
    var chips = types.map(function (type, index) {
      return '<button type="button" class="ba-chip' + (index === 0 ? " is-on" : "") + '" data-type="' + STF.esc(type) + '">' + STF.esc(type) + "</button>";
    }).join("");
    openModal(
      "<h3>Choose " + STF.esc(label(key)) + "</h3><div class=\"ba-chips\">" + chips + "</div><div id=\"ba-weapon-grid\">" + grid(types[0]) + "</div>",
      function (e) {
        var chip = e.target.closest("[data-type]");
        if (chip) {
          e.currentTarget.querySelectorAll(".ba-chip").forEach(function (btn) { btn.classList.remove("is-on"); });
          chip.classList.add("is-on");
          e.currentTarget.querySelector("#ba-weapon-grid").innerHTML = grid(chip.getAttribute("data-type"));
          return;
        }
        var pick = e.target.closest("[data-weapon]");
        if (!pick) return;
        var found = items("weapons").filter(function (row) { return row.name === pick.getAttribute("data-weapon"); })[0];
        if (!found) return;
        state[key] = {
          name: found.name,
          type: found.type || "",
          rarity: found.rarity || "",
          talent: found.talent || "",
          attributes: state[key].attributes || []
        };
        selected = key;
        closeModal();
        paint();
      }
    );
  }

  function openGearPicker(key) {
    function grid(tab) {
      var rows = [];
      if (tab === "sets") {
        rows = items("gearsets").map(function (row) {
          return { name: row.name, rarity: "gear-set", brand: row.name, talent: key === "chest" ? row.chestTalent : key === "backpack" ? row.backpackTalent : "" };
        });
      } else if (tab === "brands") {
        rows = items("brands").map(function (name) {
          return { name: name, rarity: "high-end", brand: name, talent: "" };
        });
      } else {
        rows = items("exotics").filter(function (row) { return row.slot === key; }).map(function (row) {
          return { name: row.name, rarity: "exotic", brand: "", talent: row.talent || "" };
        });
      }
      if (!rows.length) return '<p class="lede">Nothing in this list for this slot.</p>';
      return '<div class="ba-grid">' + rows.map(function (row) {
        return '<button type="button" class="ba-pick rarity-' + rarityClass(row) + '" data-gear="' + STF.esc(row.name) + '" data-rarity="' + STF.esc(row.rarity) + '" data-brand="' + STF.esc(row.brand || "") + '" data-talent="' + STF.esc(row.talent || "") + '"><strong>' + STF.esc(row.name) + "</strong><small>" + STF.esc(row.rarity) + "</small></button>";
      }).join("") + "</div>";
    }
    openModal(
      "<h3>Choose " + STF.esc(label(key)) + "</h3>" +
      '<div class="ba-chips"><button type="button" class="ba-chip is-on" data-tab="sets">Gear sets</button><button type="button" class="ba-chip" data-tab="brands">Brands</button><button type="button" class="ba-chip" data-tab="exotics">Exotics</button></div>' +
      '<div id="ba-gear-grid">' + grid("sets") + "</div>",
      function (e) {
        var tab = e.target.closest("[data-tab]");
        if (tab) {
          e.currentTarget.querySelectorAll(".ba-chip").forEach(function (btn) { btn.classList.remove("is-on"); });
          tab.classList.add("is-on");
          e.currentTarget.querySelector("#ba-gear-grid").innerHTML = grid(tab.getAttribute("data-tab"));
          return;
        }
        var pick = e.target.closest("[data-gear]");
        if (!pick) return;
        var prev = state[key];
        state[key] = {
          name: pick.getAttribute("data-gear"),
          brand: pick.getAttribute("data-brand") || "",
          rarity: pick.getAttribute("data-rarity") || "",
          core: prev.core || "",
          coreValue: prev.coreValue || "",
          attributes: prev.attributes || [],
          mod: prev.mod || "",
          talent: pick.getAttribute("data-talent") || prev.talent || ""
        };
        selected = key;
        closeModal();
        paint();
      }
    );
  }

  function openSkillPicker(key) {
    var rows = items("skills");
    openModal(
      "<h3>Choose a skill</h3><div class=\"ba-grid\">" + rows.map(function (row) {
        return '<button type="button" class="ba-pick" data-skill="' + STF.esc(row.name) + '"><strong>' + STF.esc(row.name) + "</strong></button>";
      }).join("") + "</div>",
      function (e) {
        var pick = e.target.closest("[data-skill]");
        if (!pick) return;
        var name = pick.getAttribute("data-skill");
        var skill = rows.filter(function (row) { return row.name === name; })[0];
        state[key] = { name: name, variant: (skill && skill.variants && skill.variants[0]) || "" };
        selected = key;
        closeModal();
        paint();
      }
    );
  }

  function openFor(key) {
    if (WEAPONS.indexOf(key) >= 0) return openWeaponPicker(key);
    if (GEAR.indexOf(key) >= 0) return openGearPicker(key);
    if (SKILLS.indexOf(key) >= 0) return openSkillPicker(key);
  }

  function bind() {
    host.addEventListener("change", function (e) {
      var meta = e.target.getAttribute("data-meta");
      if (meta) {
        state[meta] = e.target.value;
        return;
      }
      var field = e.target.getAttribute("data-field");
      if (field && state[selected]) {
        state[selected][field] = e.target.value;
        if (field === "core") {
          var hint = host.querySelector("[data-field='coreValue']");
          var small = hint && hint.parentElement.querySelector("small");
          if (small) small.textContent = maxHint(e.target.value);
        }
        return;
      }
      var attrName = e.target.getAttribute("data-attr");
      if (attrName) {
        var wrap = e.target.closest("[data-index]");
        var index = Number(wrap.getAttribute("data-index"));
        var list = state[selected].attributes;
        list[index] = list[index] || {};
        list[index][attrName] = e.target.value;
        if (attrName === "name") {
          var small = wrap.querySelector("small");
          if (small) small.textContent = maxHint(e.target.value);
        }
      }
    });
    host.addEventListener("click", function (e) {
      var change = e.target.closest("[data-change]");
      if (change) return openFor(change.getAttribute("data-change"));
      var add = e.target.closest("[data-add-attr]");
      if (add) {
        state[selected].attributes.push({ name: "", value: "" });
        paint();
        return;
      }
      var remove = e.target.closest("[data-remove-attr]");
      if (remove) {
        state[selected].attributes.splice(Number(remove.getAttribute("data-remove-attr")), 1);
        paint();
        return;
      }
      var slot = e.target.closest("[data-slot]");
      if (!slot) return;
      var key = slot.getAttribute("data-slot");
      selected = key;
      if (!state[key] || !state[key].name) openFor(key);
      else paint();
    });
  }

  async function mount(el, record) {
    host = el;
    host.classList.add("ba-root");
    cat = await loadCatalogs();
    state = fromRecord(record);
    selected = "primary";
    host.innerHTML = "";
    if (!host.dataset.bound) {
      host.dataset.bound = "1";
      bind();
    }
    paint();
  }

  function read() {
    var load = clone(state);
    load.specialization = { name: state.specialization || "" };
    load.grenade = { name: state.grenade || "" };
    return load;
  }

  return { mount: mount, read: read };
})();
