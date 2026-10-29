/* One-screen targeted loot. Escalations + proto caches from ProtoTrack.
   DZ loot and weekly mode are placeholders until an admin fills data/loot.json. */
(async function () {
  STF.mountChrome("loot");
  var root = document.getElementById("loot-screen");
  if (!root) return;

  function chip(row) {
    return (
      '<span class="loot-chip kind-' + STF.esc(row.kind || "unknown") + '" aria-hidden="true">' +
      STF.esc(row.mark || "·") +
      "</span>"
    );
  }

  function rowHTML(name, row) {
    var pri = row.priority ? '<span class="loot-pri" title="Priority on ProtoTrack">●</span>' : "";
    var placeholder = row.loot === "confirm in-game";
    return (
      '<div class="loot-row">' +
      '<span class="loot-name">' + pri + STF.esc(name) + "</span>" +
      chip(row) +
      '<span class="loot-val' + (placeholder ? " is-placeholder" : "") + '">' + STF.esc(row.loot || "") + "</span>" +
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
          chip(row) +
          '<span class="loot-val' + (placeholder ? " is-placeholder" : "") + '">' + STF.esc(row.loot || "") + "</span>" +
          badgeHTML(row) +
          "</div>"
        );
      })
      .join("");

    var creditDate = data.lootDate ? STF.formatDate(data.lootDate) : "";
    root.innerHTML =
      '<section class="loot-block loot-esc">' +
      "<h2>Escalations</h2>" +
      '<div class="loot-rows">' + esc + "</div></section>" +
      '<section class="loot-block loot-proto">' +
      "<h2>Proto Caches</h2>" +
      '<div class="loot-rows">' + caches + "</div></section>" +
      '<section class="loot-block loot-dz">' +
      "<h2>Dark Zone</h2>" +
      '<div class="loot-rows">' + dz + "</div></section>" +
      '<p class="loot-credit">Source: <a href="' + STF.esc(data.source || "https://prototrack.gg/target-loot/target-loot.php") + '" rel="noopener" target="_blank">ProtoTrack</a>' +
      (creditDate ? " · " + STF.esc(creditDate) : "") +
      ". DZ loot and mode: confirm in-game.</p>";
  } catch (err) {
    root.innerHTML = '<p class="lede">Could not load targeted loot.</p>';
    console.error(err);
  }
})();
