(async function () {
  STF.mountChrome("events", "Events");
  const feed = document.getElementById("event-feed");
  const lootEl = document.getElementById("loot-today");
  const escEl = document.getElementById("escalations-today");
  if (!feed) return;

  try {
    const [news, loot, esc] = await Promise.all([
      STF.fetchJSON("data/news.json"),
      STF.fetchJSON("data/loot.json"),
      STF.fetchJSON("data/escalations.json")
    ]);

    if (lootEl) {
      const rows = (loot.today || [])
        .map(function (r) {
          return "<li><span>" + STF.esc(r.zone) + '</span><span class="muted">' + STF.esc(r.loot) + "</span></li>";
        })
        .join("");
      lootEl.innerHTML =
        "<h3>Targeted loot · today</h3><ul>" + rows + "</ul>" +
        '<p class="muted" style="margin:8px 0 0">Week of ' + STF.esc(loot.weekOf || "—") + ". " + STF.esc(loot.note || "") + "</p>";
    }

    if (escEl) {
      const rows = (esc.items || [])
        .map(function (r) {
          return "<li><span>" + STF.esc(r.name) + '</span><span class="muted">' + STF.esc(r.difficulty) + "</span></li>";
        })
        .join("");
      escEl.innerHTML =
        "<h3>Weekly escalations</h3><ul>" + rows + "</ul>" +
        '<p class="muted" style="margin:8px 0 0">' + STF.esc(esc.note || "") + "</p>";
    }

    const items = (news.items || []).slice().sort(function (a, b) {
      return (a.priority || 99) - (b.priority || 99);
    });

    feed.innerHTML = items
      .map(function (item) {
        const isSeason = item.type === "season";
        const href = item.href || (isSeason ? "season.html" : null);
        const tag = href ? "a" : "article";
        const hrefAttr = href ? ' href="' + STF.esc(href) + '"' : "";
        const accent = "accent-" + (item.accent || "orange");
        const seasonCls = isSeason ? " season-card" : "";
        const badgeCls = item.type || "";
        const cta = href
          ? '<span class="event-cta">' + (isSeason ? "Open season detail →" : "Details →") + "</span>"
          : "";
        return (
          "<" + tag + ' class="event-card ' + accent + seasonCls + '"' + hrefAttr + ">" +
          '<div class="event-top">' +
          '<span class="ev-badge ' + badgeCls + '">' + STF.esc(item.badge || item.type) + "</span>" +
          '<span class="ev-date">' + STF.esc(item.date || "") + "</span></div>" +
          "<h2>" + STF.esc(item.title) + "</h2>" +
          (item.subtitle ? '<p class="sub">' + STF.esc(item.subtitle) + "</p>" : "") +
          "<p>" + STF.esc(item.body) + "</p>" +
          cta +
          "</" + tag + ">"
        );
      })
      .join("");
  } catch (err) {
    feed.innerHTML = '<p class="lede">Could not load events. Open via a local server (see README).</p>';
    console.error(err);
  }
})();
