/* One-screen targeted loot. Icons are the real brand, set, slot, or weapon marks. */
(async function () {
  STF.mountChrome("loot");
  var root = document.getElementById("loot-screen");
  if (!root) return;

  /* Dark Zone data and row markup stay in place. Flip this to show the section again. */
  var SHOW_DARK_ZONE = false;

  function iconHTML(row) {
    var kind = STF.esc(row.kind || "unknown");
    if (!row.icon) {
      return '<span class="loot-ico kind-' + kind + ' is-empty" aria-hidden="true"></span>';
    }
    return (
      '<span class="loot-ico kind-' + kind + '">' +
      '<img src="' + STF.esc(row.icon) + '" alt="">' +
      "</span>"
    );
  }

  function rowHTML(name, row) {
    var placeholder = row.loot === "confirm in-game";
    return (
      '<div class="loot-row">' +
      '<span class="loot-name">' + STF.esc(name) + "</span>" +
      '<span class="loot-val' + (placeholder ? " is-placeholder" : "") + '">' + STF.esc(row.loot || "") + "</span>" +
      iconHTML(row) +
      "</div>"
    );
  }

  function badgeHTML(zone) {
    var badge = (zone.badge || "").trim();
    if (!badge) {
      return '<span class="dz-badge is-empty" title="Set badge in data/loot.json: PvE · Toxic, PvP · Blackout, or PvP · Balanced">mode</span>';
    }
    return '<span class="dz-badge">' + STF.esc(badge) + "</span>";
  }

  try {
    var data = await STF.fetchJSON("data/loot.json");
    var esc = (data.escalations || [])
      .map(function (row) { return rowHTML(row.mission, row); })
      .join("");
    var caches = (data.protoCaches || [])
      .map(function (row) { return rowHTML(row.cache, row); })
      .join("");
    var dz = (data.darkZone || [])
      .map(function (row) {
        var placeholder = row.loot === "confirm in-game";
        return (
          '<div class="loot-row loot-row-dz">' +
          '<span class="loot-name">' + STF.esc(row.map) + "</span>" +
          '<span class="loot-val' + (placeholder ? " is-placeholder" : "") + '">' + STF.esc(row.loot || "") + "</span>" +
          badgeHTML(row) +
          iconHTML(row) +
          "</div>"
        );
      })
      .join("");

    var creditDate = data.lootDate ? STF.formatDate(data.lootDate) : "";
    var dzSection = "";
    if (SHOW_DARK_ZONE) {
      dzSection =
        '<section class="loot-block loot-dz">' +
        "<h2>Dark Zone</h2>" +
        '<div class="loot-rows">' + dz + "</div></section>";
    }
    root.innerHTML =
      '<section class="loot-block loot-esc">' +
      "<h2>Missions</h2>" +
      '<div class="loot-rows">' + esc + "</div></section>" +
      '<section class="loot-block loot-proto">' +
      "<h2>Caches</h2>" +
      '<div class="loot-rows">' + caches + "</div></section>" +
      dzSection +
      '<p class="loot-credit">Source: <a href="' + STF.esc(data.source || "https://prototrack.gg/target-loot/target-loot.php") + '" rel="noopener" target="_blank">ProtoTrack</a>' +
      (creditDate ? " · " + STF.esc(creditDate) : "") +
      (SHOW_DARK_ZONE ? ". DZ loot and mode: confirm in-game." : "") +
      "</p>";
  } catch (err) {
    root.innerHTML = '<p class="lede">Could not load targeted loot.</p>';
    console.error(err);
  }
})();
