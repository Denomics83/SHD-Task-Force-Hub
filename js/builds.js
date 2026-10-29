/* Builds: category grid → name/role list → detail.
   The owner's second "Incursion" block is Escalation. */
(function () {
  STF.mountChrome("builds");

  var stage = document.getElementById("cat-stage");
  var listView = document.getElementById("build-list");
  var listTitle = document.getElementById("list-title");
  var listRows = document.getElementById("list-rows");
  var listBack = document.getElementById("list-back");
  var detailView = document.getElementById("build-detail");
  var detailBody = document.getElementById("detail-body");
  var detailBack = document.getElementById("detail-back");
  if (!stage || !listView || !detailView) return;

  var STRIKER = "assets/icons/gearsets/strikers-battlegear.png";

  var ROLE_ICONS = {
    dps: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3.1" fill="none" stroke="#fff" stroke-width="1.8"/><path d="M12 3.4v3.1M12 17.5v3.1M3.4 12h3.1M17.5 12h3.1" fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round"/></svg>',
    cc: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.8 13.7 8l5.3.5-4.1 3.4 1.4 5.1L12 14.2 7.7 17l1.4-5.1L5 8.5 10.3 8Z" fill="#fff"/></svg>',
    heal: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10.1 4.2h3.8V10h5.9v3.8H13.9v5.8h-3.8v-5.8H4.2V10h5.9Z" fill="#fff"/></svg>',
    tank: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.1 19.2 6v6.1c0 4.3-2.9 6.8-7.2 8.4-4.3-1.6-7.2-4.1-7.2-8.4V6Z" fill="none" stroke="#fff" stroke-width="1.8" stroke-linejoin="round"/></svg>'
  };

  function roleKind(role) {
    var text = String(role || "").toLowerCase();
    if (text.indexOf("heal") !== -1) return "heal";
    if (text.indexOf("tank") !== -1) return "tank";
    if (text.indexOf("crowd") !== -1 || text.indexOf("cc") !== -1) return "cc";
    return "dps";
  }

  var CATS = [
    { id: "solo", label: "Solo", art: "assets/tiles/builds-solo.jpg" },
    { id: "team", label: "Team", art: "assets/tiles/builds-team.jpg" },
    { id: "incursion", label: "Incursion", art: "assets/tiles/builds-incursion.jpg" },
    { id: "escalation", label: "Escalation", art: "assets/tiles/builds-escalation.jpg" },
    { id: "raid", label: "Raid", art: "assets/tiles/builds-raid.jpg" },
    { id: "pvp", label: "PvP", art: "assets/tiles/builds-pvp.jpg" }
  ];

  /* Names and roles only. No attribute numbers. */
  var LISTS = {
    solo: [
      { id: "striker", name: "Striker", role: "DPS", tone: "dps", icon: STRIKER },
      { id: "hollow-man", name: "Hollow Man", role: "DPS", tone: "dps", detail: "hollow-man" },
      { id: "oneshot", name: "Oneshot", role: "DPS", tone: "dps" }
    ],
    team: [
      { id: "hollow-man", name: "Hollow Man", role: "Damage support", tone: "dps", detail: "hollow-man" },
      { id: "capin-murica", name: "Capin Murica", role: "Damage support", tone: "dps" },
      { id: "splooge", name: "Splooge", role: "Crowd control", tone: "skill" },
      { id: "medic", name: "Medic", role: "Healer", tone: "heal" }
    ],
    incursion: [
      { id: "juggernaut", name: "Juggernaut", role: "Tank support", tone: "tank" },
      { id: "measured", name: "Measured", role: "Healer", tone: "heal" },
      { id: "attack", name: "Attack", role: "Damage", tone: "dps" }
    ],
    escalation: [
      { id: "splooge", name: "Splooge", role: "Crowd control", tone: "skill" },
      { id: "striker", name: "Striker", role: "Damage", tone: "dps", icon: STRIKER },
      { id: "medic", name: "Medic", role: "Healer", tone: "heal" }
    ],
    raid: [
      { id: "striker", name: "Striker", role: "Damage", tone: "dps", icon: STRIKER }
    ],
    pvp: [
      { id: "up-close", name: "Up Close", role: "Damage", tone: "dps" }
    ]
  };

  function catById(id) {
    for (var i = 0; i < CATS.length; i++) if (CATS[i].id === id) return CATS[i];
    return null;
  }

  function findBuild(catId, buildId) {
    var rows = LISTS[catId] || [];
    for (var i = 0; i < rows.length; i++) if (rows[i].id === buildId) return rows[i];
    return null;
  }

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

  function hollowLoadout() {
    var striker = { name: "Striker's Battlegear", rarity: "gearset", icon: STRIKER, mark: "S", art: "mask", dots: 2 };
    return {
      spec: { name: "Minigun", rarity: "spec", art: "spec", mark: "G", dots: 0 },
      grenade: { name: "Grenade", rarity: "empty", art: "grenade" },
      weapons: [
        { name: "St. Elmo's Engine", rarity: "gold", art: "rifle", mark: "E", dots: 2 },
        { name: "Machine gun", rarity: "gold", art: "rifle", dots: 1 },
        { name: "Sidearm", rarity: "empty", art: "pistol" }
      ],
      gear: [
        { slot: "mask", name: striker.name, rarity: "gearset", icon: STRIKER, mark: "S", art: "mask", dots: 2 },
        { slot: "chest", name: "Grupo Sombra", rarity: "gold", icon: "assets/icons/brands/grupo-logo.png", mark: "G", art: "chest", dots: 2 },
        { slot: "holster", name: striker.name, rarity: "gearset", icon: STRIKER, mark: "S", art: "holster", dots: 1 },
        { slot: "bag", name: "Memento", rarity: "gold", icon: "assets/icons/exotics/memento.png", mark: "M", art: "bag", dots: 3 },
        { slot: "gloves", name: striker.name, rarity: "gearset", icon: STRIKER, mark: "S", art: "gloves", dots: 2 },
        { slot: "knees", name: striker.name, rarity: "gearset", icon: STRIKER, mark: "S", art: "knees", dots: 2 }
      ],
      skills: [
        { name: "Crusader Shield", rarity: "empty", art: "skill" },
        { name: "Reviver Hive", rarity: "empty", art: "skill" }
      ]
    };
  }

  function placeholderLoadout(row) {
    function piece(name, art) {
      return { name: name, rarity: "empty", art: art, icon: row.icon || "" };
    }
    return {
      spec: { name: "Signature", rarity: "spec", art: "spec" },
      grenade: { name: "Grenade", rarity: "empty", art: "grenade" },
      weapons: [piece("Primary", "rifle"), piece("Secondary", "rifle"), piece("Sidearm", "pistol")],
      gear: [
        piece("Mask", "mask"), piece("Chest", "chest"), piece("Holster", "holster"),
        piece("Backpack", "bag"), piece("Gloves", "gloves"), piece("Kneepads", "knees")
      ],
      skills: [piece("Skill", "skill"), piece("Skill", "skill")]
    };
  }

  function tdSlot(item) {
    var rarity = item.rarity || "empty";
    var art = item.icon
      ? '<img src="' + STF.esc(item.icon) + '" alt="">'
      : (SLOT_ART[item.art] || SLOT_ART.skill);
    var dots = "";
    var count = rarity === "empty" ? 0 : (item.dots || 0);
    for (var i = 0; i < count; i++) dots += "<i></i>";
    var mark = rarity === "empty" || !item.mark
      ? ""
      : '<span class="td-mark">' + STF.esc(item.mark) + "</span>";
    var lvl = rarity === "empty" ? "" : '<span class="td-lvl">40</span>';
    return (
      '<div class="td-slot">' +
      '<div class="td-face rarity-' + rarity + '">' +
      lvl +
      '<span class="td-art">' + art + "</span>" +
      mark +
      (dots ? '<span class="td-dots">' + dots + "</span>" : "") +
      "</div>" +
      '<span class="td-title">' + STF.esc(item.name) + "</span>" +
      "</div>"
    );
  }

  function loadoutHTML(row) {
    var pack = row.detail === "hollow-man" ? hollowLoadout() : placeholderLoadout(row);
    var gear = pack.gear;
    return (
      '<div class="td-loadout">' +
      '<div class="td-row td-row-2">' + tdSlot(pack.spec) + tdSlot(pack.grenade) + "</div>" +
      '<div class="td-row td-row-3">' + pack.weapons.map(tdSlot).join("") + "</div>" +
      '<div class="td-row td-row-2">' + tdSlot(gear[0]) + tdSlot(gear[1]) + "</div>" +
      '<div class="td-row td-row-2">' + tdSlot(gear[2]) + tdSlot(gear[3]) + "</div>" +
      '<div class="td-row td-row-2">' + tdSlot(gear[4]) + tdSlot(gear[5]) + "</div>" +
      '<div class="td-row td-row-2">' + pack.skills.map(tdSlot).join("") + "</div>" +
      "</div>"
    );
  }

  function playstyleHTML(row) {
    if (row.detail === "hollow-man") {
      return (
        "<h1>Hollow Man</h1>" +
        '<p class="build-role tone-' + row.tone + '">' + STF.esc(row.role) + "</p>" +
        '<div class="detail-blurb"><strong>Summary</strong>DPS support — creates status effects.</div>' +
        '<div class="detail-blurb"><strong>How to play</strong>Use cover and the big Alejandro or any machine gun to spray and mark enemies with status effects. Offer crowd control support whilst team DPS eliminates marked enemies to proc hollow point bullets.</div>' +
        '<div class="detail-blurb"><strong>Hardcore</strong>Stay in cover. Do not greed marks in the open. Pair with a tank or healer.</div>'
      );
    }
    var icon = row.icon ? '<img class="detail-logo" src="' + row.icon + '" alt="">' : "";
    return (
      "<h1>" + icon + STF.esc(row.name) + "</h1>" +
      '<p class="build-role tone-' + row.tone + '">' + STF.esc(row.role) + "</p>" +
      '<p class="lede">Setup not seeded yet. No attribute numbers are listed for this build.</p>'
    );
  }

  function specsHTML(row) {
    if (row.detail !== "hollow-man") {
      return '<p class="lede">Setup not seeded yet. No attribute numbers are listed for this build.</p>';
    }
    return (
      '<h2 class="detail-label">Pieces</h2>' +
      '<ul class="piece-list">' +
      "<li><span>Mask</span> Striker's Battlegear</li>" +
      "<li><span>Chest</span> Grupo Sombra · Obliterate</li>" +
      "<li><span>Backpack</span> Memento</li>" +
      "<li><span>Gloves</span> Striker's Battlegear</li>" +
      "<li><span>Holster</span> Striker's Battlegear</li>" +
      "<li><span>Kneepads</span> Striker's Battlegear</li>" +
      "<li><span>Primary</span> St. Elmo's Engine</li>" +
      "<li><span>Skills</span> Crusader Shield · Reviver Hive</li>" +
      "<li><span>Spec</span> Gunner</li>" +
      "</ul>" +
      '<p class="lede">Piece names only. No rolled attribute numbers.</p>'
    );
  }

  function detailHTML(row) {
    return (
      '<div class="detail-rail">' +
      '<section class="detail-panel" aria-label="Playstyle">' + playstyleHTML(row) + "</section>" +
      '<section class="detail-panel" aria-label="Gear loadout">' + loadoutHTML(row) + "</section>" +
      '<section class="detail-panel" aria-label="Specs">' + specsHTML(row) + "</section>" +
      "</div>"
    );
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
        history.pushState({ cat: cat.id }, "", "#" + cat.id);
        showList(cat.id, false);
      };
      return;
    }
    back.setAttribute("aria-label", "Back to Builds");
    back.onclick = function () {
      history.pushState({}, "", "builds.html");
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
    var rows = LISTS[catId] || [];
    listRows.innerHTML = rows
      .map(function (row) {
        var kind = roleKind(row.role);
        return (
          '<button type="button" class="build-row" data-build="' + row.id + '">' +
          '<span class="build-copy"><strong>' + STF.esc(row.name) + "</strong>" +
          "<em>" + STF.esc(row.role) + "</em></span>" +
          '<span class="role-ico ' + kind + '" aria-hidden="true">' + ROLE_ICONS[kind] + "</span>" +
          "</button>"
        );
      })
      .join("");
    window.scrollTo(0, 0);
    if (push) history.pushState({ cat: catId }, "", "#" + catId);
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
    detailBody.innerHTML = detailHTML(row);
    window.scrollTo(0, 0);
    if (push) history.pushState({ cat: catId, build: buildId }, "", "#" + catId + "/" + buildId);
  }

  stage.innerHTML =
    '<div class="cat-grid">' +
    CATS.map(function (cat) {
      return (
        '<button type="button" class="cat-tile" data-cat="' + cat.id + '">' +
        '<img src="' + cat.art + '" alt="' + STF.esc(cat.label) + '">' +
        "</button>"
      );
    }).join("") +
    "</div>";

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
      history.pushState({}, "", "builds.html");
      showGrid();
    });
  }
  if (detailBack) {
    detailBack.addEventListener("click", function () {
      var catId = (location.hash || "").replace("#", "").split("/")[0];
      history.pushState({ cat: catId }, "", "#" + catId);
      showList(catId, false);
    });
  }

  window.addEventListener("popstate", function () {
    route(false);
  });

  function route(push) {
    var parts = (location.hash || "").replace("#", "").split("/");
    var catId = parts[0];
    var buildId = parts[1];
    if (catId && buildId && findBuild(catId, buildId)) showDetail(catId, buildId, push);
    else if (catId && catById(catId)) showList(catId, push);
    else showGrid();
  }

  route(false);
})();
