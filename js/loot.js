/* One-screen targeted loot. Icons are the real brand, set, slot, or weapon marks. */
(async function () {
  STF.mountChrome("loot");
  var root = document.getElementById("loot-screen");
  if (!root) return;

  /* Dark Zone data and row markup stay in place. Flip this to show the section again. */
  var SHOW_DARK_ZONE = false;

  function iconHTML(row) {
    var kind = STF.esc(row.kind || "unknown");
    var tone = row.tone ? " tone-" + STF.esc(row.tone) : "";
    if (!row.icon) {
      return '<span class="loot-ico kind-' + kind + tone + ' is-empty" aria-hidden="true"></span>';
    }
    return (
      '<span class="loot-ico kind-' + kind + tone + '">' +
      '<img src="' + STF.esc(row.icon) + '" alt="">' +
      "</span>"
    );
  }

  function rowHTML(name, row) {
    var placeholder = row.loot === "confirm in-game";
    var mark = row.priority ? '<span class="loot-priority" title="Priority loot">!</span>' : "";
    return (
      '<div class="loot-row">' +
      '<span class="loot-name">' + STF.esc(name) + "</span>" +
      '<span class="loot-val' + (placeholder ? " is-placeholder" : "") + '">' + mark + STF.esc(row.loot || "") + "</span>" +
      iconHTML(row) +
      "</div>"
    );
  }

  function pad(n) { return (n < 10 ? "0" : "") + n; }

  function expectedLootDate(now) {
    var d = new Date(now.getTime());
    if (d.getUTCHours() < 8) d.setUTCDate(d.getUTCDate() - 1);
    return d.getUTCFullYear() + "-" + pad(d.getUTCMonth() + 1) + "-" + pad(d.getUTCDate());
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
    var stale = data.lootDate && data.lootDate < expectedLootDate(new Date());
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
      '<p class="loot-credit">Data: <a href="https://prototrack.gg/" rel="noopener" target="_blank">ProtoTrack.gg</a>' +
      (creditDate ? " · " + STF.esc(creditDate) : "") +
      (stale ? ' · <span class="loot-updating">updating…</span>' : "") +
      "</p>";
  } catch (err) {
    root.innerHTML = '<p class="lede">Could not load targeted loot.</p>';
    console.error(err);
  }
})();
