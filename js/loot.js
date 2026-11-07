/* Proto: targeted loot (default) and the mutator list. */
(function () {
  STF.mountChrome("loot");
  var root = document.getElementById("loot-screen");
  var mutatorsBody = document.getElementById("mutators-body");
  var panels = {
    loot: document.getElementById("tab-loot"),
    mutators: document.getElementById("tab-mutators")
  };
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

  function renderMutators(doc) {
    var groups = (doc && doc.groups) || [];
    mutatorsBody.innerHTML = groups.map(function (group) {
      var rows = (group.items || []).map(function (item) {
        var lines = (item.lines || []).map(function (line) {
          return (
            '<p class="mut-line tint-' + STF.esc(line.color || "") + '"><b>' + STF.esc(line.label || "") + "</b> " +
            STF.esc(line.effect || "") + "<span>" + STF.esc(line.clear || "") + "</span></p>"
          );
        }).join("");
        return (
          '<article class="mut-item">' +
          '<button type="button" class="mut-row" aria-expanded="false">' +
          '<img src="' + STF.esc(item.icon || "") + '" alt="">' +
          "<strong>" + STF.esc(item.name || "") + "</strong></button>" +
          '<div class="mut-panel"><p>' + STF.esc(item.description || "") + "</p>" + lines + "</div></article>"
        );
      }).join("");
      return '<h2 class="mut-label">' + STF.esc(group.label || "") + "</h2>" + rows;
    }).join("") || '<p class="lede">No mutators yet.</p>';
  }

  function loadMutators() {
    if (!mutatorsBody || mutatorsBody.dataset.ready) return;
    STF.fetchJSON("data/mutators.json").then(function (doc) {
      mutatorsBody.dataset.ready = "1";
      renderMutators(doc);
    }).catch(function () {
      mutatorsBody.innerHTML = '<p class="lede">Could not load mutators.</p>';
    });
  }

  function tabFromLocation() {
    return new URLSearchParams(location.search).get("tab") === "mutators" ? "mutators" : "loot";
  }

  function showTab(tab, push) {
    if (tab !== "loot" && tab !== "mutators") tab = "loot";
    Object.keys(panels).forEach(function (key) {
      if (panels[key]) panels[key].hidden = key !== tab;
    });
    document.querySelectorAll(".res-tabs [data-tab]").forEach(function (btn) {
      btn.setAttribute("aria-selected", btn.getAttribute("data-tab") === tab ? "true" : "false");
    });
    if (tab === "mutators") loadMutators();
    if (push) {
      history.pushState({ tab: tab }, "", tab === "loot" ? "loot.html" : "loot.html?tab=mutators");
    }
    window.scrollTo(0, 0);
  }

  document.querySelector(".res-tabs").addEventListener("click", function (e) {
    var btn = e.target.closest("[data-tab]");
    if (!btn) return;
    showTab(btn.getAttribute("data-tab"), true);
  });

  if (mutatorsBody) {
    mutatorsBody.addEventListener("click", function (e) {
      var row = e.target.closest(".mut-row");
      if (!row || !mutatorsBody.contains(row)) return;
      var item = row.closest(".mut-item");
      var open = item.classList.contains("is-open");
      mutatorsBody.querySelectorAll(".mut-item.is-open").forEach(function (el) {
        el.classList.remove("is-open");
        var btn = el.querySelector(".mut-row");
        if (btn) btn.setAttribute("aria-expanded", "false");
      });
      if (!open) {
        item.classList.add("is-open");
        row.setAttribute("aria-expanded", "true");
      }
    });
  }

  window.addEventListener("popstate", function () {
    showTab(tabFromLocation(), false);
  });

  showTab(tabFromLocation(), false);

  (async function loadLoot() {
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
})();
