/* Resources: Builds, Maps, Hunters, and Creators. Builds is the default. */
(function () {
  STF.mountChrome("resources");

  var resBody = document.getElementById("res-detail-body");
  var mapsBody = document.getElementById("maps-body");
  var creatorsBody = document.getElementById("creators-body");
  var panels = {
    builds: document.getElementById("tab-builds"),
    maps: document.getElementById("tab-maps"),
    hunters: document.getElementById("tab-hunters"),
    creators: document.getElementById("tab-creators")
  };
  var hunterData = null;
  var REGIONS = [
    { id: "washington", label: "Washington" },
    { id: "newyork", label: "New York" },
    { id: "brooklyn", label: "Brooklyn" },
    { id: "other", label: "Other" }
  ];
  var REGION_IDS = { washington: 1, newyork: 1, brooklyn: 1, other: 1 };
  var BUILD_HASH = { solo: 1, team: 1, incursion: 1, escalation: 1, raid: 1, pvp: 1 };
  var REGION_ICONS = {
    washington: '<svg viewBox="0 0 24 24"><path d="M4 18h16M6 18V10M10 18V10M14 18V10M18 18V10M3 10h18L12 4z"/></svg>',
    newyork: '<svg viewBox="0 0 24 24"><path d="M4 20V9h4v11M10 20V5h5v15M17 20v-8h3v8M8 9V6h2"/></svg>',
    brooklyn: '<svg viewBox="0 0 24 24"><path d="M3 16h18M5 16V8M19 16V8M7 11c1.6 2.4 8.4 2.4 10 0"/></svg>',
    other: '<svg viewBox="0 0 24 24"><path d="M12 4 20 12 12 20 4 12z"/></svg>'
  };
  var YT_MARK =
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#FF0033" d="M23 12.2s0-3.2-.4-4.6c-.2-.9-.9-1.6-1.8-1.8C19.2 5.4 12 5.4 12 5.4s-7.2 0-8.8.4c-.9.2-1.6.9-1.8 1.8C1 9 1 12.2 1 12.2s0 3.2.4 4.6c.2.9.9 1.6 1.8 1.8 1.6.4 8.8.4 8.8.4s7.2 0 8.8-.4c.9-.2 1.6-.9 1.8-1.8.4-1.4.4-4.6.4-4.6z"/><path fill="#fff" d="m9.8 15.5 6.2-3.3-6.2-3.3z"/></svg>';
  var TWITCH_MARK =
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#9146FF" d="M4.5 3h16v11.2L16.2 18H12l-2.2 2.2H8.2V18H4.5V3z"/><path fill="#fff" d="M15 7.2h-1.6v5.2H15V7.2zm-4.2 0H9.2v5.2h1.6V7.2z"/></svg>';

  function pad2(n) {
    return (n < 10 ? "0" : "") + n;
  }

  function hunterRegion(hunter) {
    var area = String((hunter && hunter.area) || "").toLowerCase();
    if (area.indexOf("washington") >= 0 || area.indexOf("d.c") >= 0) return "washington";
    if (area.indexOf("brooklyn") >= 0 || area.indexOf("dumbo") >= 0 || area.indexOf("furman") >= 0) return "brooklyn";
    if (area.indexOf("new york") >= 0) return "newyork";
    if (!hunter) return "other";
    if (hunter.group === "dc") return "washington";
    if (hunter.group === "brooklyn") return "brooklyn";
    if (hunter.group === "ny") return "newyork";
    return "other";
  }

  function regionLabel(id) {
    for (var i = 0; i < REGIONS.length; i++) if (REGIONS[i].id === id) return REGIONS[i].label;
    return "Other";
  }

  function findHunter(id) {
    var rows = (hunterData && hunterData.hunters) || [];
    for (var i = 0; i < rows.length; i++) if (rows[i].id === id) return rows[i];
    return null;
  }

  function setHunterBack(mode, regionId) {
    var top = document.querySelector(".topbar");
    var back = document.getElementById("hunter-back");
    if (mode === "off") {
      if (back) back.remove();
      return;
    }
    if (!top) return;
    if (!back) {
      back = document.createElement("button");
      back.type = "button";
      back.id = "hunter-back";
      back.className = "upd-header-back";
      back.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5 8 12l7 7" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
      top.appendChild(back);
    }
    if (mode === "detail") {
      back.setAttribute("aria-label", "Back to " + regionLabel(regionId));
      back.onclick = function () {
        history.pushState({ res: "hunters", region: regionId }, "", "resources.html?tab=hunters#" + regionId);
        showHunterRegion(regionId, false);
      };
      return;
    }
    back.setAttribute("aria-label", "Back to hunters");
    back.onclick = function () {
      history.pushState({ res: "hunters" }, "", "resources.html?tab=hunters");
      showHunterHome(false);
    };
  }

  function showHunterHome(push) {
    if (!hunterData || !resBody) return;
    document.body.classList.add("is-hunter-home");
    document.body.classList.remove("is-hunter", "is-grid", "is-list");
    setHunterBack("off");
    var counts = { washington: 0, newyork: 0, brooklyn: 0, other: 0 };
    (hunterData.hunters || []).forEach(function (hunter) {
      counts[hunterRegion(hunter)] += 1;
    });
    resBody.innerHTML =
      '<div class="hunter-grid">' +
      REGIONS.map(function (region) {
        return (
          '<button type="button" class="cat-tile col-tile" data-region="' + region.id + '">' +
          '<span class="col-title">' + STF.esc(region.label) + "</span>" +
          '<span class="col-ring">' + REGION_ICONS[region.id] + "</span>" +
          '<span class="col-count">' + pad2(counts[region.id] || 0) + "</span>" +
          "</button>"
        );
      }).join("") +
      "</div>";
    window.scrollTo(0, 0);
    if (push) history.pushState({ res: "hunters" }, "", "resources.html?tab=hunters");
  }

  function maskRow(hunter, region) {
    var art = hunter.image
      ? '<img class="hunter-mask-zoom" src="' + STF.esc(hunter.image) + '" alt="">'
      : '<span class="hunter-mask-fallback" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M4.5 11c1.2-4.6 13.8-4.6 15 0v4.2c-1.3 4-13.7 4-15 0z" fill="none" stroke="currentColor" stroke-width="1.4"/><path d="M8 12.4h2.4M13.6 12.4H16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="square"/></svg></span>';
    return (
      '<button type="button" class="hunter-mask-row" data-hunter="' + STF.esc(hunter.id) + '" data-region="' + region + '" aria-label="' + STF.esc(hunter.name) + '">' +
      art +
      "</button>"
    );
  }

  function showHunterRegion(regionId, push) {
    if (!hunterData || !resBody) return;
    if (!REGION_IDS[regionId]) regionId = "other";
    document.body.classList.remove("is-hunter-home", "is-grid", "is-list");
    document.body.classList.add("is-hunter");
    setHunterBack("region", regionId);
    var rows = (hunterData.hunters || []).filter(function (hunter) { return hunterRegion(hunter) === regionId; });
    resBody.innerHTML =
      '<h1 class="hunter-region">' + STF.esc(regionLabel(regionId)) + "</h1>" +
      (rows.length
        ? rows.map(function (hunter) { return maskRow(hunter, regionId); }).join("")
        : '<p class="lede">No hunters in this area.</p>') +
      '<p class="hunter-credit">Mask images: <a href="' + STF.esc(hunterData.imageCreditUrl || "https://thedivision.fandom.com/wiki/Hunters") + '" target="_blank" rel="noopener">The Division Wiki (Fandom)</a></p>';
    window.scrollTo(0, 0);
    if (push) history.pushState({ res: "hunters", region: regionId }, "", "resources.html?tab=hunters#" + regionId);
  }

  function youtubeBlock(hunter) {
    var url = String((hunter && hunter.youtube) || "").trim();
    if (!url) return "";
    return (
      '<a class="hunter-yt" href="' + STF.esc(url) + '" target="_blank" rel="noopener">' +
      "<span>YouTube guide</span>" +
      YT_MARK +
      "</a>"
    );
  }

  function showHunterDetail(id, regionId, push) {
    var hunter = findHunter(id);
    if (!hunter) return showHunterHome(false);
    if (!regionId || !REGION_IDS[regionId]) regionId = hunterRegion(hunter);
    document.body.classList.remove("is-hunter-home", "is-grid", "is-list");
    document.body.classList.add("is-hunter");
    setHunterBack("detail", regionId);
    var hero = hunter.image
      ? '<img class="hunter-hero" src="' + STF.esc(hunter.image) + '" alt="">'
      : '<span class="hunter-hero hunter-fallback" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M5 10c1.4-4 12.6-4 14 0v5c-1.5 4-12.5 4-14 0z" fill="none" stroke="currentColor" stroke-width="1.6"/></svg></span>';
    var steps = (hunter.steps || []).map(function (step) { return "<li>" + STF.esc(step) + "</li>"; }).join("");
    var tips = (hunter.tips || []).map(function (tip) { return "<li>" + STF.esc(tip) + "</li>"; }).join("");
    var sources = (hunter.sources || []).map(function (src) {
      return '<a href="' + STF.esc(src.url) + '" target="_blank" rel="noopener">' + STF.esc(src.name) + "</a>" +
        (src.date ? " · " + STF.esc(src.date) : "");
    }).join("<br>");
    resBody.innerHTML =
      hero +
      "<h1>" + STF.esc(hunter.name) + "</h1>" +
      (hunter.mask ? '<p class="lede">Mask: ' + STF.esc(hunter.mask) + "</p>" : "") +
      '<p class="hunter-area">' + STF.esc(hunter.area || "") + "</p>" +
      (hunter.subtitle ? '<p class="lede">' + STF.esc(hunter.subtitle) + "</p>" : "") +
      (hunter.limited ? '<p class="hunter-tag">limited/may be unavailable</p>' : "") +
      (steps ? "<h2>Unlock</h2><ol class=\"hunter-steps\">" + steps + "</ol>" : "") +
      (tips ? "<h2>Kill tips</h2><ul class=\"hunter-tips\">" + tips + "</ul>" : "") +
      (hunter.time ? "<h2>Time</h2><p>" + STF.esc(hunter.time) + "</p>" : "") +
      (hunter.notes ? "<h2>Notes</h2><p>" + STF.esc(hunter.notes) + "</p>" : "") +
      (hunter.headsUp ? '<p class="hunter-headsup"><strong>Heads up</strong> ' + STF.esc(hunter.headsUp) + "</p>" : "") +
      (sources ? '<p class="hunter-sources">' + sources + "</p>" : "") +
      '<p class="hunter-credit">Mask images: <a href="https://thedivision.fandom.com/wiki/Hunters" target="_blank" rel="noopener">The Division Wiki (Fandom)</a></p>' +
      youtubeBlock(hunter);
    window.scrollTo(0, 0);
    if (push) history.pushState({ res: "hunters", region: regionId, hunter: id }, "", "resources.html?tab=hunters#" + regionId + "/" + id);
  }

  function hunterRoute() {
    var hash = (location.hash || "").replace("#", "");
    if (!hash || hash === "hunters") return showHunterHome(false);
    var parts = hash.split("/");
    if (REGION_IDS[parts[0]] && parts[1]) return showHunterDetail(parts[1], parts[0], false);
    if (REGION_IDS[hash]) return showHunterRegion(hash, false);
    if (findHunter(hash)) return showHunterDetail(hash, hunterRegion(findHunter(hash)), false);
    showHunterHome(false);
  }

  function ensureHunters(done) {
    if (hunterData) return done();
    STF.fetchJSON("data/hunters.json").then(function (data) {
      hunterData = data;
      done();
    }).catch(function () {
      if (resBody) resBody.innerHTML = '<p class="lede">Could not load hunter guides.</p>';
    });
  }

  function renderMaps(doc) {
    var groups = (doc && doc.groups) || [];
    var html = groups.map(function (group) {
      var links = (group.links || []).map(function (link) {
        var meta = STF.esc(link.source || "");
        if (link.updated) meta += (meta ? " · " : "") + "updated " + STF.esc(link.updated);
        return (
          '<a class="map-link" href="' + STF.esc(link.url) + '" target="_blank" rel="noopener">' +
          "<strong>" + STF.esc(link.title) + "</strong>" +
          '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 6h10v10"/><path d="M18 6 6 18"/></svg>' +
          "<span>" + STF.esc(link.description || "") + "</span>" +
          (meta ? "<small>" + meta + "</small>" : "") +
          "</a>"
        );
      }).join("");
      var heading = group.title ? '<h2 class="map-sec">' + STF.esc(group.title) + "</h2>" : "";
      return heading + links;
    }).join("");
    mapsBody.innerHTML = html || '<p class="lede">No map links yet.</p>';
  }

  function loadMaps() {
    if (mapsBody.dataset.ready) return;
    STF.fetchJSON("data/maps.json").then(function (doc) {
      mapsBody.dataset.ready = "1";
      renderMaps(doc);
    }).catch(function () {
      mapsBody.innerHTML = '<p class="lede">Could not load maps.</p>';
    });
  }

  function platformMark(platform) {
    if (platform === "twitch") return TWITCH_MARK;
    if (platform === "youtube") return YT_MARK;
    return "";
  }

  function renderCreators(doc) {
    var rows = Array.isArray(doc) ? doc : ((doc && doc.creators) || []);
    if (!rows.length) {
      creatorsBody.innerHTML = '<p class="lede">No creators yet.</p>';
      return;
    }
    creatorsBody.innerHTML = rows.map(function (row) {
      var platform = String(row.platform || "").toLowerCase();
      var mark = platformMark(platform);
      var logo = mark ? '<span class="creator-logo" aria-hidden="true">' + mark + "</span>" : "";
      return (
        '<a class="creator-row" href="' + STF.esc(row.url || "#") + '" target="_blank" rel="noopener">' +
        "<strong>" + STF.esc(row.name || "Creator") + "</strong>" +
        logo +
        "</a>"
      );
    }).join("");
  }

  function loadCreators() {
    if (!creatorsBody || creatorsBody.dataset.ready) return;
    STF.fetchJSON("data/creators.json").then(function (doc) {
      creatorsBody.dataset.ready = "1";
      renderCreators(doc);
    }).catch(function () {
      creatorsBody.innerHTML = '<p class="lede">Could not load creators.</p>';
    });
  }

  function tabFromLocation() {
    var query = new URLSearchParams(location.search).get("tab");
    var hash = (location.hash || "").replace("#", "");
    if (hash === "hunters" || hash.indexOf("hunters/") === 0) return "hunters";
    if (query === "maps" || query === "hunters" || query === "builds" || query === "creators") return query;
    return "builds";
  }

  function showTab(tab, push) {
    if (tab !== "builds" && tab !== "maps" && tab !== "hunters" && tab !== "creators") tab = "builds";
    Object.keys(panels).forEach(function (key) {
      if (panels[key]) panels[key].hidden = key !== tab;
    });
    document.querySelectorAll(".res-tabs [data-tab]").forEach(function (btn) {
      btn.setAttribute("aria-selected", btn.getAttribute("data-tab") === tab ? "true" : "false");
    });
    if (tab !== "builds") {
      document.body.classList.remove("is-grid");
      document.body.classList.remove("is-list");
    }
    if (tab !== "hunters") {
      document.body.classList.remove("is-hunter");
      document.body.classList.remove("is-hunter-home");
      setHunterBack("off");
    }
    if (tab === "maps") loadMaps();
    if (tab === "creators") loadCreators();
    if (tab === "hunters") ensureHunters(hunterRoute);
    if (tab === "builds") window.dispatchEvent(new CustomEvent("stf-tab", { detail: "builds" }));
    if (push) {
      var next = "resources.html?tab=" + tab;
      if (tab === "hunters" && location.hash && !BUILD_HASH[(location.hash || "").replace("#", "").split("/")[0]]) next += location.hash;
      if (tab === "builds" && location.hash && BUILD_HASH[(location.hash || "").replace("#", "").split("/")[0]]) next += location.hash;
      history.pushState({ tab: tab }, "", next);
    }
    window.scrollTo(0, 0);
  }

  document.querySelector(".res-tabs").addEventListener("click", function (e) {
    var btn = e.target.closest("[data-tab]");
    if (!btn) return;
    var tab = btn.getAttribute("data-tab");
    var root = (location.hash || "").replace("#", "").split("/")[0];
    if (tab !== "hunters" && location.hash) {
      history.replaceState({}, "", "resources.html?tab=" + tab);
    } else if (tab === "hunters" && BUILD_HASH[root]) {
      history.replaceState({}, "", "resources.html?tab=hunters");
    }
    showTab(tab, true);
  });

  if (resBody) {
    resBody.addEventListener("click", function (e) {
      var hunterBtn = e.target.closest("[data-hunter]");
      if (hunterBtn) {
        ensureHunters(function () {
          showHunterDetail(hunterBtn.getAttribute("data-hunter"), hunterBtn.getAttribute("data-region"), true);
        });
        return;
      }
      var regionBtn = e.target.closest("[data-region]");
      if (!regionBtn) return;
      ensureHunters(function () { showHunterRegion(regionBtn.getAttribute("data-region"), true); });
    });
  }
  window.addEventListener("popstate", function () {
    showTab(tabFromLocation(), false);
  });

  showTab(tabFromLocation(), false);
})();
