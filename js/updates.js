/* Updates — list cards plus a notification-style detail. */
(async function () {
  STF.mountChrome("updates");
  var feed = document.getElementById("update-feed");
  var detail = document.getElementById("update-detail");
  if (!feed || !detail) return;

  var ALLOWED = { announcement: 1, maintenance: 1, patch: 1, reminder: 1 };
  var byId = {};

  var GLYPH = {
    announcement:
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" d="M4 10h3.2L13 16.2V7.8L7.2 10H4z"/><path fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" d="M16 9.2a3.2 3.2 0 0 1 0 5.6"/></svg>',
    maintenance:
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" d="M14.2 6.2 17.8 9.8l2.2-2.2a4.6 4.6 0 0 1-6.2 6.1L7.2 20.3a1.6 1.6 0 0 1-2.3-2.3l6.6-6.6a4.6 4.6 0 0 1 6.1-6.2z"/></svg>',
    patch:
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v8M8.5 9.2 12 12.7l3.5-3.5M6 18.5h12"/></svg>',
    reminder:
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="1.6" d="M12 4.2a6.2 6.2 0 0 1 6.2 6.2v3.1l1.3 2.2H4.5l1.3-2.2V10.4A6.2 6.2 0 0 1 12 4.2z"/><path fill="none" stroke="currentColor" stroke-width="1.6" d="M10 18.2a2 2 0 0 0 4 0"/></svg>'
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
    var sections = item.bodyHtml
      ? '<div class="rich-html">' + STF.safeHTML(item.bodyHtml) + "</div>" +
        (item.patchHtml ? '<h2 class="upd-h is-accent">Patch notes</h2><div class="rich-html">' + STF.safeHTML(item.patchHtml) + "</div>" : "")
      : (item.sections || []).map(sectionHTML).join("");
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
      .slice();
    if (STF.sb) {
      var remote = await STF.sb.from("updates").select("*").order("published_at", { ascending: false });
      if (!remote.error) {
        (remote.data || []).forEach(function (row) {
          items.push({
            id: row.id,
            type: row.type,
            title: row.title,
            summary: STF.plainText(row.body_html),
            date: (row.published_at || "").slice(0, 10),
            schedule: row.scheduled_at ? new Date(row.scheduled_at).toLocaleString() : "",
            bodyHtml: row.body_html || "",
            patchHtml: row.patch_notes_html || "",
            priority: 0
          });
        });
      }
    }
    items.sort(function (a, b) {
      return String(b.date || "").localeCompare(String(a.date || "")) || ((a.priority || 99) - (b.priority || 99));
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
