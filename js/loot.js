/* One-screen targeted loot. Two columns: mission or cache, then the targeted brand, set, slot, or weapon. */
(async function () {
  STF.mountChrome("loot");
  var root = document.getElementById("loot-screen");
  if (!root) return;

  /* Dark Zone data and row markup stay in place. Flip this to show the section again. */
  var SHOW_DARK_ZONE = false;
  var FALLBACK = "assets/icons/loot/generic.svg";

  function pad(n) { return (n < 10 ? "0" : "") + n; }

  function expectedLootDate(now) {
    var d = new Date(now.getTime());
    if (d.getUTCHours() < 8) d.setUTCDate(d.getUTCDate() - 1);
    return d.getUTCFullYear() + "-" + pad(d.getUTCMonth() + 1) + "-" + pad(d.getUTCDate());
  }

  function mark(src) {
    var file = src || FALLBACK;
    return '<img src="' + STF.esc(file) + '" alt="">';
  }

  function pair(leftSrc, leftText, rightSrc, rightText, extra) {
    return (
      '<div class="loot-row">' +
      '<div class="loot-cell">' + mark(leftSrc) + "<span>" + STF.esc(leftText || "") + "</span></div>" +
      '<div class="loot-cell">' + mark(rightSrc) + "<span>" + (extra || "") + STF.esc(rightText || "") + "</span></div>" +
      "</div>"
    );
  }

  function section(leftHead, rightHead, rows) {
    return (
      '<section class="loot-block">' +
      '<div class="loot-head"><span>' + leftHead + "</span><span>" + rightHead + "</span></div>" +
      '<div class="loot-rows">' + rows + "</div>" +
      "</section>"
    );
  }

  try {
    var data = await STF.fetchJSON("data/loot.json");
    var esc = (data.escalations || []).map(function (row) {
      var star = row.priority ? '<i class="loot-priority" title="Priority loot">!</i>' : "";
      return pair(row.missionIcon, row.mission, row.icon, row.loot, star);
    }).join("");
    var caches = (data.protoCaches || []).map(function (row) {
      return pair(row.cacheIcon, row.cache, row.icon, row.loot, "");
    }).join("");
    var dz = (data.darkZone || []).map(function (row) {
      var placeholder = row.loot === "confirm in-game";
      var badge = (row.badge || "").trim();
      var extra = badge
        ? '<b class="dz-badge">' + STF.esc(badge) + "</b>"
        : "";
      return (
        '<div class="loot-row">' +
        '<div class="loot-cell"><span>' + STF.esc(row.map) + "</span></div>" +
        '<div class="loot-cell">' + (row.icon ? mark(row.icon) : "") +
        '<span class="' + (placeholder ? "is-placeholder" : "") + '">' + extra + STF.esc(row.loot || "") + "</span></div>" +
        "</div>"
      );
    }).join("");

    var creditDate = data.lootDate ? STF.formatDate(data.lootDate) : "";
    var stale = data.lootDate && data.lootDate < expectedLootDate(new Date());
    var dzSection = SHOW_DARK_ZONE ? section("Dark Zone", "Target loot", dz) : "";
    var credit = "";
    if (creditDate || stale) {
      credit =
        '<p class="loot-credit">' +
        (creditDate ? STF.esc(creditDate) : "") +
        (stale ? (creditDate ? " · " : "") + '<span class="loot-updating">updating…</span>' : "") +
        "</p>";
    }
    root.innerHTML =
      section("Missions", "Target loot", esc) +
      section("Caches", "Target loot", caches) +
      dzSection +
      credit;
  } catch (err) {
    root.innerHTML = '<p class="lede">Could not load targeted loot.</p>';
    console.error(err);
  }
})();
