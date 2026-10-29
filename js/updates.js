/* Updates home — news list from data/news.json */
(async function () {
  STF.mountChrome("updates");
  var feed = document.getElementById("update-feed");
  if (!feed) return;

  var GLYPH = {
    announcement:
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#fff" d="M4 9.4v5.2h3.1L13 18.2V5.8L7.1 9.4H4z"/><path fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round" d="M16 9.1a3.4 3.4 0 0 1 0 5.8M18.5 6.8a6.4 6.4 0 0 1 0 10.4"/></svg>',
    patch:
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#fff" d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l2.5-2.5a5.5 5.5 0 0 1-7.2 7.1L6.8 20.1a2 2 0 0 1-2.9-2.9l6.2-6.2a5.5 5.5 0 0 1 7.1-7.2l-2.5 2.5z"/></svg>',
    season:
      '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3.4" fill="none" stroke="#fff" stroke-width="1.8"/><path fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round" d="M12 2.4v2.2M12 19.4v2.2M4.6 4.6l1.6 1.6M17.8 17.8l1.6 1.6M2.4 12h2.2M19.4 12h2.2M4.6 19.4l1.6-1.6M17.8 6.2l1.6-1.6"/></svg>',
    event:
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="#fff" stroke-width="1.8" stroke-linejoin="round" d="M12 3.2 20 6.4v5.4c0 4.6-3.3 7.4-8 8.8-4.7-1.4-8-4.2-8-8.8V6.4L12 3.2z"/></svg>',
    dxp:
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#fff" d="M13 2 4.5 13.2h6.2L9.8 22 19 10.2h-6.3L13 2z"/></svg>'
  };

  var TONE = {
    announcement: "news",
    patch: "patch",
    season: "season",
    event: "event",
    dxp: "dxp"
  };

  try {
    var news = await STF.fetchJSON("data/news.json");
    var items = (news.items || []).slice().sort(function (a, b) {
      return (a.priority || 99) - (b.priority || 99);
    });

    if (!items.length) {
      feed.innerHTML = '<p class="lede">No updates yet.</p>';
      return;
    }

    feed.innerHTML = items
      .map(function (item) {
        var type = item.type || "announcement";
        var href = item.href || (type === "season" ? "season.html" : "");
        var tag = href ? "a" : "article";
        var hrefAttr = href ? ' href="' + STF.esc(href) + '"' : "";
        var desc = item.body || item.subtitle || "";
        var when = item.date ? STF.formatDate(item.date) : "";
        var glyph = GLYPH[type] || GLYPH.announcement;
        var tone = TONE[type] || "news";
        return (
          "<" + tag + ' class="upd-entry"' + hrefAttr + ">" +
          "<div>" +
          '<span class="upd-chip">' + STF.esc(item.badge || type) + "</span>" +
          "<h2>" + STF.esc(item.title) + "</h2>" +
          (desc ? '<p class="upd-desc">' + STF.esc(desc) + "</p>" : "") +
          (when ? '<time datetime="' + STF.esc(item.date) + '">' + STF.esc(when) + "</time>" : "") +
          "</div>" +
          '<div class="upd-ico ' + tone + '" aria-hidden="true">' + glyph + "</div>" +
          "</" + tag + ">"
        );
      })
      .join("");
  } catch (err) {
    feed.innerHTML = '<p class="lede">Could not load updates.</p>';
    console.error(err);
  }
})();
