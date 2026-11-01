/* Season detail opened from the Events season card. */
(async function () {
  STF.mountChrome("");
  mountEventsBack();

  var title = document.getElementById("season-title");
  var kicker = document.getElementById("season-kicker");
  var remain = document.getElementById("season-remain");
  var tabs = document.getElementById("season-tabs");
  var panels = {
    manhunts: document.getElementById("panel-manhunts"),
    journey: document.getElementById("panel-journey"),
    modifiers: document.getElementById("panel-modifiers")
  };
  var themeEl = document.getElementById("season-theme");

  function sourceLine(name, url) {
    var link = url
      ? '<a href="' + STF.esc(url) + '" target="_blank" rel="noopener">' + STF.esc(name) + "</a>"
      : STF.esc(name);
    return '<p class="src-line">Source: ' + link + " · checked 29 Oct 2026</p>";
  }

  function renderCards(items) {
    return (items || [])
      .map(function (it) {
        return (
          '<article class="season-item">' +
          (it.status ? '<span class="status">' + STF.esc(it.status) + "</span>" : "") +
          "<h3>" + STF.esc(it.title) + "</h3>" +
          "<p>" + STF.esc(it.blurb) + "</p></article>"
        );
      })
      .join("");
  }

  var SCOUT_ICO = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 20" fill="currentColor"><path d="M12.0 1.0 L22 19 L18.4 19 L10.2 4.24 Z"/><path d="M9.4 5.68 L16.8 19 L13.4 19 L7.7 8.74 Z"/><path d="M6.9 10.18 L11.8 19 L8.6 19 L5.3 13.06 Z"/></svg>';
  var HVT_ICO = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="5.6" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M12 3.2v3.1M12 17.7v3.1M3.2 12h3.1M17.7 12h3.1" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/></svg>';
  var ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII", "XIII", "XIV", "XV"];

  function pad2(n) {
    return (n < 10 ? "0" : "") + n;
  }

  function weekIdentity(week) {
    var scout = String(week.scout || "");
    var hvt = scout.match(/HVT\s*(\d+)/i);
    if (hvt) return { kind: "hvt", title: "HVT " + hvt[1] };
    var num = scout.match(/Scout\s*(\d+)/i);
    if (num) return { kind: "scout", title: "Scout " + num[1] };
    var plain = scout.replace(/\s*[—-].*$/, "").trim();
    return { kind: "scout", title: plain || ("Scout " + (week.week || "")) };
  }

  function weekHTML(week, index) {
    var tasks = (week.tasks || []).slice(0, 3);
    var id = weekIdentity(week);
    var panelId = "mh-panel-" + index;
    var icon = id.kind === "hvt" ? HVT_ICO : SCOUT_ICO;
    var rows = tasks.map(function (task, t) {
      return (
        '<div class="mh-obj">' +
        '<span class="mh-obj-label">Objective ' + (t + 1) + "</span>" +
        "<p>" + STF.esc(task) + "</p></div>"
      );
    }).join("");
    return (
      '<article class="mh-week">' +
      '<button type="button" class="mh-head" aria-expanded="false" aria-controls="' + panelId + '">' +
      '<span class="mh-logo mh-logo-' + id.kind + '" aria-hidden="true">' + icon + "</span>" +
      '<span class="mh-titles"><strong>' + STF.esc(id.title) + "</strong>" +
      '<small>Week ' + STF.esc(week.week) + "</small></span>" +
      "</button>" +
      '<div class="mh-panel" id="' + panelId + '" role="region">' +
      '<div class="mh-panel-inner">' + rows + "</div></div></article>"
    );
  }

  function bindManhunt(root) {
    if (!root || root.dataset.manhuntBound) return;
    root.dataset.manhuntBound = "1";
    root.addEventListener("click", function (e) {
      var btn = e.target.closest(".mh-head");
      if (!btn || !root.contains(btn)) return;
      var panel = document.getElementById(btn.getAttribute("aria-controls"));
      if (!panel) return;
      var open = btn.getAttribute("aria-expanded") !== "true";
      btn.setAttribute("aria-expanded", open ? "true" : "false");
      btn.classList.toggle("is-on", open);
      panel.classList.toggle("is-open", open);
    });
  }

  function isBlankCopy(text) {
    var value = String(text || "").trim().toLowerCase();
    if (!value) return true;
    return /add name|add task|add details|details coming soon|confirm in-game/.test(value);
  }

  function taskParts(task) {
    if (task && typeof task === "object") {
      var text = task.text || task.task || task.name || "";
      var count = task.count || task.progress || task.need || "";
      if (isBlankCopy(text)) return null;
      return { text: String(text).trim(), count: isBlankCopy(count) ? "" : String(count).trim() };
    }
    var raw = String(task || "").trim();
    if (isBlankCopy(raw)) return null;
    var lead = raw.match(/^(\d+\s*\/\s*\d+)\s+(.+)$/);
    if (lead && !isBlankCopy(lead[2])) return { text: lead[2].trim(), count: lead[1].replace(/\s+/g, "") };
    return { text: raw, count: "" };
  }

  function requiredLine(mission) {
    var raw = mission.required != null ? mission.required : mission.requiredToComplete;
    if (raw == null || raw === "") raw = mission.need;
    if (raw == null || String(raw).trim() === "" || isBlankCopy(raw)) return "";
    var num = parseInt(raw, 10);
    var label = !isNaN(num) && String(raw).trim() === String(num) ? pad2(num) : String(raw).trim();
    return label + " Required to Complete";
  }

  function journeyHTML(pack) {
    var missions = (pack && pack.missions) || [];
    if (!missions.length) return '<p class="lede">No journey missions for this season.</p>';
    var nav = missions.map(function (mission, index) {
      var on = index === 0;
      var numeral = ROMAN[index] || String(index + 1);
      return (
        '<button type="button" class="jy-num' + (on ? " is-on" : "") + '" role="tab" data-mission="' + index + '"' +
        ' aria-selected="' + (on ? "true" : "false") + '" aria-controls="jy-mission-' + index + '">' +
        STF.esc(numeral) + "</button>"
      );
    }).join("");
    var heads = missions.map(function (mission, index) {
      var realName = isBlankCopy(mission.name) ? "" : String(mission.name).trim();
      var required = requiredLine(mission);
      return (
        '<header class="jy-head" data-mission="' + index + '"' + (index === 0 ? "" : " hidden") + ">" +
        "<h2>Journey Mission " + (index + 1) + "</h2>" +
        (realName ? '<p class="jy-name">' + STF.esc(realName) + "</p>" : "") +
        (required ? '<p class="jy-req">' + STF.esc(required) + "</p>" : "") +
        "</header>"
      );
    }).join("");
    var panels = missions.map(function (mission, index) {
      var tasks = (mission.tasks || []).map(taskParts).filter(Boolean);
      var body = tasks.length
        ? tasks.map(function (task) {
          var count = task.count ? '<b>' + STF.esc(task.count) + "</b>" : "";
          return '<div class="jy-task">' + count + "<span>" + STF.esc(task.text) + "</span></div>";
        }).join("")
        : '<p class="jy-empty">Tasks not confirmed yet</p>';
      return (
        '<section class="jy-mission' + (index === 0 ? " is-on" : "") + '" id="jy-mission-' + index + '" role="tabpanel"' + (index === 0 ? "" : " hidden") + ">" +
        body + "</section>"
      );
    }).join("");
    return (
      '<div class="jy-board">' +
      '<div class="jy-heads">' + heads + "</div>" +
      '<div class="jy-nav" role="tablist" aria-label="Journey missions">' + nav + "</div>" +
      '<div class="jy-detail">' + panels + "</div></div>"
    );
  }

  function bindJourney(root) {
    if (!root || root.dataset.journeyBound) return;
    root.dataset.journeyBound = "1";
    root.addEventListener("click", function (e) {
      var num = e.target.closest(".jy-num");
      if (num && root.contains(num)) {
        var id = num.getAttribute("data-mission");
        root.querySelectorAll(".jy-num").forEach(function (btn) {
          var on = btn === num;
          btn.classList.toggle("is-on", on);
          btn.setAttribute("aria-selected", on ? "true" : "false");
        });
        root.querySelectorAll(".jy-mission").forEach(function (panel) {
          var on = panel.id === "jy-mission-" + id;
          panel.classList.toggle("is-on", on);
          panel.hidden = !on;
        });
        root.querySelectorAll(".jy-head").forEach(function (head) {
          head.hidden = head.getAttribute("data-mission") !== id;
        });
      }
    });
  }

  function globalHTML(list) {
    if (!list.length) return '<p class="lede">No global modifiers for this season.</p>';
    return list.map(function (item) {
      var guide = item.guide && /^https?:\/\//i.test(String(item.guide).trim())
        ? '<a class="guide-btn" href="' + STF.esc(item.guide) + '" target="_blank" rel="noopener">Guide</a>'
        : "";
      return (
        '<article class="season-item"><h3>' + STF.esc(item.name) + "</h3><p>" +
        STF.esc(item.description) + "</p>" + guide + "</article>"
      );
    }).join("");
  }

  var MOD_LINES = {
    "Fiery Aura": ["Armor Regen and Damage Resistance up", "Extra protection while sprinting", "Enemies burn on first entry"],
    "Vicarious Combustion": ["Headshot on a burning enemy spreads Burn", "Higher levels cover a larger area", "Top level: headshots apply Burn"],
    "Signed, Shield, Delivered": ["Signature Weapon, Shield Health, and Shield Regen up", "Those kills refill the magazine", "Top level can extend the modifier"],
    "Flow Regulator": ["+10% Pressure per action"],
    "Throttle Valve": ["+25% Pressure per action", "Decay 50% faster"],
    "Flux Stabilizer": ["Decay 25% slower"],
    "Pressure Control": ["Decay 50% slower", "Gain −20% per action"],
    "Quality Seals": ["Decay starts later"],
    "Delayed Venting": ["Bonuses at 0 / 20 / 50 / 80%", "Actives unlock 10% sooner"],
    "Leaky Valve": ["Cover no longer stops decay", "Gain +50%", "Actives need 95% Pressure"],
    "Vacuum Seal": ["No decay", "Gain −50%"],
    "Reserve Tank": ["After an Active, gauge returns to 20%"],
    "All or Nothing": ["Below 80% becomes 0", "Above 80% +25%"],
    "Kickstart": ["Above 80% becomes 0", "Below 80% +50%"],
    "New Formula: Beta": ["Primary bonus is Signature Weapon Damage", "10 / 20 / 30 / 50%"],
    "New Formula: Gamma": ["Primary bonus is Hazard Protection", "5 / 15 / 25 / 40%"],
    "Microwave Coils": ["Up to 4 pulsed enemies", "30% chance to burn", "+3% Pressure each"],
    "New Model": ["K8 flamethrower +30% to named", "−50% spread · +100% range"],
    "Afterburner": ["Kill a burning enemy", "+20% movement speed for 30s"],
    "Flint and Steel": ["Skill plus gunfire ignites", "15s cooldown"],
    "Fire with Fire": ["Being burned", "+50% burn damage for 30s"],
    "Firestarter": ["Grenades +100% range", "Applies a short burn"],
    "Modular Plates": ["Armor kits +100% bonus armor", "Restores the shield"],
    "Draining Presence": ["Drains ammo and Pressure while close", "Fire removes it"],
    "Achilles' Heal": ["Broken armor heals the enemy", "Cuts your Pressure", "Fire removes it"],
    "Thousand Cuts": ["Hits cut Pressure", "Stacks a damage-reduction debuff", "Fire removes it"]
  };
  var MOD_GROUPS = [
    { label: "Pressure", names: ["Flow Regulator", "Throttle Valve", "Flux Stabilizer", "Pressure Control", "Quality Seals", "Delayed Venting", "Leaky Valve", "Vacuum Seal", "Reserve Tank"] },
    { label: "Bonus", names: ["All or Nothing", "Kickstart", "New Formula: Beta", "New Formula: Gamma"] },
    { label: "Fire", names: ["Microwave Coils", "New Model", "Afterburner", "Flint and Steel", "Fire with Fire", "Firestarter"] },
    { label: "Gear", names: ["Modular Plates"] },
    { label: "Hostile", names: ["Draining Presence", "Achilles' Heal", "Thousand Cuts"] }
  ];

  function modSlug(name) {
    return String(name || "")
      .toLowerCase()
      .replace(/['’]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  var MOD_ICON_FILES = {
    "fiery-aura": 1, "vicarious-combustion": 1, "signed-shield-delivered": 1,
    "flow-regulator": 1, "throttle-valve": 1, "flux-stabilizer": 1, "pressure-control": 1,
    "quality-seals": 1, "delayed-venting": 1, "leaky-valve": 1, "vacuum-seal": 1, "reserve-tank": 1,
    "all-or-nothing": 1, "kickstart": 1, "new-formula-beta": 1, "new-formula-gamma": 1,
    "microwave-coils": 1, "new-model": 1, "afterburner": 1, "flint-and-steel": 1,
    "fire-with-fire": 1, "firestarter": 1, "modular-plates": 1,
    "draining-presence": 1, "achilles-heal": 1, "thousand-cuts": 1
  };

  function categoryIcon(name, group) {
    var n = (String(group || "") + " " + String(name || "")).toLowerCase();
    if (/fire|burn|flint|microwave|afterburn|model/.test(n)) {
      return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3s4 4.2 4 8a4 4 0 0 1-8 0c0-3.8 4-8 4-8z" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>';
    }
    if (/shield|signed/.test(n)) {
      return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.2 19 6v6.2c0 4.2-2.8 6.6-7 8.2-4.2-1.6-7-4-7-8.2V6z" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>';
    }
    if (/gear|plate|armor|armour/.test(n)) {
      return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 8h16v8H4zM8 8V5h8v3" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>';
    }
    if (/hostile|drain|achilles|thousand|cut/.test(n)) {
      return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4v10M8 10l4 4 4-4M6 19h12" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>';
    }
    if (/bonus|formula|kick|nothing/.test(n)) {
      return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>';
    }
    return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 4h8v16H8zM10 8h4M10 12h4M10 16h4" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>';
  }

  function modIcon(name, group) {
    var slug = modSlug(name);
    if (MOD_ICON_FILES[slug]) {
      return '<img src="assets/icons/modifiers/' + slug + '.png" alt="" width="44" height="44" decoding="async">';
    }
    return categoryIcon(name, group);
  }

  function shortLines(item) {
    if (MOD_LINES[item.name]) return MOD_LINES[item.name];
    return String(item.effect || "").split(".").map(function (part) { return part.trim(); }).filter(Boolean).slice(0, 3);
  }

  function modTile(item, group) {
    var lines = JSON.stringify(shortLines(item)).replace(/"/g, "&quot;");
    return (
      '<button type="button" class="mod-tile" aria-expanded="false" data-lines="' + lines + '">' +
      '<span class="mod-ring">' + modIcon(item.name, group) + "</span>" +
      '<span class="mod-name">' + STF.esc(item.name) + "</span></button>"
    );
  }

  function modSection(label, items) {
    if (!items.length) return "";
    return (
      '<section class="mod-section">' +
      (label ? '<h3 class="mod-label">' + STF.esc(label) + "</h3>" : "") +
      '<div class="mod-grid">' + items.map(function (item) { return modTile(item, label); }).join("") + "</div></section>"
    );
  }

  function modifiersHTML(data) {
    var byName = {};
    (data.passives || []).concat(data.hostiles || []).forEach(function (item) { byName[item.name] = item; });
    var used = {};
    var groups = MOD_GROUPS.map(function (group) {
      var items = group.names.map(function (name) { return byName[name]; }).filter(Boolean);
      items.forEach(function (item) { used[item.name] = 1; });
      return modSection(group.label, items);
    }).join("");
    var rest = (data.passives || []).filter(function (item) { return !used[item.name]; });
    var blurb = "Pressure builds as you fight and powers the season bonuses. It decays out of cover.";
    return (
      '<p class="mod-blurb">' + STF.esc(blurb) + "</p>" +
      modSection("", data.actives || []) +
      groups +
      modSection(rest.length ? "More" : "", rest)
    );
  }

  function bindModifiers(root) {
    if (!root || root.dataset.modBound) return;
    root.dataset.modBound = "1";
    var panel = document.createElement("div");
    panel.className = "mod-detail";
    panel.hidden = true;
    panel.innerHTML = '<span class="mod-notch" aria-hidden="true"></span><div class="mod-detail-body"></div>';

    function gridCols(grid) {
      var tpl = getComputedStyle(grid).gridTemplateColumns || "";
      var parts = tpl.split(" ").filter(Boolean);
      return parts.length || 1;
    }

    function place(tile) {
      var grid = tile.closest(".mod-grid");
      if (!grid) return;
      var tiles = Array.prototype.filter.call(grid.children, function (el) {
        return el.classList && el.classList.contains("mod-tile");
      });
      var index = tiles.indexOf(tile);
      if (index < 0) return;
      var cols = gridCols(grid);
      var rowEnd = Math.min(tiles.length, Math.floor(index / cols) * cols + cols);
      var anchor = tiles[rowEnd - 1];
      grid.insertBefore(panel, anchor.nextSibling);
      panel.hidden = false;
      var tileRect = tile.getBoundingClientRect();
      var panelRect = panel.getBoundingClientRect();
      var x = tileRect.left + tileRect.width / 2 - panelRect.left;
      x = Math.max(16, Math.min(Math.max(16, panelRect.width - 16), x));
      panel.style.setProperty("--notch", x + "px");
    }

    function closeAll() {
      root.querySelectorAll(".mod-tile.is-on").forEach(function (el) {
        el.classList.remove("is-on");
        el.setAttribute("aria-expanded", "false");
      });
      panel.hidden = true;
      var body = panel.querySelector(".mod-detail-body");
      if (body) body.innerHTML = "";
    }

    root.addEventListener("click", function (e) {
      var tile = e.target.closest(".mod-tile");
      if (!tile || !root.contains(tile)) return;
      var wasOpen = tile.classList.contains("is-on");
      closeAll();
      if (wasOpen) return;
      var lines = [];
      try { lines = JSON.parse(tile.getAttribute("data-lines") || "[]"); } catch (err) { lines = []; }
      panel.querySelector(".mod-detail-body").innerHTML = lines.map(function (line) {
        return "<p>" + STF.esc(line) + "</p>";
      }).join("");
      tile.classList.add("is-on");
      tile.setAttribute("aria-expanded", "true");
      place(tile);
    });

    window.addEventListener("resize", function () {
      var tile = root.querySelector(".mod-tile.is-on");
      if (!tile || panel.hidden) return;
      place(tile);
    });
  }

  function seasonRemain(endIso) {
    if (!endIso) return "";
    var end = new Date(endIso).getTime();
    if (isNaN(end)) return "";
    var ms = end - Date.now();
    if (ms <= 0) return "";
    var mins = Math.floor(ms / 60000);
    var days = Math.floor(mins / 1440);
    var hours = Math.floor((mins % 1440) / 60);
    if (days > 0) return days + "d " + hours + "h";
    var rem = mins % 60;
    if (hours > 0) return hours + "h " + rem + "m";
    return Math.max(1, rem) + "m";
  }

  if (tabs) {
    tabs.addEventListener("click", function (e) {
      var btn = e.target.closest(".subtab");
      if (!btn || btn.id === "open-weeks") return;
      var id = btn.getAttribute("data-panel");
      if (!id) return;
      tabs.querySelectorAll(".subtab").forEach(function (b) {
        if (b.getAttribute("data-panel")) {
          b.setAttribute("aria-selected", b === btn ? "true" : "false");
        }
      });
      Object.keys(panels).forEach(function (key) {
        if (panels[key]) panels[key].classList.toggle("active", key === id);
      });
    });
  }

  try {
    var loaded = await Promise.all([
      STF.fetchJSON("data/season.json"),
      STF.fetchJSON("data/manhunt.json"),
      STF.fetchJSON("data/modifiers.json"),
      STF.fetchJSON("data/journey.json").catch(function () { return { seasons: {} }; })
    ]);
    var season = loaded[0];
    var manhunt = loaded[1];
    var modifiers = loaded[2];
    var journey = loaded[3] || { seasons: {} };

    var themeText = String(season.theme || "").trim();
    if (themeEl) {
      var showTheme = themeText && themeText !== "Add the season theme here";
      themeEl.hidden = !showTheme;
      themeEl.textContent = showTheme ? themeText : "";
    }
    if (kicker) kicker.textContent = season.yearSeason || "";
    if (title) title.textContent = season.name || "Season";
    var left = seasonRemain(season.ends || season.end || "");
    if (remain) {
      remain.hidden = !left;
      remain.textContent = left;
    }

    var weeks = (manhunt.weeks || []).map(weekHTML).join("");
    var climaxText = manhunt.climax
      ? [manhunt.climax.title, manhunt.climax.task].filter(Boolean).join(" — ")
      : "";
    var climax = climaxText ? '<p class="climax-line">' + STF.esc(climaxText) + "</p>" : "";

    if (panels.manhunts) {
      panels.manhunts.innerHTML = weeks + climax;
      bindManhunt(panels.manhunts);
    }

    if (panels.journey) {
      var pack = (journey.seasons && journey.seasons[season.id]) || { missions: [] };
      panels.journey.innerHTML = journeyHTML(pack);
      bindJourney(panels.journey);
    }

    if (panels.modifiers) {
      panels.modifiers.innerHTML = modifiersHTML(modifiers);
      bindModifiers(panels.modifiers);
    }
  } catch (e) {
    if (summary) summary.textContent = "Could not load season data.";
    console.error(e);
  }
})();

function mountEventsBack() {
  var top = document.querySelector(".topbar");
  var pill = document.querySelector(".hub-pill");
  if (pill) pill.hidden = true;
  if (!top || document.getElementById("events-back")) return;
  var back = document.createElement("button");
  back.type = "button";
  back.id = "events-back";
  back.className = "upd-header-back";
  back.setAttribute("aria-label", "Back to Events");
  back.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5 8 12l7 7" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  back.addEventListener("click", function () {
    window.location.href = "events.html";
  });
  top.appendChild(back);
}
