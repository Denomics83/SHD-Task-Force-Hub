/* Updates home — announcement, maintenance, and patch only. */
(async function () {
  STF.mountChrome("updates");
  var feed = document.getElementById("update-feed");
  if (!feed) return;

  var ALLOWED = { announcement: 1, maintenance: 1, patch: 1 };

  var GLYPH = {
    announcement:
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#fff" d="M4 9.2v5.6h3.2L13.2 18.6V5.4L7.2 9.2H4z"/><path fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round" d="M16.2 9a3.5 3.5 0 0 1 0 6M18.6 6.6a6.6 6.6 0 0 1 0 10.8"/></svg>',
    maintenance:
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#fff" d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l2.5-2.5a5.5 5.5 0 0 1-7.2 7.1L6.8 20.1a2 2 0 0 1-2.9-2.9l6.2-6.2a5.5 5.5 0 0 1 7.1-7.2l-2.5 2.5z"/></svg>',
    patch:
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" d="M12 4v9"/><path fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" d="m8 9 4 4 4-4"/><path fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round" d="M5 18h14"/></svg>'
  };

  try {
    var news = await STF.fetchJSON("data/news.json");
    var items = (news.items || [])
      .filter(function (item) { return ALLOWED[item.type]; })
      .slice()
      .sort(function (a, b) {
        return (a.priority || 99) - (b.priority || 99);
      });

    if (!items.length) {
      feed.innerHTML = '<p class="lede">No updates yet.</p>';
      return;
    }

    feed.innerHTML = items
      .map(function (item) {
        var type = item.type;
        var href = item.href || "";
        var tag = href ? "a" : "article";
        var hrefAttr = href ? ' href="' + STF.esc(href) + '"' : "";
        var desc = item.body || item.subtitle || "";
        return (
          "<" + tag + ' class="upd-entry"' + hrefAttr + ">" +
          "<div>" +
          "<h2>" + STF.esc(item.title) + "</h2>" +
          (desc ? '<p class="upd-desc">' + STF.esc(desc) + "</p>" : "") +
          "</div>" +
          '<div class="upd-ico ' + type + '" aria-hidden="true">' + GLYPH[type] + "</div>" +
          "</" + tag + ">"
        );
      })
      .join("");
  } catch (err) {
    feed.innerHTML = '<p class="lede">Could not load updates.</p>';
    console.error(err);
  }
})();
