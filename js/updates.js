/* Updates — list cards plus a notification-style detail. */
(async function () {
  STF.mountChrome("updates");
  var feed = document.getElementById("update-feed");
  var detail = document.getElementById("update-detail");
  if (!feed || !detail) return;

  var ALLOWED = { announcement: 1, maintenance: 1, patch: 1 };
  var byId = {};

  var GLYPH = {
    announcement:
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#fff" d="M4 9.2v5.6h3.2L13.2 18.6V5.4L7.2 9.2H4z"/><path fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round" d="M16.2 9a3.5 3.5 0 0 1 0 6M18.6 6.6a6.6 6.6 0 0 1 0 10.8"/></svg>',
    maintenance:
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#fff" d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l2.5-2.5a5.5 5.5 0 0 1-7.2 7.1L6.8 20.1a2 2 0 0 1-2.9-2.9l6.2-6.2a5.5 5.5 0 0 1 7.1-7.2l-2.5 2.5z"/></svg>',
    patch:
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" d="M12 4v9"/><path fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" d="m8 9 4 4 4-4"/><path fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round" d="M5 18h14"/></svg>'
  };

  function shortDate(iso) {
    var full = STF.formatDate(iso);
    return full.replace(/ \d{4}$/, "");
  }

  function blockHTML(block) {
    var html = "";
    if (block.heading) html += '<h3 class="upd-sub">' + STF.esc(block.heading) + "</h3>";
    if (block.text) html += "<p>" + STF.esc(block.text) + "</p>";
    if (block.bullets && block.bullets.length) {
      html += "<ul>" + block.bullets.map(function (line) {
        return "<li>" + STF.esc(line) + "</li>";
      }).join("") + "</ul>";
    }
    return html;
  }

  function sectionHTML(section) {
    var title = section.title
      ? '<h2 class="upd-h' + (section.accent ? " is-accent" : "") + '">' + STF.esc(section.title) + "</h2>"
      : "";
    var blocks = (section.blocks || []).map(blockHTML).join("");
    return "<section>" + title + blocks + "</section>";
  }

  function renderList(items) {
    feed.innerHTML = items
      .map(function (item) {
        var desc = item.summary || item.body || "";
        var when = item.date ? shortDate(item.date) : "";
        return (
          '<a class="upd-entry" href="#' + STF.esc(item.id) + '">' +
          "<div>" +
          "<h2>" + STF.esc(item.title) + "</h2>" +
          (desc ? '<p class="upd-desc">' + STF.esc(desc) + "</p>" : "") +
          (when ? '<time class="upd-stamp" datetime="' + STF.esc(item.date) + '">' + STF.esc(when) + "</time>" : "") +
          "</div>" +
          '<div class="upd-ico ' + item.type + '" aria-hidden="true">' + GLYPH[item.type] + "</div>" +
          "</a>"
        );
      })
      .join("");
  }

  function renderDetail(item) {
    var summary = item.summary || "";
    var posted = item.date ? "Posted " + STF.formatDate(item.date) : "";
    var pill = item.schedule
      ? '<p class="upd-pill">' + STF.esc(item.schedule) + "</p>"
      : "";
    var image = item.image && item.image.src
      ? '<figure class="upd-banner"><img src="' + STF.esc(item.image.src) + '" alt="' + STF.esc(item.image.alt || "") + '"></figure>'
      : "";
    var sections = (item.sections || []).map(sectionHTML).join("");
    var seasonLink = item.id === "ann-season-window"
      ? '<p class="upd-more"><a href="season.html">Season detail — manhunts, maps, modifiers</a></p>'
      : "";
    var demo = item.demo
      ? '<p class="upd-demo">Demo copy for layout. Not an official title update.</p>'
      : "";
    detail.innerHTML =
      "<h1>" + STF.esc(item.title) + "</h1>" +
      (summary ? '<p class="upd-summary">' + STF.esc(summary) + "</p>" : "") +
      (posted ? '<p class="upd-posted">' + STF.esc(posted) + "</p>" : "") +
      pill +
      image +
      sections +
      seasonLink +
      demo;
  }

  function setHeaderBack(on) {
    var top = document.querySelector(".topbar");
    var pill = document.querySelector(".hub-pill");
    var back = document.getElementById("upd-back");
    if (pill) pill.hidden = !!on;
    if (!on) {
      if (back) back.remove();
      return;
    }
    if (back || !top) return;
    back = document.createElement("button");
    back.type = "button";
    back.id = "upd-back";
    back.className = "upd-header-back";
    back.setAttribute("aria-label", "Back to Updates");
    back.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5 8 12l7 7" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    back.addEventListener("click", function () {
      if (location.hash) history.pushState({}, "", "index.html");
      showList();
    });
    top.appendChild(back);
  }

  function showList() {
    feed.hidden = false;
    detail.hidden = true;
    detail.innerHTML = "";
    setHeaderBack(false);
    window.scrollTo(0, 0);
  }

  function showDetail(id) {
    var item = byId[id];
    if (!item) return showList();
    renderDetail(item);
    feed.hidden = true;
    detail.hidden = false;
    setHeaderBack(true);
    window.scrollTo(0, 0);
  }

  function route() {
    var id = (location.hash || "").replace("#", "");
    if (id && byId[id]) showDetail(id);
    else showList();
  }

  try {
    var news = await STF.fetchJSON("data/news.json");
    var items = (news.items || [])
      .filter(function (item) { return ALLOWED[item.type]; })
      .slice()
      .sort(function (a, b) {
        return (a.priority || 99) - (b.priority || 99);
      });
    items.forEach(function (item) { byId[item.id] = item; });

    if (!items.length) {
      feed.innerHTML = '<p class="lede">No updates yet.</p>';
      return;
    }

    renderList(items);
    window.addEventListener("hashchange", route);
    route();
  } catch (err) {
    feed.innerHTML = '<p class="lede">Could not load updates.</p>';
    console.error(err);
  }
})();
