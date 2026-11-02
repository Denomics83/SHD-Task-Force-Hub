/* Updates — list cards plus a notification-style detail. */
(async function () {
  STF.mountChrome("updates");
  var feed = document.getElementById("update-feed");
  var detail = document.getElementById("update-detail");
  if (!feed || !detail) return;

  var ALLOWED = { announcement: 1, maintenance: 1, patch: 1, reminder: 1 };
  var byId = {};

  var BELL =
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 3.2a1 1 0 0 1 1 .95V4.9a5.5 5.5 0 0 1 4.4 5.4v2.7l1.2 2a.95.95 0 0 1-.8 1.45H6.2a.95.95 0 0 1-.8-1.45l1.2-2V10.3A5.5 5.5 0 0 1 11 4.9v-.75a1 1 0 0 1 1-.95z"/><path fill="currentColor" d="M9.35 17.7a2.65 2.65 0 0 0 5.3 0h-5.3z"/></svg>';
  var GLYPH = {
    announcement: BELL,
    reminder: BELL,
    maintenance:
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" d="M14.2 6.2 17.8 9.8l2.2-2.2a4.6 4.6 0 0 1-6.2 6.1L7.2 20.3a1.6 1.6 0 0 1-2.3-2.3l6.6-6.6a4.6 4.6 0 0 1 6.1-6.2z"/></svg>',
    patch:
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v8M8.5 9.2 12 12.7l3.5-3.5M6 18.5h12"/></svg>'
  };

  function iconHTML(type) {
    var face = iconType(type);
    return '<div class="upd-ico ' + face + '" aria-hidden="true">' + (GLYPH[face] || "") + "</div>";
  }

  function iconType(type) {
    return type === "reminder" ? "announcement" : type;
  }

  function safeImage(src) {
    var value = String(src || "").trim();
    return /^https?:\/\/\S+$/i.test(value) ? value : "";
  }

  function isTimestamp(iso) {
    return /T/.test(String(iso || ""));
  }

  function localDate(iso) {
    if (!iso || !isTimestamp(iso)) return null;
    var date = new Date(iso);
    return isNaN(date.getTime()) ? null : date;
  }

  function formatLocal(iso, options) {
    var date = localDate(iso);
    if (!date) return "";
    return new Intl.DateTimeFormat("en-AU", options).format(date);
  }

  function shortDate(iso) {
    if (!iso) return "";
    if (isTimestamp(iso)) return formatLocal(iso, { day: "numeric", month: "short" });
    var full = STF.formatDate(iso);
    return full.replace(/ \d{4}$/, "");
  }

  function postedDate(iso) {
    if (!iso) return "";
    if (isTimestamp(iso)) return formatLocal(iso, { day: "numeric", month: "short", year: "numeric" });
    return STF.formatDate(iso);
  }

  function scheduleText(iso) {
    return formatLocal(iso, {
      weekday: "short",
      day: "numeric",
      month: "short",
      hour: "numeric",
      minute: "2-digit"
    });
  }

  function sortTime(item) {
    var raw = item.sortAt || item.date || "";
    if (isTimestamp(raw)) {
      var instant = new Date(raw).getTime();
      return isNaN(instant) ? 0 : instant;
    }
    var match = String(raw).match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!match) return 0;
    return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12).getTime();
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
          iconHTML(item.type) +
          "</a>"
        );
      })
      .join("");
  }

  function renderDetail(item) {
    var summary = item.summary || "";
    var posted = item.date ? "Posted " + postedDate(item.date) : "";
    var pill = item.schedule
      ? '<p class="upd-pill">' + STF.esc(item.schedule) + "</p>"
      : "";
    var image = item.image
      ? '<figure class="upd-banner"><img src="' + STF.esc(item.image) + '" alt="' + STF.esc(item.title || "") + '"></figure>'
      : "";
    var sections = item.bodyHtml
      ? '<div class="rich-html">' + STF.safeHTML(item.bodyHtml) + "</div>" +
        (item.patchHtml ? '<h2 class="upd-h is-accent">Patch notes</h2><div class="rich-html">' + STF.safeHTML(item.patchHtml) + "</div>" : "")
      : (item.sections || []).map(sectionHTML).join("");
    var sourceLabel = /ubisoft\.com/i.test(item.source || "") ? "Source: Ubisoft" : "Source";
    var source = item.source
      ? '<p class="upd-source"><a href="' + STF.esc(item.source) + '" target="_blank" rel="noopener noreferrer">' + sourceLabel + "</a></p>"
      : "";
    detail.innerHTML =
      '<div class="upd-detail-head">' + iconHTML(item.type) +
      "<h1>" + STF.esc(item.title) + "</h1></div>" +
      (summary ? '<p class="upd-summary">' + STF.esc(summary) + "</p>" : "") +
      (posted ? '<p class="upd-posted">' + STF.esc(posted) + "</p>" : "") +
      pill +
      image +
      sections +
      source;
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
    var items = [];
    if (!STF.sb) throw new Error("Supabase did not load.");
    var remote = await STF.sb.from("updates").select("*").order("published_at", { ascending: false });
    if (remote.error) throw remote.error;
    (remote.data || []).forEach(function (row) {
      if (!ALLOWED[row.type]) return;
      items.push({
        id: row.id,
        type: row.type,
        title: row.title,
        summary: STF.plainText(row.body_html),
        date: row.published_at || "",
        sortAt: row.published_at || row.scheduled_at || "",
        schedule: scheduleText(row.scheduled_at),
        image: safeImage(row.image_url),
        source: safeImage(row.source_url),
        bodyHtml: row.body_html || "",
        patchHtml: row.patch_notes_html || "",
        priority: 0
      });
    });
    items.sort(function (a, b) {
      return sortTime(b) - sortTime(a) || ((a.priority || 99) - (b.priority || 99));
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
