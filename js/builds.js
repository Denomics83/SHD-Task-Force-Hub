/* Builds: category grid → name/role list → detail.
   Loadouts come from data/builds.json. The owner's second "Incursion" block is Escalation. */
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
    skill: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="6" fill="none" stroke="currentColor" stroke-width="2"/></svg>'
  };

  var GRID = [
    { key: "signature", label: "Signature", art: "spec", row: "2", force: "spec" },
    { key: "grenade", label: "Grenade", art: "grenade", row: "2" },
    { key: "primary", label: "Primary", art: "rifle", row: "3" },
    { key: "secondary", label: "Secondary", art: "rifle", row: "3" },
    { key: "sidearm", label: "Sidearm", art: "pistol", row: "3" },
    { key: "mask", label: "Mask", art: "mask", row: "2" },
    { key: "chest", label: "Chest", art: "chest", row: "2" },
    { key: "holster", label: "Holster", art: "holster", row: "2" },
    { key: "backpack", label: "Backpack", art: "bag", row: "2" },
    { key: "gloves", label: "Gloves", art: "gloves", row: "2" },
    { key: "kneepads", label: "Kneepads", art: "knees", row: "2" },
    { key: "skill1", label: "Skill", art: "skill", row: "2" },
    { key: "skill2", label: "Skill", art: "skill", row: "2" }
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

  function tdSlot(row, spec) {
    var item = slotOf(row, spec.key);
    var rarity = faceClass(item, spec.force);
    var filled = !!item.name;
    var art = filled && item.image
      ? '<img src="' + STF.esc(item.image) + '" alt="">'
      : (SLOT_ART[spec.art] || SLOT_ART.skill);
    var dots = "";
    var count = dotCount(item);
    for (var i = 0; i < count; i++) dots += "<i></i>";
    var mark = "";
    if (filled && item.brand) {
      mark = '<span class="td-mark">' + STF.esc(String(item.brand).trim().charAt(0).toUpperCase()) + "</span>";
    }
    var lvl = filled ? '<span class="td-lvl">40</span>' : "";
    var title = filled ? item.name : spec.label;
    return (
      '<button type="button" class="td-slot" data-slot="' + spec.key + '">' +
      '<div class="td-face rarity-' + rarity + '">' +
      lvl +
      '<span class="td-art">' + art + "</span>" +
      mark +
      (dots ? '<span class="td-dots">' + dots + "</span>" : "") +
      "</div>" +
      '<span class="td-title">' + STF.esc(title) + "</span>" +
      "</button>"
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
      '<div class="build-sheet">' +
      '<div class="td-loadout" aria-label="Gear loadout">' + html + "</div>" +
      '<aside class="slot-detail" id="slot-detail" hidden><p class="lede">Tap a slot.</p></aside>' +
      "</div>" +
      '<p class="pad-hints"><span><i>Tap</i> Inspect</span><span><i>Esc</i> Back</span></p>'
    );
  }

  function playstyleHTML(row) {
    var bits = [];
    if (row.notesHtml) bits.push('<div class="detail-blurb rich-html">' + STF.safeHTML(row.notesHtml) + "</div>");
    if (row.description) bits.push('<p class="detail-blurb">' + STF.esc(row.description) + "</p>");
    String(row.playstyle || "").split(/\n\s*\n/).forEach(function (para) {
      if (para.trim()) bits.push('<p class="detail-blurb">' + STF.esc(para.trim()) + "</p>");
    });
    if (!bits.length) return "";
    return '<section class="build-secondary" aria-label="Playstyle"><h2>Playstyle</h2>' + bits.join("") + "</section>";
  }

  function specsHTML(row) {
    var lines = [];
    GRID.forEach(function (spec) {
      var item = slotOf(row, spec.key);
      if (!item.name) return;
      var extra = [item.brand, item.talent, item.core, item.attributes].filter(function (part) { return part && String(part).trim(); });
      lines.push("<li><span>" + STF.esc(spec.label) + "</span> " + STF.esc(item.name + (extra.length ? " · " + extra.join(" · ") : "")) + "</li>");
    });
    var specItem = slotOf(row, "specialization");
    if (specItem.name) {
      lines.push("<li><span>Specialization</span> " + STF.esc(specItem.name) + "</li>");
    }
    if (!lines.length) return "";
    return (
      '<section class="build-secondary" aria-label="Specs">' +
      "<h2>Specs</h2>" +
      '<ul class="piece-list">' + lines.join("") + "</ul>" +
      "</section>"
    );
  }

  function detailHTML(row) {
    return (
      '<p class="build-kicker">' + STF.esc(row.name) + " · " + STF.esc(roleText(row)) + "</p>" +
      loadoutHTML(row) +
      playstyleHTML(row) +
      specsHTML(row)
    );
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
          "<em>" + STF.esc(roleText(row)) + "</em></span>" +
          '<span class="role-ico ' + kind + '" aria-hidden="true">' + ROLE_ICONS[kind] + "</span>" +
          "</button>"
        );
      }).join("")
      : '<p class="lede">No builds in this category yet.</p>';
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
    var btn = e.target.closest(".td-slot");
    if (!btn || !openBuild || !detailBody.contains(btn)) return;
    detailBody.querySelectorAll(".td-slot").forEach(function (el) { el.classList.remove("is-picked"); });
    btn.classList.add("is-picked");
    var panel = document.getElementById("slot-detail");
    if (!panel) return;
    panel.hidden = false;
    panel.innerHTML = slotPanel(openBuild, btn.getAttribute("data-slot"));
    panel.scrollIntoView({ block: "nearest" });
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
    var hash = (location.hash || "").replace("#", "");
    if (hash === "hunters" || hash.indexOf("hunters/") === 0) return false;
    return tab !== "maps" && tab !== "hunters" && tab !== "creators";
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
      ? attrs.map(function (attr) { return [attr.name, attr.value].filter(Boolean).join(" "); }).join("\n")
      : (attrs || "");
    return {
      name: item.name || "",
      brand: item.brand || "",
      rarity: item.rarity || "",
      talent: item.talent || "",
      core: item.core || "",
      attributes: attrText,
      image: item.image || ""
    };
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
      description: row.short_description || "",
      playstyle: "",
      notesHtml: row.notes_html || "",
      slots: {
        signature: slotFromLoadout(spec),
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
    var local = [];
    try {
      var doc = await STF.fetchJSON("data/builds.json");
      local = (doc && doc.builds) || [];
    } catch (err) {
      console.error(err);
    }
    var remote = [];
    if (STF.sb) {
      var res = await STF.sb.from("builds").select("id, category, playstyle, name, short_description, notes_html, loadout, published").eq("published", true);
      if (!res.error && res.data) remote = res.data.map(fromRemoteBuild);
    }
    var seen = {};
    remote.forEach(function (row) { seen[row.id] = 1; });
    BUILDS = remote.concat(local.filter(function (row) { return !seen[row.id]; }));
    paintGrid();
    route(false);
    if (!BUILDS.length) listRows.innerHTML = '<p class="lede">Could not load builds.</p>';
  })();
})();
