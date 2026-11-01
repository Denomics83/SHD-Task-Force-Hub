/* Builds: category grid → name/role list → detail.
   Published loadouts come from Supabase public.builds only. */
(function () {
  if (!document.querySelector(".bottom-nav")) STF.mountChrome("builds");
  window.addEventListener("stf-tab", function (e) {
    if (e.detail === "builds") route(false);
  });

  var stage = document.getElementById("cat-stage");
  var listView = document.getElementById("build-list");
  var listTitle = document.getElementById("list-title");
  var listRows = document.getElementById("list-rows");
  var listBack = document.getElementById("list-back");
  var detailView = document.getElementById("build-detail");
  var detailBody = document.getElementById("detail-body");
  var detailBack = document.getElementById("detail-back");
  if (!stage || !listView || !detailView) return;

  var ROLE_ICONS = {
    dps: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3.1" fill="none" stroke="#fff" stroke-width="1.8"/><path d="M12 3.4v3.1M12 17.5v3.1M3.4 12h3.1M17.5 12h3.1" fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round"/></svg>',
    cc: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.8 13.7 8l5.3.5-4.1 3.4 1.4 5.1L12 14.2 7.7 17l1.4-5.1L5 8.5 10.3 8Z" fill="#fff"/></svg>',
    heal: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10.1 4.2h3.8V10h5.9v3.8H13.9v5.8h-3.8v-5.8H4.2V10h5.9Z" fill="#fff"/></svg>',
    tank: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.1 19.2 6v6.1c0 4.3-2.9 6.8-7.2 8.4-4.3-1.6-7.2-4.1-7.2-8.4V6Z" fill="none" stroke="#fff" stroke-width="1.8" stroke-linejoin="round"/></svg>',
    support: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="8" cy="12" r="3.2" fill="none" stroke="#fff" stroke-width="1.7"/><circle cx="15.2" cy="12" r="3.2" fill="none" stroke="#fff" stroke-width="1.7"/></svg>'
  };

  var ROLE_LABEL = {
    damage: "Damage",
    support: "Support",
    cc: "Crowd control",
    healer: "Healer",
    tank: "Tank"
  };

  function roleKind(role) {
    if (role === "healer") return "heal";
    if (role === "tank") return "tank";
    if (role === "cc") return "cc";
    if (role === "support") return "support";
    return "dps";
  }

  function roleText(row) {
    return row.roleLabel || ROLE_LABEL[row.role] || "Damage";
  }

  var CATS = [
    { id: "solo", label: "Solo", art: "assets/tiles/builds-solo.jpg" },
    { id: "team", label: "Team", art: "assets/tiles/builds-team.jpg" },
    { id: "incursion", label: "Incursion", art: "assets/tiles/builds-incursion.jpg" },
    { id: "escalation", label: "Escalation", art: "assets/tiles/builds-escalation.jpg" },
    { id: "raid", label: "Raid", art: "assets/tiles/builds-raid.jpg" },
    { id: "pvp", label: "PvP", art: "assets/tiles/builds-pvp.jpg" }
  ];

  var SLOT_ART = {
    spec: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 16h14l-1.5-5H6.5z" fill="currentColor"/><path d="M8 11V7h8v4" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>',
    grenade: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="14" r="5.5" fill="currentColor"/><path d="M12 8.5V5.5M10 6.5h4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>',
    rifle: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 15h11l2-3h6v2.2h-4.2L15 16H2z" fill="currentColor"/></svg>',
    pistol: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 12h11l1.2-2.2h5v2.6h-3.2L16 15h-2.2v5H11v-5H3z" fill="currentColor"/></svg>',
    mask: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 10c1.5-4 12.5-4 14 0v5c-1.6 4-12.4 4-14 0z" fill="currentColor"/></svg>',
    chest: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 5h12l1.5 5v9H4.5v-9z" fill="currentColor"/></svg>',
    holster: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 3h8v5l1.6 13H6.4L8 8z" fill="currentColor"/></svg>',
    bag: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 8h12v11H6zM9 8V6a3 3 0 0 1 6 0v2" fill="currentColor"/></svg>',
    gloves: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 12V5h2v7h1V4h2v8h1V6h2v7h1v7H8z" fill="currentColor"/></svg>',
    knees: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4h10v8c0 4.5-2.2 8-5 8s-5-3.5-5-8z" fill="currentColor"/></svg>',
    skill: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="6" fill="none" stroke="currentColor" stroke-width="2"/></svg>',
    watch: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="13" r="6.5" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M12 13V9.5M9 4h6M9 22h6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>'
  };

  var GRID = [
    { key: "signature", label: "Specialization", art: "spec", row: "2", force: "spec" },
    { key: "watch", label: "SHD Watch", art: "watch", row: "2" },
    { key: "primary", label: "Primary", art: "rifle", row: "3" },
    { key: "secondary", label: "Secondary", art: "rifle", row: "3" },
    { key: "sidearm", label: "Sidearm", art: "pistol", row: "3" },
    { key: "mask", label: "Mask", art: "mask", row: "2" },
    { key: "backpack", label: "Backpack", art: "bag", row: "2" },
    { key: "chest", label: "Chest", art: "chest", row: "2" },
    { key: "gloves", label: "Gloves", art: "gloves", row: "2" },
    { key: "holster", label: "Holster", art: "holster", row: "2" },
    { key: "kneepads", label: "Kneepads", art: "knees", row: "2" },
    { key: "skill1", label: "Skill 1", art: "skill", row: "3" },
    { key: "skill2", label: "Skill 2", art: "skill", row: "3" },
    { key: "grenade", label: "Grenade", art: "grenade", row: "3" }
  ];

  var BUILDS = [];

  function catById(id) {
    for (var i = 0; i < CATS.length; i++) if (CATS[i].id === id) return CATS[i];
    return null;
  }

  function buildsIn(catId) {
    return BUILDS.filter(function (row) { return row.category === catId; });
  }

  function findBuild(catId, buildId) {
    for (var i = 0; i < BUILDS.length; i++) {
      if (BUILDS[i].category === catId && BUILDS[i].id === buildId) return BUILDS[i];
    }
    return null;
  }

  function slotOf(row, key) {
    var slots = (row && row.slots) || {};
    return slots[key] || {};
  }

  function faceClass(item, force) {
    if (!item.name) return "empty";
    if (force === "spec") return "spec";
    if (item.rarity === "gear-set") return "gearset";
    if (item.rarity === "exotic") return "exotic";
    if (item.rarity === "named") return "named";
    if (item.rarity === "high-end") return "gold";
    return "empty";
  }

  function dotCount(item) {
    if (!item.name || !item.attributes) return 0;
    var parts = String(item.attributes).split(/[\n,]/).filter(function (part) { return part.trim(); });
    if (!parts.length) return 0;
    return Math.min(3, parts.length);
  }

  function localArt(value) {
    var image = String(value || "");
    if (!image || /^https?:/i.test(image)) return "";
    return image;
  }

  function libraryIcon(item) {
    if (!filledName(item) || !STF.iconFor) return null;
    return STF.iconFor(item.brand) || STF.iconFor(item.name) || STF.iconFor(item.type) || null;
  }

  var GRENADE_FILES = [
    ["fragmentation", "assets/icons/grenades/fragmentation.svg"],
    ["flashbang", "assets/icons/grenades/flashbang.svg"],
    ["incendiary", "assets/icons/grenades/incendiary.svg"],
    ["riot foam", "assets/icons/grenades/riot-foam.svg"],
    ["cluster", "assets/icons/grenades/cluster.svg"],
    ["emp", "assets/icons/grenades/emp.svg"]
  ];

  function grenadeFile(name) {
    var text = String(name || "").toLowerCase();
    var direct = STF.iconFor && STF.iconFor(name);
    if (direct && direct.kind === "grenade" && direct.file) return direct.file;
    for (var i = 0; i < GRENADE_FILES.length; i++) {
      if (text.indexOf(GRENADE_FILES[i][0]) >= 0) return GRENADE_FILES[i][1];
    }
    return direct && direct.file ? direct.file : "";
  }

  function filledName(item) {
    return !!(item && item.name);
  }

  function tdSlot(row, spec) {
    var item = slotOf(row, spec.key);
    var filled = filledName(item);
    var rarity = faceClass(item, spec.force);
    if (filled && (spec.key === "grenade" || spec.key === "watch") && rarity === "empty") rarity = "gold";
    var hit = spec.key === "grenade" ? null : libraryIcon(item);
    var grenadeSrc = spec.key === "grenade" && filled ? grenadeFile(item.name) : "";
    var own = localArt(item.image) || localArt(item.icon) || grenadeSrc;
    var art = own
      ? '<img class="' + (grenadeSrc && own === grenadeSrc ? "is-grenade" : "") + '" src="' + STF.esc(own) + '" alt="">'
      : (hit
        ? '<img class="is-mark" src="' + STF.esc(hit.file) + '" alt="">'
        : (SLOT_ART[spec.art] || SLOT_ART.skill));
    var dots = "";
    var count = dotCount(item);
    for (var i = 0; i < count; i++) dots += "<i></i>";
    var talentHit = filled && item.talent && STF.iconFor ? STF.iconFor(item.talent) : null;
    var talent = talentHit && talentHit.file
      ? '<img class="td-talent is-mark" src="' + STF.esc(talentHit.file) + '" alt="">'
      : "";
    var title = filled ? item.name : spec.label;
    var showLabel = filled && String(title).toLowerCase() !== String(spec.label).toLowerCase();
    return (
      '<button type="button" class="td-slot" data-slot="' + spec.key + '">' +
      '<div class="td-face rarity-' + rarity + '">' +
      '<span class="td-copy">' +
      (showLabel ? '<span class="td-slot-label">' + STF.esc(spec.label) + "</span>" : "") +
      '<strong class="td-name">' + STF.esc(title) + "</strong>" +
      (filled ? '<span class="td-meta"><span class="td-lvl">40</span>' + (dots ? '<span class="td-dots">' + dots + "</span>" : "") + talent + "</span>" : "") +
      "</span>" +
      '<span class="td-art">' + art + "</span>" +
      "</div></button>"
    );
  }

  function barWidth(text) {
    var match = String(text || "").match(/(\d+(?:\.\d+)?)\s*%/);
    if (!match) return 100;
    return Math.max(8, Math.min(100, parseFloat(match[1])));
  }

  function slotPanel(row, key) {
    var spec = null;
    for (var i = 0; i < GRID.length; i++) if (GRID[i].key === key) spec = GRID[i];
    if (!spec && key === "specialization") spec = { key: "specialization", label: "Specialization" };
    var item = slotOf(row, key);
    var title = item.name || (spec ? spec.label : "Slot");
    var rarity = item.name ? (item.rarity || "high-end") : "empty";
    var lines = [];
    if (item.core) lines.push({ k: "Core", v: item.core });
    if (item.talent) lines.push({ k: "Talent", v: item.talent });
    String(item.attributes || "").split(/[\n,]/).forEach(function (part) {
      if (part.trim()) lines.push({ k: "Attribute", v: part.trim() });
    });
    var bars = lines.map(function (line) {
      return (
        '<div class="attr-line"><span>' + STF.esc(line.k) + "</span><strong>" + STF.esc(line.v) + "</strong>" +
        '<i style="width:' + barWidth(line.v) + '%"></i></div>'
      );
    }).join("");
    return (
      '<p class="slot-rarity">' + STF.esc(rarity === "empty" ? "Empty" : rarity) + "</p>" +
      "<h2>" + STF.esc(title) + "</h2>" +
      (item.brand ? "<p>" + STF.esc(item.brand) + "</p>" : "") +
      (bars || '<p class="lede">No core, talent, or attributes stored for this slot.</p>')
    );
  }

  function loadoutHTML(row) {
    var rows = { "2": [], "3": [] };
    var html = "";
    var current = "";
    GRID.forEach(function (spec) {
      if (spec.row !== current) {
        if (current) html += '<div class="td-row td-row-' + current + '">' + rows[current].join("") + "</div>";
        rows[spec.row] = [];
        current = spec.row;
      }
      rows[spec.row].push(tdSlot(row, spec));
    });
    if (current) html += '<div class="td-row td-row-' + current + '">' + rows[current].join("") + "</div>";
    return (
      '<div class="td-loadout" aria-label="Gear loadout">' + html + "</div>" +
      '<aside class="slot-detail" id="slot-detail" hidden></aside>'
    );
  }

  function notesPage(row) {
    var body = row.notesHtml
      ? '<div class="rich-html">' + STF.safeHTML(row.notesHtml) + "</div>"
      : '<p class="lede">No play style notes on this build.</p>';
    return '<section class="build-notes" aria-label="Play style">' + body + "</section>";
  }

  function statNum(value, unit) {
    var n = Number(value);
    if (!isFinite(n)) return "—";
    var rounded = Math.abs(n) >= 100 ? Math.round(n) : Math.round(n * 10) / 10;
    var text = String(rounded);
    if (text === "-0") text = "0";
    var parts = text.split(".");
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return parts.join(".") + (unit || "");
  }

  function statRows(lines) {
    if (!lines.length) return "";
    return '<ul class="stat-rows">' + lines.map(function (line) {
      return "<li><span>" + STF.esc(line.name) + "</span><strong>" + STF.esc(line.value) + "</strong></li>";
    }).join("") + "</ul>";
  }

  function statBlock(title, lines) {
    if (!lines.length) return "";
    return '<section class="stat-block"><h3>' + STF.esc(title) + "</h3>" + statRows(lines) + "</section>";
  }

  function statPresent(value) {
    if (value == null || value === "") return false;
    var n = Number(value);
    return isFinite(n) && n !== 0;
  }

  function pushStat(lines, name, value, unit) {
    if (!statPresent(value)) return;
    lines.push({ name: name, value: statNum(value, unit) });
  }

  function joinedStat(lines, name, parts) {
    var shown = parts.filter(function (part) { return part; });
    if (!shown.length) return;
    lines.push({ name: name, value: shown.join(" + ") });
  }

  function damageRows(computed) {
    if (!computed || typeof computed !== "object") return [];
    var slots = [["primary", "Primary"], ["secondary", "Secondary"], ["sidearm", "Sidearm"]];
    var bag = computed.weapons && typeof computed.weapons === "object" ? computed.weapons : null;
    if (!bag && (computed.primary || computed.secondary || computed.sidearm)) bag = computed;
    var rows = [];
    if (bag) {
      slots.forEach(function (pair) {
        var row = bag[pair[0]];
        if (!row || typeof row !== "object") return;
        if (!statPresent(row.effDmgPerMag) && !statPresent(row.effAvgShot)) return;
        rows.push({
          slot: pair[1],
          name: row.name || "",
          mag: statPresent(row.effDmgPerMag) ? row.effDmgPerMag : null,
          shot: statPresent(row.effAvgShot) ? row.effAvgShot : null
        });
      });
      return rows;
    }
    if (statPresent(computed.effDmgPerMag) || statPresent(computed.effAvgShot)) {
      var slot = computed.weapon === "secondary" ? "Secondary" : computed.weapon === "sidearm" ? "Sidearm" : "Primary";
      rows.push({
        slot: slot,
        name: computed.name || "",
        mag: statPresent(computed.effDmgPerMag) ? computed.effDmgPerMag : null,
        shot: statPresent(computed.effAvgShot) ? computed.effAvgShot : null
      });
    }
    return rows;
  }

  function damageHTML(computed) {
    var rows = damageRows(computed);
    if (!rows.length) return "";
    return '<div class="dps-board">' + rows.map(function (row) {
      var title = row.name ? row.slot + " · " + row.name : row.slot;
      var cells = "";
      if (row.mag != null) cells += '<div><span>Eff. Dmg / Mag</span><strong>' + STF.esc(statNum(row.mag, "")) + "</strong></div>";
      if (row.shot != null) cells += '<div><span>Eff. Avg Shot</span><strong>' + STF.esc(statNum(row.shot, "")) + "</strong></div>";
      return '<section class="dps-weapon"><h3>' + STF.esc(title) + '</h3><div class="dps-pair">' + cells + "</div></section>";
    }).join("") + "</div>";
  }

  function renderStats(live, computed) {
    var offense = [];
    var offenseSeen = {
      weaponDamage: true,
      criticalHitChance: true,
      criticalHitDamage: true,
      headshotDamage: true
    };
    pushStat(offense, "Weapon Damage", live.stats.weaponDamage, "%");
    ["assaultRifleDamage", "smgDamage", "lmgDamage", "rifleDamage", "marksmanRifleDamage", "shotgunDamage", "pistolDamage"].forEach(function (id) {
      offenseSeen[id] = true;
      if (!statPresent(live.stats[id])) return;
      offense.push({ name: ShadeEngine.STATS[id].name, value: statNum(live.stats[id], "%") });
    });
    if (statPresent(live.criticalHitChanceCapped)) {
      var chcValue = statNum(live.criticalHitChanceCapped, "%");
      if (live.criticalHitChance > live.criticalHitChanceCap) {
        chcValue += " (" + statNum(live.criticalHitChance, "%") + ")";
      }
      offense.push({ name: "Critical Hit Chance", value: chcValue });
    }
    pushStat(offense, "Critical Hit Damage", live.stats.criticalHitDamage, "%");
    pushStat(offense, "Headshot Damage", live.stats.headshotDamage, "%");
    (live.groups.offense || []).forEach(function (row) {
      if (offenseSeen[row.id] || !statPresent(row.value)) return;
      offense.push({ name: row.name, value: statNum(row.value, row.unit) });
    });
    var defense = [];
    pushStat(defense, "Armor", live.armor && live.armor.total, "");
    if (live.health && live.health.total != null) pushStat(defense, "Health", live.health.total, "");
    else if (live.health) {
      joinedStat(defense, "Health", [
        statPresent(live.health.flat) ? statNum(live.health.flat, "") : "",
        statPresent(live.health.percent) ? statNum(live.health.percent, "%") : ""
      ]);
    }
    joinedStat(defense, "Armor Regen", [
      statPresent(live.stats.armorRegen) ? statNum(live.stats.armorRegen, "") : "",
      statPresent(live.stats.armorRegenPercent) ? statNum(live.stats.armorRegenPercent, "%") : ""
    ]);
    joinedStat(defense, "Armor on Kill", [
      statPresent(live.stats.armorOnKill) ? statNum(live.stats.armorOnKill, "") : "",
      statPresent(live.stats.armorOnKillPercent) ? statNum(live.stats.armorOnKillPercent, "%") : ""
    ]);
    var defenseSeen = {
      armorFlat: true,
      totalArmor: true,
      healthFlat: true,
      healthPercent: true,
      armorRegen: true,
      armorRegenPercent: true,
      armorOnKill: true,
      armorOnKillPercent: true
    };
    (live.groups.defense || []).forEach(function (row) {
      if (defenseSeen[row.id] || !statPresent(row.value)) return;
      defense.push({ name: row.name, value: statNum(row.value, row.unit) });
    });
    var skill = [];
    if (statPresent(live.skillTierEffective) || live.overcharge) {
      var tier = statNum(live.skillTierEffective, "");
      if (live.overcharge) tier += " (overcharge " + statNum(live.skillTier, "") + ")";
      skill.push({ name: "Skill Tier", value: tier });
    }
    (live.groups.skill || []).forEach(function (row) {
      if (!statPresent(row.value) || row.id === "skillTier") return;
      skill.push({ name: row.name, value: statNum(row.value, row.unit) });
    });
    (live.skillMods || []).forEach(function (mod) {
      if (!statPresent(mod.value)) return;
      var who = mod.specialization ? " (" + mod.specialization + ")" : "";
      skill.push({ name: (mod.skill ? mod.skill + " · " : "") + mod.name + who, value: statNum(mod.value, mod.unit) });
    });
    return (
      '<div class="stat-sheet">' +
      damageHTML(computed) +
      statBlock("Offense", offense) +
      statBlock("Defense", defense) +
      statBlock("Skill", skill) +
      "</div>"
    );
  }

  var catalogPromise = null;
  function builderCatalog() {
    if (!window.ShadeCatalog) return Promise.reject(new Error("catalog"));
    if (!catalogPromise) catalogPromise = ShadeCatalog.load(STF.fetchJSON);
    return catalogPromise;
  }

  function fillStats(row, node) {
    if (!node) return;
    if (!window.ShadeEngine || !window.ShadeCatalog) {
      node.innerHTML = '<p class="lede">Stats are unavailable.</p>';
      return;
    }
    builderCatalog().then(function (catalog) {
      var state = ShadeCatalog.fromSaved(row.loadout || {}, catalog);
      var computed = (row.loadout && row.loadout.computed) || state.computed || null;
      node.innerHTML = renderStats(ShadeEngine.compute(state, catalog), computed);
    }).catch(function (err) {
      console.error(err);
      node.innerHTML = '<p class="lede">Could not compute this build.</p>';
    });
  }

  function detailHTML(row) {
    var tabs = [
      { id: "stats", label: "Stats" },
      { id: "loadout", label: "Loadout" },
      { id: "playstyle", label: "Play style" }
    ];
    return (
      '<p class="build-kicker">' + STF.esc(row.name) + " · " + STF.esc(roleText(row)) + "</p>" +
      '<div class="build-tabs" role="tablist">' + tabs.map(function (tab) {
        var on = tab.id === "loadout" ? ' aria-current="true"' : "";
        return '<button type="button" role="tab" data-build-tab="' + tab.id + '"' + on + ">" + tab.label + "</button>";
      }).join("") + "</div>" +
      '<div class="build-rail" tabindex="0">' +
      '<section class="build-page" data-build-page="stats" aria-label="Stats"><p class="lede">Computing stats…</p></section>' +
      '<section class="build-page" data-build-page="loadout" aria-label="Loadout">' + loadoutHTML(row) + "</section>" +
      '<section class="build-page" data-build-page="playstyle" aria-label="Play style">' + notesPage(row) + "</section>" +
      "</div>"
    );
  }

  function centerBuildPage(rail, id, smooth) {
    var page = rail.querySelector('[data-build-page="' + id + '"]');
    if (!page || !rail.clientWidth) return;
    rail.scrollTo({ left: page.offsetLeft, behavior: smooth ? "smooth" : "auto" });
  }

  function activeBuildPage(rail) {
    var pages = rail.querySelectorAll(".build-page");
    var mid = rail.scrollLeft + rail.clientWidth / 2;
    var best = "loadout";
    var bestDist = Infinity;
    pages.forEach(function (page) {
      var center = page.offsetLeft + page.offsetWidth / 2;
      var dist = Math.abs(center - mid);
      if (dist < bestDist) {
        bestDist = dist;
        best = page.getAttribute("data-build-page");
      }
    });
    return best;
  }

  function markBuildTab(root, id) {
    root.querySelectorAll("[data-build-tab]").forEach(function (btn) {
      if (btn.getAttribute("data-build-tab") === id) btn.setAttribute("aria-current", "true");
      else btn.removeAttribute("aria-current");
    });
  }

  function buildsURL(hash) {
    if (document.body.classList.contains("page-resources")) {
      return "resources.html?tab=builds" + (hash || "");
    }
    return hash ? "builds.html" + hash : "builds.html";
  }

  function setHeaderBack(mode, cat) {
    var top = document.querySelector(".topbar");
    var pill = document.querySelector(".hub-pill");
    var back = document.getElementById("builds-back");
    if (pill) pill.hidden = mode !== "off";
    if (mode === "off") {
      if (back) back.remove();
      return;
    }
    if (!top) return;
    if (!back) {
      back = document.createElement("button");
      back.type = "button";
      back.id = "builds-back";
      back.className = "upd-header-back";
      back.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5 8 12l7 7" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
      top.appendChild(back);
    }
    if (mode === "detail" && cat) {
      back.setAttribute("aria-label", "Back to " + cat.label);
      back.onclick = function () {
        history.pushState({ cat: cat.id }, "", buildsURL("#" + cat.id));
        showList(cat.id, false);
      };
      return;
    }
    back.setAttribute("aria-label", "Back to Builds");
    back.onclick = function () {
      history.pushState({}, "", buildsURL(""));
      showGrid();
    };
  }

  function showGrid() {
    document.body.classList.add("is-grid");
    document.body.classList.remove("is-list");
    stage.hidden = false;
    listView.hidden = true;
    detailView.hidden = true;
    setHeaderBack("off");
    window.scrollTo(0, 0);
  }

  function showList(catId, push) {
    var cat = catById(catId);
    if (!cat) return showGrid();
    document.body.classList.remove("is-grid");
    document.body.classList.add("is-list");
    stage.hidden = true;
    detailView.hidden = true;
    listView.hidden = false;
    setHeaderBack("list");
    if (listTitle) listTitle.textContent = cat.label;
    var rows = buildsIn(catId);
    listRows.innerHTML = rows.length
      ? rows.map(function (row) {
        var kind = roleKind(row.role);
        return (
          '<button type="button" class="build-row" data-build="' + STF.esc(row.id) + '">' +
          '<span class="build-copy"><strong>' + STF.esc(row.name) + "</strong>" +
          "<em>" + STF.esc(roleText(row) + " · " + (cat ? cat.label : row.category)) + "</em></span>" +
          '<span class="role-ico ' + kind + '" aria-hidden="true">' + ROLE_ICONS[kind] + "</span>" +
          "</button>"
        );
      }).join("")
      : '<p class="lede">No builds yet.</p>';
    window.scrollTo(0, 0);
    if (push) history.pushState({ cat: catId }, "", buildsURL("#" + catId));
  }

  function showDetail(catId, buildId, push) {
    var row = findBuild(catId, buildId);
    var cat = catById(catId);
    if (!row || !cat) return showList(catId, false);
    document.body.classList.remove("is-grid");
    document.body.classList.add("is-list");
    stage.hidden = true;
    listView.hidden = true;
    detailView.hidden = false;
    setHeaderBack("detail", cat);
    openBuild = row;
    detailBody.innerHTML = detailHTML(row);
    var rail = detailBody.querySelector(".build-rail");
    fillStats(row, detailBody.querySelector('[data-build-page="stats"]'));
    if (rail) {
      var place = function () { centerBuildPage(rail, "loadout", false); };
      requestAnimationFrame(function () { place(); requestAnimationFrame(place); });
      rail.addEventListener("scroll", function () { markBuildTab(detailBody, activeBuildPage(rail)); }, { passive: true });
      rail.addEventListener("keydown", function (e) {
        if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
        e.preventDefault();
        var order = ["stats", "loadout", "playstyle"];
        var next = order.indexOf(activeBuildPage(rail)) + (e.key === "ArrowRight" ? 1 : -1);
        if (next < 0 || next >= order.length) return;
        centerBuildPage(rail, order[next], true);
        markBuildTab(detailBody, order[next]);
      });
    }
    window.scrollTo(0, 0);
    if (push) history.pushState({ cat: catId, build: buildId }, "", buildsURL("#" + catId + "/" + buildId));
  }

  var CAT_ICONS = {
    solo: '<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="3"/><path d="M6 19c1-3.2 3-4.8 6-4.8s5 1.6 6 4.8"/></svg>',
    team: '<svg viewBox="0 0 24 24"><circle cx="8" cy="9" r="2.4"/><circle cx="16" cy="9" r="2.4"/><path d="M3.5 19c.8-2.6 2.4-4 4.5-4s3.7 1.4 4.5 4M12 19c.8-2.4 2.2-3.6 4-3.6s3.2 1.2 4 3.6"/></svg>',
    incursion: '<svg viewBox="0 0 24 24"><path d="M12 4 19 8.2v7.6L12 20l-7-4.2V8.2z"/></svg>',
    escalation: '<svg viewBox="0 0 24 24"><path d="M5 18h4V8H5zM10 18h4V5h-4zM15 18h4v-7h-4z"/></svg>',
    raid: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M12 3.5v3M12 17.5v3M3.5 12h3M17.5 12h3"/></svg>',
    pvp: '<svg viewBox="0 0 24 24"><path d="M5 6h6l2 3h6M5 18h6l2-3h6"/></svg>'
  };

  function pad2(n) {
    return (n < 10 ? "0" : "") + n;
  }

  function paintGrid() {
    stage.innerHTML =
      '<div class="cat-grid">' +
      CATS.map(function (cat) {
        var count = buildsIn(cat.id).length;
        return (
          '<button type="button" class="cat-tile col-tile" data-cat="' + cat.id + '">' +
          '<span class="col-title">' + STF.esc(cat.label) + "</span>" +
          '<span class="col-ring">' + CAT_ICONS[cat.id] + "</span>" +
          '<span class="col-count">' + pad2(count) + "</span>" +
          "</button>"
        );
      }).join("") +
      "</div>";
  }

  var openBuild = null;
  detailBody.addEventListener("click", function (e) {
    var tab = e.target.closest("[data-build-tab]");
    if (tab && detailBody.contains(tab)) {
      var rail = detailBody.querySelector(".build-rail");
      if (rail) centerBuildPage(rail, tab.getAttribute("data-build-tab"), true);
      markBuildTab(detailBody, tab.getAttribute("data-build-tab"));
      return;
    }
    var btn = e.target.closest(".td-slot");
    if (!btn || !openBuild || !detailBody.contains(btn)) return;
    detailBody.querySelectorAll(".td-slot").forEach(function (el) { el.classList.remove("is-picked"); });
    btn.classList.add("is-picked");
    var panel = document.getElementById("slot-detail");
    if (!panel) return;
    panel.hidden = false;
    panel.innerHTML = slotPanel(openBuild, btn.getAttribute("data-slot"));
    panel.scrollIntoView({ block: "nearest", inline: "nearest" });
  });

  stage.addEventListener("click", function (e) {
    var btn = e.target.closest("[data-cat]");
    if (!btn) return;
    showList(btn.getAttribute("data-cat"), true);
  });

  listRows.addEventListener("click", function (e) {
    var btn = e.target.closest("[data-build]");
    if (!btn) return;
    var catId = (location.hash || "").replace("#", "").split("/")[0];
    showDetail(catId, btn.getAttribute("data-build"), true);
  });

  if (listBack) {
    listBack.addEventListener("click", function () {
      history.pushState({}, "", buildsURL(""));
      showGrid();
    });
  }
  if (detailBack) {
    detailBack.addEventListener("click", function () {
      var catId = (location.hash || "").replace("#", "").split("/")[0];
      history.pushState({ cat: catId }, "", buildsURL("#" + catId));
      showList(catId, false);
    });
  }

  window.addEventListener("popstate", function () {
    route(false);
  });

  function buildsTabActive() {
    if (!document.body.classList.contains("page-resources")) return true;
    var tab = new URLSearchParams(location.search).get("tab") || "builds";
    if (tab === "maps") tab = "builds";
    var hash = (location.hash || "").replace("#", "");
    if (hash === "hunters" || hash.indexOf("hunters/") === 0) return false;
    return tab !== "hunters" && tab !== "creators" && tab !== "mutators";
  }

  function route(push) {
    if (!buildsTabActive()) return;
    var parts = (location.hash || "").replace("#", "").split("/");
    var catId = parts[0];
    var buildId = parts[1];
    if (catId && buildId && findBuild(catId, buildId)) showDetail(catId, buildId, push);
    else if (catId && catById(catId)) showList(catId, push);
    else showGrid();
  }

  function slotFromLoadout(item) {
    item = item || {};
    var attrs = item.attributes;
    var attrText = Array.isArray(attrs)
      ? attrs.map(function (attr) { return [attr.name, attr.value].filter(function (part) { return part != null && part !== ""; }).join(" "); }).join("\n")
      : (attrs || "");
    var core = item.core || "";
    if (item.coreValue != null && item.coreValue !== "" && String(core).indexOf(String(item.coreValue)) < 0) {
      core = (core + " " + item.coreValue).trim();
    }
    var extra = [];
    if (item.core2) extra.push([item.core2, item.core2Value].filter(function (part) { return part != null && part !== ""; }).join(" "));
    if (typeof item.mod === "string" && item.mod) extra.push([item.mod, item.modValue].filter(function (part) { return part != null && part !== ""; }).join(" "));
    if (Array.isArray(item.mods)) {
      item.mods.forEach(function (mod) {
        if (!mod) return;
        extra.push([mod.name || mod.stat, mod.value].filter(function (part) { return part != null && part !== ""; }).join(" "));
      });
    }
    if (item.prototype) extra.push("Prototype");
    if (item.expertise) extra.push("Expertise " + item.expertise);
    if (extra.length) attrText = [attrText].concat(extra).filter(Boolean).join("\n");
    return {
      name: item.name || "",
      brand: item.brand || "",
      rarity: item.rarity || "",
      talent: item.talent || "",
      core: core,
      attributes: attrText,
      image: /^https?:/i.test(String(item.image || "")) ? "" : (item.image || ""),
      icon: /^https?:/i.test(String(item.icon || "")) ? "" : (item.icon || ""),
      catalogId: item.catalogId || ""
    };
  }

  function watchSlot(watch) {
    var data = watch || {};
    var maxed = !!data.max;
    var points = data.points || {};
    var spent = 0;
    Object.keys(points).forEach(function (key) { spent += Number(points[key]) || 0; });
    if (!maxed && spent <= 0) return slotFromLoadout({});
    return slotFromLoadout({
      name: maxed ? "Max" : "Custom",
      rarity: "high-end",
      attributes: maxed ? "Maxed" : (spent + " points")
    });
  }

  function fromRemoteBuild(row) {
    var load = row.loadout || {};
    var spec = load.specialization && load.specialization.name ? load.specialization : { name: load.specialization || "" };
    var grenade = load.grenade && load.grenade.name ? load.grenade : { name: load.grenade || "" };
    var style = row.playstyle || "";
    var role = "damage";
    var lower = style.toLowerCase();
    if (lower.indexOf("tank") >= 0) role = "tank";
    else if (lower.indexOf("heal") >= 0) role = "healer";
    else if (lower.indexOf("crowd") >= 0) role = "cc";
    else if (lower.indexOf("skill") >= 0 || lower.indexOf("hybrid") >= 0 || lower.indexOf("support") >= 0) role = "support";
    return {
      id: row.id,
      name: row.name,
      category: row.category,
      role: role,
      roleLabel: style || "Damage",
      playstyle: style,
      notesHtml: row.notes_html || "",
      loadout: row.loadout || {},
      slots: {
        signature: slotFromLoadout(spec),
        watch: watchSlot(load.watch),
        grenade: slotFromLoadout(grenade),
        primary: slotFromLoadout(load.primary),
        secondary: slotFromLoadout(load.secondary),
        sidearm: slotFromLoadout(load.sidearm),
        mask: slotFromLoadout(load.mask),
        chest: slotFromLoadout(load.chest),
        holster: slotFromLoadout(load.holster),
        backpack: slotFromLoadout(load.backpack),
        gloves: slotFromLoadout(load.gloves),
        kneepads: slotFromLoadout(load.kneepads),
        skill1: slotFromLoadout(load.skill1),
        skill2: slotFromLoadout(load.skill2)
      }
    };
  }

  paintGrid();
  (async function loadBuilds() {
    try { await STF.loadIcons(); } catch (err) { console.error(err); }
    var remote = [];
    if (STF.sb) {
      var res = await STF.sb.from("builds").select("id, category, playstyle, name, notes_html, loadout, published").eq("published", true);
      if (!res.error && res.data) remote = res.data.map(fromRemoteBuild);
    }
    BUILDS = remote;
    paintGrid();
    route(false);
  })();
})();
