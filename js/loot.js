/* One-screen targeted loot. Two columns: mission or cache, then the targeted brand, set, slot, or weapon. */
(async function () {
  STF.mountChrome("loot");
  var root = document.getElementById("loot-screen");
  if (!root) return;

  /* Dark Zone data and row markup stay in place. Flip this to show the section again. */
  var SHOW_DARK_ZONE = false;
  var FALLBACK = "assets/icons/loot/generic.svg";
  /* Division 2 daily reset. 08:00 UTC is 7pm Sydney in AEDT and 6pm in AEST, so it stays correct across daylight saving. */
  var LOOT_RESET_UTC_HOUR = 8;

  function pad(n) { return (n < 10 ? "0" : "") + n; }

  function nextReset(now) {
    var next = new Date(Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate(),
      LOOT_RESET_UTC_HOUR, 0, 0, 0
    ));
    if (now.getTime() >= next.getTime()) next.setUTCDate(next.getUTCDate() + 1);
    return next;
  }

  function expectedLootDate(now) {
    var d = new Date(now.getTime());
    if (d.getUTCHours() < LOOT_RESET_UTC_HOUR) d.setUTCDate(d.getUTCDate() - 1);
    return d.getUTCFullYear() + "-" + pad(d.getUTCMonth() + 1) + "-" + pad(d.getUTCDate());
  }

  function resetLabel(now) {
    var ms = Math.max(0, nextReset(now).getTime() - now.getTime());
    var total = Math.floor(ms / 1000);
    var hours = Math.floor(total / 3600);
    var minutes = Math.floor((total % 3600) / 60);
    var seconds = total % 60;
    if (hours >= 1) return "RESETS IN " + hours + "h " + minutes + "m";
    return "RESETS IN " + minutes + "m " + pad(seconds) + "s";
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

    var stale = data.lootDate && data.lootDate < expectedLootDate(new Date());
    var dzSection = SHOW_DARK_ZONE ? section("Dark Zone", "Target loot", dz) : "";
    root.innerHTML =
      '<p class="loot-status"><span class="loot-reset" id="loot-reset"></span>' +
      (stale ? '<span class="loot-updating">updating…</span>' : "") +
      "</p>" +
      section("Missions", "Target loot", esc) +
      section("Caches", "Target loot", caches) +
      dzSection;
    var resetEl = document.getElementById("loot-reset");
    function paintReset() {
      var now = new Date();
      if (resetEl) resetEl.textContent = resetLabel(now);
      var remain = nextReset(now).getTime() - now.getTime();
      window.setTimeout(paintReset, remain < 3600000 ? 1000 : 60000);
    }
    paintReset();
  } catch (err) {
    root.innerHTML = '<p class="lede">Could not load targeted loot.</p>';
    console.error(err);
  }
})();
