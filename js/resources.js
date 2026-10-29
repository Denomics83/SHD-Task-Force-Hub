/* Resources landing. Maps, Hunter Guides, and Creators open a short detail. Events opens admin. */
(function () {
  STF.mountChrome("resources");

  var landing = document.getElementById("res-landing");
  var resDetail = document.getElementById("res-detail");
  var resBody = document.getElementById("res-detail-body");
  var resBack = document.getElementById("res-back");
  var RES = {
    maps: {
      title: "Maps",
      html:
        "<p>SHD Tech caches and open-world markers.</p>" +
        '<p><a href="https://division2map.com/" target="_blank" rel="noopener">division2map.com</a></p>' +
        '<p class="muted">Hide all, then enable SHD Tech.</p>'
    },
    hunters: { title: "Hunter Guides", html: "" },
    manhunts: {
      title: "Manhunts",
      html:
        "<p>Current season manhunt, maps, and modifiers.</p>" +
        '<p><a href="season.html">Open Red Horizon season</a></p>'
    },
    creators: {
      title: "Creators",
      html: "<p>Creator links are not seeded yet.</p>"
    }
  };

  var hunterData = null;

  function showLanding() {
    if (landing) landing.hidden = false;
    if (resDetail) resDetail.hidden = true;
    if (resBack) resBack.hidden = true;
    document.body.classList.remove("is-hunter");
    setHunterBack("off");
  }

  function setHunterBack(mode) {
    var top = document.querySelector(".topbar");
    var pill = document.querySelector(".hub-pill");
    var back = document.getElementById("hunter-back");
    if (pill) pill.hidden = mode !== "off";
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
      back.setAttribute("aria-label", "Back to Hunter Guides");
      back.onclick = function () {
        history.pushState({ res: "hunters" }, "", "#hunters");
        showHunterList(false);
      };
      return;
    }
    back.setAttribute("aria-label", "Back to Resources");
    back.onclick = function () {
      history.pushState({ res: null }, "", "resources.html");
      showLanding();
    };
  }

  function maskHTML(hunter, big) {
    if (hunter.image) {
      return '<img class="' + (big ? "hunter-hero" : "hunter-mask") + '" src="' + STF.esc(hunter.image) + '" alt="">';
    }
    return '<span class="' + (big ? "hunter-hero hunter-fallback" : "hunter-mask hunter-fallback") + '" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M5 10c1.4-4 12.6-4 14 0v5c-1.5 4-12.5 4-14 0z" fill="none" stroke="currentColor" stroke-width="1.6"/></svg></span>';
  }

  function showHunterList(push) {
    if (!hunterData || !resBody) return;
    if (landing) landing.hidden = true;
    if (resDetail) resDetail.hidden = false;
    if (resBack) resBack.hidden = true;
    document.body.classList.add("is-hunter");
    setHunterBack("list");
    var byGroup = {};
    (hunterData.hunters || []).forEach(function (hunter) {
      if (!byGroup[hunter.group]) byGroup[hunter.group] = [];
      byGroup[hunter.group].push(hunter);
    });
    var html = "<h1>Hunter Guides</h1>";
    (hunterData.groups || []).forEach(function (group) {
      var rows = byGroup[group.id] || [];
      html += '<h2 class="hunter-sec">' + STF.esc(group.title) + ' <span>' + rows.length + "</span></h2>";
      if (group.note) html += '<p class="lede hunter-note">' + STF.esc(group.note) + "</p>";
      html += rows.map(function (hunter) {
        var extra = hunter.mask ? " <em>" + STF.esc(hunter.mask) + "</em>" : "";
        var sub = hunter.subtitle ? '<small>' + STF.esc(hunter.subtitle) + "</small>" : "";
        var tag = hunter.limited ? '<b class="hunter-tag">limited/may be unavailable</b>' : "";
        return (
          '<button type="button" class="hunter-row" data-hunter="' + STF.esc(hunter.id) + '">' +
          maskHTML(hunter, false) +
          "<span><strong>" + STF.esc(hunter.name) + "</strong>" + extra + sub + tag + "</span>" +
          "</button>"
        );
      }).join("");
    });
    html += '<p class="hunter-credit">Mask images: <a href="' + STF.esc(hunterData.imageCreditUrl || "https://thedivision.fandom.com/wiki/Hunters") + '" target="_blank" rel="noopener">The Division Wiki (Fandom)</a></p>';
    resBody.innerHTML = html;
    window.scrollTo(0, 0);
    if (push) history.pushState({ res: "hunters" }, "", "#hunters");
  }

  function showHunterDetail(id, push) {
    var hunter = (hunterData.hunters || []).filter(function (row) { return row.id === id; })[0];
    if (!hunter) return showHunterList(false);
    if (landing) landing.hidden = true;
    if (resDetail) resDetail.hidden = false;
    if (resBack) resBack.hidden = true;
    document.body.classList.add("is-hunter");
    setHunterBack("detail");
    var steps = (hunter.steps || []).map(function (step) { return "<li>" + STF.esc(step) + "</li>"; }).join("");
    var tips = (hunter.tips || []).map(function (tip) { return "<li>" + STF.esc(tip) + "</li>"; }).join("");
    var sources = (hunter.sources || []).map(function (src) {
      return '<a href="' + STF.esc(src.url) + '" target="_blank" rel="noopener">' + STF.esc(src.name) + "</a>" +
        (src.date ? " · " + STF.esc(src.date) : "");
    }).join("<br>");
    resBody.innerHTML =
      maskHTML(hunter, true) +
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
      '<p class="hunter-credit">Mask images: <a href="https://thedivision.fandom.com/wiki/Hunters" target="_blank" rel="noopener">The Division Wiki (Fandom)</a></p>';
    window.scrollTo(0, 0);
    if (push) history.pushState({ res: "hunters", hunter: id }, "", "#hunters/" + id);
  }

  function openRes(id, push) {
    if (id === "hunters") {
      ensureHunters(function () { showHunterList(push); });
      return;
    }
    var item = RES[id];
    if (!item || !resBody) return;
    if (landing) landing.hidden = true;
    if (resDetail) resDetail.hidden = false;
    if (resBack) resBack.hidden = true;
    document.body.classList.remove("is-hunter");
    setHunterBack("list");
    resBody.innerHTML = "<h1>" + STF.esc(item.title) + "</h1>" + item.html;
    window.scrollTo(0, 0);
    if (push) history.pushState({ res: id }, "", "#" + id);
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

  if (landing) {
    landing.addEventListener("click", function (e) {
      var btn = e.target.closest("[data-res]");
      if (!btn) return;
      openRes(btn.getAttribute("data-res"), true);
    });
  }
  if (resBody) {
    resBody.addEventListener("click", function (e) {
      var btn = e.target.closest("[data-hunter]");
      if (!btn) return;
      ensureHunters(function () { showHunterDetail(btn.getAttribute("data-hunter"), true); });
    });
  }
  if (resBack) {
    resBack.addEventListener("click", function () {
      history.pushState({ res: null }, "", "resources.html");
      showLanding();
    });
  }
  function routeHunter() {
    var hash = (location.hash || "").replace("#", "");
    if (hash.indexOf("hunters/") === 0) {
      var id = hash.slice("hunters/".length);
      ensureHunters(function () { showHunterDetail(id, false); });
      return true;
    }
    if (hash === "hunters") {
      ensureHunters(function () { showHunterList(false); });
      return true;
    }
    return false;
  }

  window.addEventListener("popstate", function () {
    if (routeHunter()) return;
    var id = (location.hash || "").replace("#", "");
    if (RES[id]) openRes(id, false);
    else showLanding();
  });

  if (!routeHunter()) {
    var start = (location.hash || "").replace("#", "");
    if (RES[start]) openRes(start, false);
  }
})();
