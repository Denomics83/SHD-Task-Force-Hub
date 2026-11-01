/* Season detail opened from the Events season card. */
(async function () {
  STF.mountChrome("");
  mountEventsBack();

  var title = document.getElementById("season-title");
  var summary = document.getElementById("season-summary");
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

  var SCOUT_ICO = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="7.6" cy="14" r="3.1" fill="none" stroke="currentColor" stroke-width="1.6"/><circle cx="16.4" cy="14" r="3.1" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M10.7 14h2.6M7.6 10.9V8.2M16.4 10.9V8.2M5.4 8.2h4.4M14.2 8.2h4.4" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>';
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
      '<span class="mh-logo" aria-hidden="true">' + icon + "</span>" +
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
    var panels = missions.map(function (mission, index) {
      var realName = isBlankCopy(mission.name) ? "" : String(mission.name).trim();
      var tasks = (mission.tasks || []).map(taskParts).filter(Boolean);
      var required = requiredLine(mission);
      var body = tasks.length
        ? tasks.map(function (task, t) {
          var count = task.count ? '<b>' + STF.esc(task.count) + "</b>" : "";
          return (
            '<button type="button" class="jy-task' + (t === 0 ? " is-on" : "") + '" aria-pressed="' + (t === 0 ? "true" : "false") + '">' +
            count + "<span>" + STF.esc(task.text) + "</span></button>"
          );
        }).join("")
        : '<p class="jy-empty">Tasks not confirmed yet</p>';
      return (
        '<section class="jy-mission' + (index === 0 ? " is-on" : "") + '" id="jy-mission-' + index + '" role="tabpanel"' + (index === 0 ? "" : " hidden") + ">" +
        '<header class="jy-head"><h2>Journey Mission ' + (index + 1) + "</h2>" +
        (realName ? '<p class="jy-name">' + STF.esc(realName) + "</p>" : "") +
        (required ? '<p class="jy-req">' + STF.esc(required) + "</p>" : "") +
        "</header>" + body + "</section>"
      );
    }).join("");
    return (
      '<div class="jy-board">' +
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
        return;
      }
      var row = e.target.closest(".jy-task");
      if (!row || !root.contains(row)) return;
      var mission = row.closest(".jy-mission");
      if (!mission) return;
      mission.querySelectorAll(".jy-task").forEach(function (el) {
        var on = el === row;
        el.classList.toggle("is-on", on);
        el.setAttribute("aria-pressed", on ? "true" : "false");
      });
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

  function modifierCard(item) {
    return (
      '<article class="season-item"><h3>' + STF.esc(item.name) + "</h3><p>" +
      STF.esc(item.effect) + "</p></article>"
    );
  }

  function modifiersHTML(data) {
    var actives = (data.actives || []).map(modifierCard).join("");
    var hostiles = (data.hostiles || []).map(modifierCard).join("");
    var passives = (data.passives || []).map(modifierCard).join("");
    return (
      '<article class="season-item"><span class="status">Global</span><h3>' +
      STF.esc(data.global.name) + "</h3><p>" + STF.esc(data.global.effect) + "</p></article>" +
      '<h3 class="mod-label">Active</h3><p class="lede">' + STF.esc(data.activeNote || "") + "</p>" +
      actives +
      '<h3 class="mod-label">Hostile</h3>' + hostiles +
      '<h3 class="mod-label">Passive</h3>' +
      '<p class="caveat">Passive numbers are from the 13 Aug 2026 PTS notes. Ubisoft’s live season article names the system but does not reprint every passive. Exact live values can differ.</p>' +
      passives
    );
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
    if (title) title.textContent = (season.yearSeason || "") + " — " + (season.name || "Season");
    if (summary) {
      summary.textContent =
        (season.summary || "") +
        (season.patch ? " · Patch: " + season.patch : "");
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

    if (panels.modifiers) panels.modifiers.innerHTML = modifiersHTML(modifiers);
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
