(async function () {
  STF.mountChrome("resources", "Resources");

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
        "<p class=\"muted\">Hide all, then enable SHD Tech.</p>"
    },
    hunters: {
      title: "Hunter Guides",
      html: "<p>Hunter routes are not seeded in the hub yet. No mask locations are listed here.</p>"
    },
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

  function showResLanding() {
    if (landing) landing.hidden = false;
    if (resDetail) resDetail.hidden = true;
  }

  function openRes(id, push) {
    var item = RES[id];
    if (!item || !resBody) return;
    if (landing) landing.hidden = true;
    if (resDetail) resDetail.hidden = false;
    resBody.innerHTML = "<h1>" + STF.esc(item.title) + "</h1>" + item.html;
    window.scrollTo(0, 0);
    if (push) history.pushState({ res: id }, "", "#" + id);
  }

  if (landing) {
    landing.addEventListener("click", function (e) {
      var btn = e.target.closest("[data-res]");
      if (!btn) return;
      openRes(btn.getAttribute("data-res"), true);
    });
  }
  if (resBack) {
    resBack.addEventListener("click", function () {
      history.pushState({ res: null }, "", "resources.html");
      showResLanding();
    });
  }
  window.addEventListener("popstate", function () {
    var id = (location.hash || "").replace("#", "");
    if (RES[id]) openRes(id, false);
    else showResLanding();
  });
  var startRes = (location.hash || "").replace("#", "");
  if (RES[startRes]) openRes(startRes, false);

  const STORAGE_RAIDS = "stf_raids_v1";
  const STORAGE_RSVP = "stf_rsvp_v1";
  const listEl = document.getElementById("raid-list");
  const form = document.getElementById("raid-admin-form");
  const nameInput = document.getElementById("member-name");

  function loadSeedThenLocal(seed) {
    try {
      const raw = localStorage.getItem(STORAGE_RAIDS);
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return seed || [];
  }

  function saveRaids(raids) {
    localStorage.setItem(STORAGE_RAIDS, JSON.stringify(raids));
  }

  function loadRsvp() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_RSVP) || "{}");
    } catch (e) {
      return {};
    }
  }

  function saveRsvp(map) {
    localStorage.setItem(STORAGE_RSVP, JSON.stringify(map));
  }

  function memberName() {
    const n = (nameInput && nameInput.value.trim()) || localStorage.getItem("stf_display_name") || "";
    if (nameInput && nameInput.value.trim()) {
      localStorage.setItem("stf_display_name", nameInput.value.trim());
    }
    return n || "Agent";
  }

  if (nameInput) {
    nameInput.value = localStorage.getItem("stf_display_name") || "";
  }

  let raids = [];

  function mergedConfirmed(raid) {
    const rsvp = loadRsvp();
    const extra = rsvp[raid.id] || [];
    const base = raid.confirmed || [];
    const set = {};
    base.concat(extra).forEach(function (n) {
      if (n) set[n] = true;
    });
    return Object.keys(set);
  }

  function render() {
    if (!listEl) return;
    if (!raids.length) {
      listEl.innerHTML = '<p class="lede">No raids scheduled yet. Admins can add one below (saved in this browser).</p>';
      return;
    }
    listEl.innerHTML = raids
      .map(function (r) {
        const people = mergedConfirmed(r);
        const pills = people.map(function (p) {
          return '<span class="pill">' + STF.esc(p) + "</span>";
        }).join("") || '<span class="muted">No one confirmed yet</span>';
        return (
          '<article class="raid-card" data-id="' + STF.esc(r.id) + '">' +
          "<h3>" + STF.esc(r.activity) + (r.difficulty ? " · " + STF.esc(r.difficulty) : "") + "</h3>" +
          '<div class="raid-meta">' +
          STF.esc(r.date) + " · " + STF.esc(r.time) + " (" + STF.esc(r.timezone || "local") + ")" +
          (r.leader ? " · Lead: " + STF.esc(r.leader) : "") +
          "</div>" +
          (r.notes ? '<p class="raid-notes">' + STF.esc(r.notes) + "</p>" : "") +
          '<div class="confirmed">' + pills + "</div>" +
          '<div class="raid-actions">' +
          '<button type="button" class="btn" data-act="in">I\'m in</button>' +
          '<button type="button" class="btn btn-ghost" data-act="out">Can\'t make it</button>' +
          "</div></article>"
        );
      })
      .join("");
  }

  listEl && listEl.addEventListener("click", function (e) {
    const btn = e.target.closest("button[data-act]");
    if (!btn) return;
    const card = btn.closest(".raid-card");
    if (!card) return;
    const id = card.getAttribute("data-id");
    const act = btn.getAttribute("data-act");
    const name = memberName();
    const rsvp = loadRsvp();
    const arr = rsvp[id] ? rsvp[id].slice() : [];
    if (act === "in") {
      if (arr.indexOf(name) === -1) arr.push(name);
    } else {
      const i = arr.indexOf(name);
      if (i !== -1) arr.splice(i, 1);
      // also strip from seed confirmed copy in local raids
      raids = raids.map(function (r) {
        if (r.id !== id) return r;
        return Object.assign({}, r, {
          confirmed: (r.confirmed || []).filter(function (n) { return n !== name; })
        });
      });
      saveRaids(raids);
    }
    rsvp[id] = arr;
    saveRsvp(rsvp);
    render();
  });

  if (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      const fd = new FormData(form);
      const id = "raid-" + Date.now();
      const raid = {
        id: id,
        activity: String(fd.get("activity") || "Raid"),
        date: String(fd.get("date") || ""),
        time: String(fd.get("time") || ""),
        timezone: String(fd.get("timezone") || "Australia/Melbourne"),
        difficulty: String(fd.get("difficulty") || "Normal"),
        leader: String(fd.get("leader") || ""),
        notes: String(fd.get("notes") || ""),
        confirmed: []
      };
      raids.push(raid);
      saveRaids(raids);
      form.reset();
      render();
    });
  }

  try {
    const data = await STF.fetchJSON("data/raids.json");
    raids = loadSeedThenLocal(data.raids || []);
    // if first visit, persist seed so RSVPs merge cleanly
    if (!localStorage.getItem(STORAGE_RAIDS)) saveRaids(raids);
  } catch (err) {
    raids = loadSeedThenLocal([]);
  }
  render();
})();
