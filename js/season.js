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
      var tasks = (mission.tasks || []).map(function (task) {
        return "<li>" + STF.esc(task) + "</li>";
      }).join("");
      var unlocks = mission.unlocks
        ? '<p class="unlocks-line">Unlocks ' + STF.esc(mission.unlocks) + "</p>"
        : "";
      return (
        '<article class="season-item journey-mission">' +
        "<h3>" + STF.esc(mission.name || ("Mission " + (index + 1))) + "</h3>" +
        unlocks +
        '<ol class="task-list">' + tasks + "</ol>" +
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

  function mapHTML(data) {
    var list = (data.altars || [])
      .map(function (altar) {
        var coords = "Menu " + (altar.menu || []).join(", ");
        if (altar.map) coords += " · map " + altar.map.join(", ");
        return (
          "<li><strong>" + STF.esc(altar.zone) + "</strong> " +
          STF.esc(altar.where) + ' <span class="coords">' + STF.esc(coords) + "</span></li>"
        );
      })
      .join("");
    return '<div id="altar-leaflet" role="region" aria-label="Washington D.C. map"></div><ol class="altar-list">' + list + "</ol>";
  }

  var altarMap = null;
  var altarBounds = null;

  function mountAltarMap(data) {
    var el = document.getElementById("altar-leaflet");
    if (!el || !window.L) return;
    if (altarMap) {
      altarMap.remove();
      altarMap = null;
    }
    altarMap = L.map(el, { scrollWheelZoom: false });
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(altarMap);
    altarBounds = [];
    (data.altars || []).forEach(function (altar) {
      if (altar.lat == null || altar.lon == null) return;
      var icon = L.divIcon({
        className: "altar-pin",
        html: "<span>" + altar.n + "</span>",
        iconSize: [28, 28],
        iconAnchor: [14, 14]
      });
      L.marker([altar.lat, altar.lon], { icon: icon, title: String(altar.n) })
        .addTo(altarMap)
        .bindPopup("<strong>" + altar.n + ". " + STF.esc(altar.zone) + "</strong><br>" + STF.esc(altar.where));
      altarBounds.push([altar.lat, altar.lon]);
    });
    if (altarBounds.length) altarMap.fitBounds(altarBounds, { padding: [28, 28] });
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
      if (id === "maps" && altarMap) {
        setTimeout(function () {
          altarMap.invalidateSize();
          if (altarBounds && altarBounds.length) altarMap.fitBounds(altarBounds, { padding: [28, 28] });
        }, 60);
      }
    });
  }

  try {
    var loaded = await Promise.all([
      STF.fetchJSON("data/season.json"),
      STF.fetchJSON("data/manhunt.json"),
      STF.fetchJSON("data/altars.json"),
      STF.fetchJSON("data/modifiers.json"),
      STF.fetchJSON("data/journey.json").catch(function () { return { seasons: {} }; })
    ]);
    var season = loaded[0];
    var manhunt = loaded[1];
    var altars = loaded[2];
    var modifiers = loaded[3];
    var journey = loaded[4] || { seasons: {} };

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
    }

    if (panels.maps) {
      if (season.mapImage) {
        panels.maps.innerHTML = imageMapHTML(season.mapImage, season.mapCaption || "");
        bindMapZoom(panels.maps);
      } else {
        panels.maps.innerHTML = mapHTML(altars);
        mountAltarMap(altars);
      }
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
