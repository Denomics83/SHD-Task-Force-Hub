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
    maps: document.getElementById("panel-maps"),
    modifiers: document.getElementById("panel-modifiers"),
    global: document.getElementById("panel-global")
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
    var flag = week.confirmed === "october-guide"
      ? "Checked Oct 2026"
      : week.confirmed === "may-have-changed"
        ? "May have changed"
        : week.confirmed === "launch-compilation"
          ? "Launch list"
          : "";
    var tasks = (week.tasks || [])
      .map(function (task) { return "<li>" + STF.esc(task) + "</li>"; })
      .join("");
    return (
      '<article class="season-item">' +
      (flag ? '<span class="status">' + STF.esc(flag) + "</span>" : "") +
      "<h3>Week " + STF.esc(week.week) + " · " + STF.esc(week.scout) +
      (week.label ? " · " + STF.esc(week.label) : "") +
      (week.date ? " · " + STF.esc(STF.formatDate(week.date)) : "") + "</h3>" +
      "<ul class=\"task-list\">" + tasks + "</ul>" +
      (week.caveat ? '<p class="caveat">' + STF.esc(week.caveat) + "</p>" : "") +
      (week.source ? sourceLine(week.sourceName, week.source) : "") +
      "</article>"
    );
  }

  function journeyHTML(pack) {
    var missions = (pack && pack.missions) || [];
    if (!missions.length) return '<p class="lede">No journey missions for this season.</p>';
    return missions.map(function (mission, index) {
      var tasks = (mission.tasks || []).map(function (task) {
        return "<li>" + STF.esc(task) + "</li>";
      }).join("");
      var unlocks = mission.unlocks
        ? '<p class="unlocks-line">Unlocks ' + STF.esc(mission.unlocks) + "</p>"
        : "";
      return (
        '<article class="season-item journey-mission">' +
        '<button type="button" class="journey-toggle" aria-expanded="false">' +
        "<h3>" + STF.esc(mission.name || ("Mission " + (index + 1))) + "</h3>" +
        unlocks +
        "</button>" +
        '<ol class="task-list" hidden>' + tasks + "</ol>" +
        "</article>"
      );
    }).join("");
  }

  function bindJourney(root) {
    if (!root) return;
    root.addEventListener("click", function (e) {
      var btn = e.target.closest(".journey-toggle");
      if (!btn || !root.contains(btn)) return;
      var list = btn.parentElement.querySelector(".task-list");
      if (!list) return;
      var open = list.hidden;
      list.hidden = !open;
      btn.setAttribute("aria-expanded", open ? "true" : "false");
    });
  }

  function imageMapHTML(src, caption) {
    return (
      '<button type="button" class="map-shot" data-map="' + STF.esc(src) + '" data-caption="' + STF.esc(caption || "") + '">' +
      '<img src="' + STF.esc(src) + '" alt="Season map">' +
      "</button>" +
      (caption ? '<p class="lede map-note">' + STF.esc(caption) + "</p>" : "") +
      '<p class="lede map-note">Tap the map to open it full screen. Pinch to zoom.</p>'
    );
  }

  function bindMapZoom(root) {
    if (!root) return;
    root.addEventListener("click", function (e) {
      var btn = e.target.closest("[data-map]");
      if (!btn || !root.contains(btn)) return;
      STF.openMap(btn.getAttribute("data-map"), btn.getAttribute("data-caption") || "");
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

  function plot(menu) {
    var minX = -1800;
    var maxX = 2200;
    var minY = -1700;
    var maxY = 700;
    var x = ((menu[0] - minX) / (maxX - minX)) * 1000;
    var y = ((maxY - menu[1]) / (maxY - minY)) * 720;
    return [x, y];
  }

  function mapHTML(data) {
    var markers = (data.altars || [])
      .map(function (altar) {
        var p = plot(altar.menu);
        return (
          '<g class="altar-mark">' +
          '<circle cx="' + p[0].toFixed(1) + '" cy="' + p[1].toFixed(1) + '" r="16"></circle>' +
          '<text x="' + p[0].toFixed(1) + '" y="' + (p[1] + 5).toFixed(1) + '">' + altar.n + "</text>" +
          "</g>"
        );
      })
      .join("");
    var list = (data.altars || [])
      .map(function (altar) {
        var coords = "Menu " + altar.menu.join(", ");
        if (altar.map) coords += " · map " + altar.map.join(", ");
        else coords += " · controller map pair not in this guide";
        return (
          "<li><strong>" + altar.n + ". " + STF.esc(altar.zone) + "</strong> " +
          STF.esc(altar.where) + ' <span class="coords">' + STF.esc(coords) + "</span></li>"
        );
      })
      .join("");
    return (
      '<p class="lede map-note">' + STF.esc(data.note || "") + "</p>" +
      '<div class="altar-map" role="img" aria-label="Stylised Washington D.C. plot of 20 Red Moon altars">' +
      '<svg viewBox="0 0 1000 720">' +
      '<rect class="map-bg" x="0" y="0" width="1000" height="720" rx="16"></rect>' +
      '<text class="map-zone" x="80" y="150">West End</text>' +
      '<text class="map-zone" x="180" y="280">Downtown West</text>' +
      '<text class="map-zone" x="430" y="300">White House</text>' +
      '<text class="map-zone" x="620" y="250">Downtown East</text>' +
      '<text class="map-zone" x="700" y="360">Judiciary</text>' +
      '<text class="map-zone" x="560" y="460">Federal Triangle</text>' +
      '<text class="map-zone" x="700" y="560">East Mall</text>' +
      '<text class="map-zone" x="220" y="520">West Potomac</text>' +
      '<text class="map-zone" x="160" y="400">Foggy Bottom</text>' +
      markers +
      "</svg></div>" +
      '<ol class="altar-list">' + list + "</ol>" +
      sourceLine(data.sourceName, data.source)
    );
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
      STF.fetchJSON("data/altars.json"),
      STF.fetchJSON("data/modifiers.json"),
      STF.fetchJSON("data/journey.json").catch(function () { return { seasons: {} }; }),
      STF.fetchJSON("data/global-modifiers.json").catch(function () { return { seasons: {} }; })
    ]);
    var season = loaded[0];
    var manhunt = loaded[1];
    var altars = loaded[2];
    var modifiers = loaded[3];
    var journey = loaded[4] || { seasons: {} };
    var globalMods = loaded[5] || { seasons: {} };

    if (themeEl) themeEl.textContent = season.theme || "Add the season theme here";
    if (title) title.textContent = (season.yearSeason || "") + " — " + (season.name || "Season");
    if (summary) {
      summary.textContent =
        (season.summary || "") +
        (season.patch ? " · Patch: " + season.patch : "");
    }

    var weeks = (manhunt.weeks || []).map(weekHTML).join("");
    var climax = manhunt.climax
      ? '<article class="season-item"><h3>' + STF.esc(manhunt.climax.title) + "</h3><p>" +
        STF.esc(manhunt.climax.task) + "</p>" +
        (manhunt.climax.source ? sourceLine(manhunt.climax.sourceName, manhunt.climax.source) : "") + "</article>"
      : "";

    if (panels.manhunts) {
      panels.manhunts.innerHTML =
        renderCards(season.manhunts) +
        '<button type="button" class="subtab manhunt-open" id="open-weeks" aria-expanded="false">Manhunt</button>' +
        '<div id="manhunt-weeks" hidden>' +
        '<p class="lede">' + STF.esc(manhunt.note || "") + "</p>" +
        weeks + climax +
        "</div>";
      var openBtn = document.getElementById("open-weeks");
      var weekBox = document.getElementById("manhunt-weeks");
      if (openBtn && weekBox) {
        openBtn.addEventListener("click", function () {
          var open = weekBox.hidden;
          weekBox.hidden = !open;
          openBtn.setAttribute("aria-expanded", open ? "true" : "false");
        });
      }
    }

    if (panels.journey) {
      var pack = (journey.seasons && journey.seasons[season.id]) || { missions: [] };
      panels.journey.innerHTML = journeyHTML(pack);
      bindJourney(panels.journey);
    }

    if (panels.maps) {
      if (season.mapImage) {
        panels.maps.innerHTML = imageMapHTML(season.mapImage, season.mapCaption || "");
        bindMapZoom(panels.maps);
      } else {
        panels.maps.innerHTML = mapHTML(altars);
      }
    }
    if (panels.modifiers) panels.modifiers.innerHTML = modifiersHTML(modifiers);
    if (panels.global) {
      var seasonMods = (globalMods.seasons && globalMods.seasons[season.id] && globalMods.seasons[season.id].modifiers) || [];
      panels.global.innerHTML = globalHTML(seasonMods);
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
