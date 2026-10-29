/* Targeted loot — data/loot.json only, not a live in-game feed. */
(async function () {
  STF.mountChrome("loot");
  var list = document.getElementById("loot-list");
  var weekEl = document.getElementById("loot-week");
  var weekLabel = document.getElementById("loot-week-label");
  var noteEl = document.getElementById("loot-note");
  if (!list) return;

  var ICON =
    '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="5.4" fill="none" stroke="#fff" stroke-width="1.8"/><path fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round" d="M12 2.4v3M12 18.6v3M2.4 12h3M18.6 12h3"/></svg>';

  try {
    var loot = await STF.fetchJSON("data/loot.json");
    var today = loot.today || [];
    var weekOf = loot.weekOf ? "Week of " + STF.formatDate(loot.weekOf) : "";

    if (!today.length) {
      list.innerHTML = '<p class="lede">No targeted loot listed for this week.</p>';
    } else {
      list.innerHTML = today
        .map(function (row) {
          return (
            '<article class="upd-entry">' +
            "<div>" +
            '<span class="upd-chip">Today</span>' +
            "<h2>" + STF.esc(row.loot || "Targeted loot") + "</h2>" +
            (row.zone ? '<p class="upd-desc">' + STF.esc(row.zone) + "</p>" : "") +
            (weekOf ? "<time>" + STF.esc(weekOf) + "</time>" : "") +
            "</div>" +
            '<div class="upd-ico news" aria-hidden="true">' + ICON + "</div>" +
            "</article>"
          );
        })
        .join("");
    }

    var week = loot.week || [];
    if (weekEl && week.length) {
      if (weekLabel) weekLabel.hidden = false;
      weekEl.innerHTML = week
        .map(function (row) {
          return (
            '<article class="loot-week-row">' +
            '<span class="loot-day">' + STF.esc(row.day || "") + "</span>" +
            "<span>" + STF.esc(row.highlight || "") + "</span>" +
            "</article>"
          );
        })
        .join("");
    }

    if (noteEl) {
      var bits = [];
      if (loot.note) bits.push(loot.note);
      bits.push("Listed from the clan JSON. Confirm the live rotation in-game before you farm.");
      noteEl.textContent = bits.join(" ");
    }
  } catch (err) {
    list.innerHTML = '<p class="lede">Could not load targeted loot.</p>';
    console.error(err);
  }
})();
