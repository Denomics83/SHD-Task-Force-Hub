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

  function weekHTML(week) {
    var tasks = (week.tasks || []).slice(0, 3)
      .map(function (task) { return "<li>" + STF.esc(task) + "</li>"; })
      .join("");
    var title = "Week " + week.week + (week.scout ? " · " + week.scout : "");
    if (week.label) title += " · " + week.label;
    return (
      '<article class="season-item"><h3>' + STF.esc(title) + "</h3>" +
      '<ul class="task-list">' + tasks + "</ul></article>"
    );
  }

  function journeyHTML(pack) {
    var missions = (pack && pack.missions) || [];
    if (!missions.length) return '<p class="lede">No journey missions for this season.</p>';
    return missions.map(function (mission, index) {
      var tasks = mission.tasks || [];
      var taskHtml = tasks.map(function (task) {
        return "<li>" + STF.esc(task) + "</li>";
      }).join("");
      var countLabel = tasks.length === 1 ? "1 task" : tasks.length + " tasks";
      var unlocks = mission.unlocks
        ? '<p class="unlocks-line">Unlocks ' + STF.esc(mission.unlocks) + "</p>"
        : "";
      var name = mission.name || ("Mission " + (index + 1));
      var panelId = "journey-panel-" + index;
      return (
        '<article class="journey-mission">' +
        '<button type="button" class="journey-bar" aria-expanded="false" aria-controls="' + panelId + '">' +
        '<span class="journey-name">' + STF.esc(name) + "</span>" +
        '<span class="journey-count">' + countLabel + "</span>" +
        '<svg class="journey-chevron" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
        "</button>" +
        '<div class="journey-panel" id="' + panelId + '" role="region">' +
        '<div class="journey-panel-inner">' +
        unlocks +
        '<ol class="task-list">' + taskHtml + "</ol>" +
        "</div></div></article>"
      );
    }).join("");
  }

  function bindJourney(root) {
    if (!root || root.dataset.journeyBound) return;
    root.dataset.journeyBound = "1";
    root.addEventListener("click", function (e) {
      var btn = e.target.closest(".journey-bar");
      if (!btn || !root.contains(btn)) return;
      var panel = document.getElementById(btn.getAttribute("aria-controls"));
      if (!panel) return;
      var open = btn.getAttribute("aria-expanded") !== "true";
      btn.setAttribute("aria-expanded", open ? "true" : "false");
      panel.classList.toggle("is-open", open);
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
    var sources = (data.sources || [])
      .map(function (src) { return sourceLine(src.name + " — " + src.covers, src.url); })
      .join("");
    return (
      '<article class="season-item"><span class="status">Global</span><h3>' +
      STF.esc(data.global.name) + "</h3><p>" + STF.esc(data.global.effect) + "</p></article>" +
      '<h3 class="mod-label">Active</h3><p class="lede">' + STF.esc(data.activeNote || "") + "</p>" +
      actives +
      '<h3 class="mod-label">Hostile</h3>' + hostiles +
      '<h3 class="mod-label">Passive</h3>' +
      '<p class="caveat">Passive numbers are from the 13 Aug 2026 PTS notes. Ubisoft’s live season article names the system but does not reprint every passive. Exact live values can differ.</p>' +
      passives +
      sources
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

    if (panels.manhunts) panels.manhunts.innerHTML = weeks + climax;

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
