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

  function hollowDetail(row) {
    return (
      '<h1>Hollow Man</h1>' +
      '<p class="build-role tone-' + row.tone + '">' + STF.esc(row.role) + "</p>" +
      '<div class="detail-blurb"><strong>Summary</strong>DPS support — creates status effects.</div>' +
      '<div class="detail-blurb"><strong>How to play</strong>Use cover and the big Alejandro or any machine gun to spray and mark enemies with status effects. Offer crowd control support whilst team DPS eliminates marked enemies to proc hollow point bullets.</div>' +
      '<div class="detail-blurb"><strong>Hardcore</strong>Stay in cover. Do not greed marks in the open. Pair with a tank or healer.</div>' +
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

  function placeholderDetail(row) {
    var icon = row.icon
      ? '<img class="detail-logo" src="' + row.icon + '" alt="">'
      : "";
    return (
      "<h1>" + icon + STF.esc(row.name) + "</h1>" +
      '<p class="build-role tone-' + row.tone + '">' + STF.esc(row.role) + "</p>" +
      '<p class="lede">Setup not seeded yet. No attribute numbers are listed for this build.</p>'
    );
  }

  function showGrid() {
    document.body.classList.add("is-grid");
    document.body.classList.remove("is-list");
    stage.hidden = false;
    listView.hidden = true;
    detailView.hidden = true;
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
    if (listTitle) listTitle.textContent = cat.label;
    var rows = LISTS[catId] || [];
    listRows.innerHTML = rows
      .map(function (row) {
        var icon = row.icon
          ? '<img src="' + row.icon + '" alt="" class="' + (row.icon.indexOf("strikers") !== -1 ? "is-banner" : "") + '">'
          : '<span class="role-mark tone-' + row.tone + '" aria-hidden="true"></span>';
        return (
          '<button type="button" class="build-row tone-' + row.tone + '" data-build="' + row.id + '">' +
          '<span class="build-logo">' + icon + "</span>" +
          "<span><strong>" + STF.esc(row.name) + "</strong>" +
          '<em class="tone-' + row.tone + '">' + STF.esc(row.role) + "</em></span>" +
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
    detailBody.innerHTML = row.detail === "hollow-man" ? hollowDetail(row) : placeholderDetail(row);
    if (detailBack) detailBack.textContent = "← " + cat.label;
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
