/* Events — season banner and admin-created events. */
(async function () {
  STF.mountChrome("events");
  var rail = document.getElementById("hero-rail");
  if (!rail) return;

  function endedAgo(iso) {
    var days = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86400000));
    return "Event Ended " + days + (days === 1 ? " day ago" : " days ago");
  }

  function shownReward(text) {
    var value = String(text || "").trim();
    if (!value || value === "add details" || value === "details coming soon") return "";
    return value;
  }

  function eventRemainLabel(startIso, endIso, now) {
    now = now || Date.now();
    var start = new Date(startIso).getTime();
    var end = new Date(endIso).getTime();
    function parts(ms) {
      var mins = Math.floor(Math.max(0, ms) / 60000);
      var days = Math.floor(mins / (60 * 24));
      var hours = Math.floor((mins % (60 * 24)) / 60);
      var rem = mins % 60;
      if (days > 0) return days + "d " + hours + "h";
      if (hours > 0) return hours + "h " + rem + "m";
      return (ms > 0 && rem < 1 ? 1 : rem) + "m";
    }
    if (!(start > 0) || !(end > 0)) return "";
    if (now >= end) return "Ended";
    if (now < start) return "Starts in " + parts(start - now);
    return parts(end - now);
  }

  function safePhoto(src) {
    var value = String(src || "");
    if (/season-hero|raid-hero/.test(value)) return "";
    if (/^assets\/[a-z0-9._/-]+$/i.test(value)) return value;
    if (/^https:\/\/egojdxwpfjfwihykhnik\.supabase\.co\/storage\/v1\/object\/public\/media\/[A-Za-z0-9._~/-]+$/.test(value)) return value;
    return "";
  }

  var EMBLEMS = {
    "assault": "assets/events/assault.webp",
    "ambush": "assets/events/ambush.webp",
    "shd-exposed": "assets/events/shd-exposed.webp",
    "vanguard-overdrive": "assets/events/vanguard-overdrive.webp",
    "redline-overdrive": "assets/events/redline-overdrive.webp",
    "deadeye-overdrive": "assets/events/deadeye-overdrive.webp",
    "tech-overdrive": "assets/events/tech-overdrive.webp",
    "expertise-surge": "assets/events/expertise-surge.webp",
    "optimization-surge": "assets/events/optimization-surge.webp",
    "retaliation-surge": "assets/events/retaliation-surge.webp",
    "dark-zone-surge": "assets/events/dark-zone-surge.webp",
    "countdown-surge": "assets/events/countdown-surge.webp",
    "prototype-surge": "assets/events/prototype-surge.webp",
    "proficiency-xp": "assets/events/proficiency-xp.webp",
    "proficiency-xp-event": "assets/events/proficiency-xp.webp",
    "xp-x5": "assets/events/xp-x5.webp",
    "x5-xp": "assets/events/xp-x5.webp",
    "x5-xp-event": "assets/events/xp-x5.webp",
    "shepherd-xp": "assets/events/shepherd-xp.webp",
    "red-moon-unleashed": "assets/events/red-moon-unleashed.webp",
    "red-moon-rising": "assets/events/red-moon-rising.webp",
    "creator-collaboration": "assets/events/creator-collaboration.webp",
    "raid": "assets/events/raid.webp"
  };

  function titleSlug(name) {
    return String(name || "")
      .toLowerCase()
      .replace(/:.*/, "")
      .replace(/&/g, " ")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  }

  function emblemSrc(item) {
    var type = (item && item.type) || {};
    var override = safePhoto(type.image_url || "");
    if (override) return override;
    if (item && item.kind === "clan" && STF.clanGateArt) {
      var gate = STF.clanGateArt(type.activityType);
      if (gate) return gate;
    }
    var card = "";
    if (STF.eventCardPath && (!item || item.kind !== "special")) {
      card = STF.eventCardPath(type.id) ||
        STF.eventCardPath(type.name) ||
        STF.eventCardPath(item && item.title) ||
        STF.eventCardPath(item && item.activity);
    }
    if (card) return card;
    if (type.emblem || type.image) {
      var stored = safePhoto(type.emblem || type.image);
      if (stored) return stored;
    }
    var slug = titleSlug(type.name || item.title || "");
    if (EMBLEMS[type.id]) return EMBLEMS[type.id];
    if (EMBLEMS[slug]) return EMBLEMS[slug];
    if (/overdrive/.test(slug)) {
      if (/redline/.test(slug)) return EMBLEMS["redline-overdrive"];
      if (/deadeye/.test(slug)) return EMBLEMS["deadeye-overdrive"];
      if (/tech/.test(slug)) return EMBLEMS["tech-overdrive"];
      return EMBLEMS["vanguard-overdrive"];
    }
    if (/surge/.test(slug)) {
      if (/expertise/.test(slug)) return EMBLEMS["expertise-surge"];
      if (/optimi/.test(slug)) return EMBLEMS["optimization-surge"];
      if (/retali/.test(slug)) return EMBLEMS["retaliation-surge"];
      if (/countdown/.test(slug)) return EMBLEMS["countdown-surge"];
      if (/prototype/.test(slug)) return EMBLEMS["prototype-surge"];
      if (/dark-zone|darkzone/.test(slug)) return EMBLEMS["dark-zone-surge"];
      return EMBLEMS["prototype-surge"];
    }
    if (/shepherd/.test(slug)) return EMBLEMS["shepherd-xp"];
    if (/proficiency/.test(slug)) return EMBLEMS["proficiency-xp"];
    if (/x5|xp-event|season-pass-xp/.test(slug)) return EMBLEMS["xp-x5"];
    if (item.kind === "raid") return EMBLEMS.raid;
    return "assets/events/emblem-placeholder.webp";
  }

  function stripSourceHTML(html) {
    var node = document.createElement("div");
    node.innerHTML = STF.safeHTML(html || "");
    Array.prototype.forEach.call(node.querySelectorAll("p, li, div"), function (el) {
      if (/^\s*source\s*:/i.test(el.textContent || "")) el.remove();
    });
    return node.innerHTML;
  }

  function isPlaceholder(text) {
    var value = String(text || "").trim().toLowerCase();
    return !value || value === "add details" || value === "details coming soon" || value === "confirm in-game";
  }

  function splitBits(text) {
    return String(text || "")
      .split(/\s*[·\n]\s*/)
      .map(function (line) { return line.trim(); })
      .filter(function (line) { return line && !isPlaceholder(line); });
  }

  function categoryFor(item) {
    var type = (item && item.type) || {};
    if (type.category) return type.category;
    if (item.kind === "special") return "Special Event";
    if (item.kind === "clan") {
      if (type.activityType === "dark-zone") return "Dark Zone Event";
      if (type.activityType === "pvp") return "Conflict";
      return "Clan";
    }
    if (item.kind === "raid") return "Raid";
    var name = String(type.name || "").toLowerCase();
    if (/assault|ambush|shd exposed|reanimated|golden bullet|polarity/.test(name)) return "Global Event";
    return "Season Event";
  }

  function clockParts(ms) {
    var mins = Math.floor(Math.max(0, ms) / 60000);
    var days = Math.floor(mins / 1440);
    var hours = Math.floor((mins % 1440) / 60);
    var rem = mins % 60;
    if (days > 0) return days + "d " + hours + "h";
    if (hours > 0) return hours + "h " + rem + "m";
    return Math.max(1, rem) + "m";
  }

  function tickerFor(item) {
    var now = Date.now();
    var start = new Date(item.start || item.remainStart || 0).getTime();
    var end = item.end || item.remainEnd ? new Date(item.end || item.remainEnd).getTime() : 0;
    var state = item.state;
    if (!state) {
      if (end && now >= end) state = "ended";
      else if (start && now < start) state = "upcoming";
      else state = "active";
    }
    if (state === "ended") return end ? "Ended " + clockParts(now - end) + " ago" : "Ended";
    if (state === "upcoming") return start ? "Starts in " + clockParts(start - now) : "Coming soon";
    return end ? clockParts(end - now) + " left" : "Live";
  }

  function statusLabel(state) {
    if (state === "ended") return "ENDED";
    if (state === "upcoming") return "COMING SOON";
    return "ONGOING";
  }

  function dateTag(iso, label) {
    if (!iso) return "";
    var date = new Date(iso);
    if (isNaN(date.getTime())) return "";
    var text = new Intl.DateTimeFormat("en-AU", {
      timeZone: "Australia/Melbourne",
      weekday: "short", day: "numeric", month: "short",
      hour: "numeric", minute: "2-digit"
    }).format(date);
    return '<span class="ev-date"><b>' + STF.esc(label) + "</b>" + STF.esc(text) + "</span>";
  }

  function paintRemain() {
    document.querySelectorAll("[data-ticker]").forEach(function (el) {
      if (el.getAttribute("data-static") === "1") return;
      el.textContent = tickerFor({
        start: el.getAttribute("data-remain-start"),
        end: el.getAttribute("data-remain-end"),
        state: el.getAttribute("data-state")
      });
    });
  }

  function countdownLabel(target) {
    var ms = target.getTime() - Date.now();
    if (ms <= 0) return "Started";
    var mins = Math.floor(ms / 60000);
    var days = Math.floor(mins / (60 * 24));
    var hours = Math.floor((mins - days * 24 * 60) / 60);
    var rem = mins % 60;
    function n(v, word) {
      return v + " " + word + (v === 1 ? "" : "s");
    }
    if (days > 0) return n(days, "day") + " " + n(hours, "hour") + " remaining";
    if (hours > 0) return n(hours, "hour") + " " + n(rem, "min") + " remaining";
    return n(Math.max(rem, 1), "min") + " remaining";
  }

  function dots(index, count) {
    var html = '<div class="hero-dots" aria-hidden="true">';
    for (var i = 0; i < count; i++) {
      html += '<span class="' + (i === index ? "on" : "") + '"></span>';
    }
    return html + "</div>";
  }

  function emblemKind(id) {
    if (id === "red-moon-unleashed") return "moon";
    if (id === "expertise-surge") return "shield";
    if (id === "vanguard-overdrive") return "hex";
    return "shield";
  }

  function emblemSVG(kind) {
    var paths = {
      moon: '<path fill="currentColor" d="M14.6 4.4c-3.8.9-6.5 4.2-6.5 7.8 0 3.6 2.7 6.9 6.5 7.8-4.6-.5-8.1-4.2-8.1-7.8s3.5-7.3 8.1-7.8z"/>',
      shield: '<path d="M12 3.2 19.2 6.1v5.6c0 3.8-2.8 6.4-7.2 7.8-4.4-1.4-7.2-4-7.2-7.8V6.1z" fill="none" stroke="currentColor" stroke-width="1.6"/>',
      hex: '<path d="M12 3.4 19 7.4v9.2L12 20.6 5 16.6V7.4z" fill="none" stroke="currentColor" stroke-width="1.6"/><circle cx="12" cy="12" r="2.1" fill="currentColor"/>',
      wings: '<path d="M12 14.2 3.8 8.6c2.4 3.2 5 4.6 8.2 5.2 3.2-.6 5.8-2 8.2-5.2z" fill="currentColor"/>',
      raid: '<circle cx="12" cy="12" r="3.1" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M12 3.6v3.2M12 17.2v3.2M3.6 12h3.2M17.2 12h3.2" stroke="currentColor" stroke-width="1.6"/>',
      season: '<path d="M12 3.8 14.4 9l5.4.6-4 3.6 1.1 5.2L12 16.2 7.1 18.4 8.2 13.2 4.2 9.6 9.6 9z" fill="currentColor"/>'
    };
    return '<svg viewBox="0 0 24 24" aria-hidden="true">' + (paths[kind] || paths.shield) + "</svg>";
  }

  var detail = document.getElementById("event-detail");
  var catalog = [];

  function melbourneRange(start, end) {
    var fmt = new Intl.DateTimeFormat("en-AU", {
      timeZone: "Australia/Melbourne",
      day: "numeric", month: "short", hour: "numeric", minute: "2-digit"
    });
    function part(iso) {
      var date = new Date(iso);
      return isNaN(date.getTime()) ? "" : fmt.format(date);
    }
    var left = part(start);
    var right = part(end);
    if (left && right) return left + " – " + right + " Melbourne";
    return (left || right) + (left || right ? " Melbourne" : "");
  }

  function setEventsBack(on) {
    var top = document.querySelector(".topbar");
    var pill = document.querySelector(".hub-pill");
    var back = document.getElementById("events-back");
    if (pill) pill.hidden = !!on;
    document.body.classList.toggle("is-event-detail", !!on);
    if (!on) {
      if (back) back.remove();
      return;
    }
    if (back || !top) return;
    back = document.createElement("button");
    back.type = "button";
    back.id = "events-back";
    back.className = "upd-header-back";
    back.setAttribute("aria-label", "Back to Events");
    back.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5 8 12l7 7" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    back.addEventListener("click", function () {
      if (location.hash) history.pushState({}, "", "events.html");
      showRail();
    });
    top.appendChild(back);
  }

  function showRail() {
    var screen = document.getElementById("tl-screen");
    if (screen) screen.hidden = false;
    rail.hidden = false;
    if (detail) {
      detail.hidden = true;
      detail.innerHTML = "";
    }
    setEventsBack(false);
  }

  function melWhen(iso) {
    return new Intl.DateTimeFormat("en-AU", {
      timeZone: "Australia/Melbourne",
      weekday: "short", day: "numeric", month: "short", year: "numeric",
      hour: "numeric", minute: "2-digit"
    }).format(new Date(iso)) + " Melbourne";
  }

  function detailCountdown(item) {
    var now = Date.now();
    var start = new Date(item.start).getTime();
    var end = new Date(item.end).getTime();
    if (now >= end) return "Ended";
    if (now < start) return countdownLabel(new Date(item.start)).replace(/ remaining$/, " until start");
    return countdownLabel(new Date(item.end));
  }

  async function paintAttendance(item) {
    var box = document.getElementById("attendance-box");
    if (!box || !STF.sb) return;
    var pack = await STF.profile();
    var actions = box.querySelector(".attendance-actions");
    var list = box.querySelector(".attendance-going");
    if (!pack || !pack.session) {
      actions.innerHTML = '<p class="lede">Sign in to confirm attendance.</p>';
      return;
    }
    if (!pack.profile || !pack.profile.is_member) {
      actions.innerHTML = '<p class="lede">Awaiting clan approval.</p>';
      return;
    }
    var mine = await STF.sb.from("attendance").select("status").eq("event_id", item.id).eq("user_id", pack.session.user.id).maybeSingle();
    var current = (mine.data && mine.data.status) || "";
    actions.innerHTML = ["going", "maybe", "out"].map(function (status) {
      var label = status === "going" ? "Going" : status === "maybe" ? "Maybe" : "Out";
      return '<button type="button" class="admin-btn admin-btn-ghost" data-attend="' + status + '"' + (current === status ? ' aria-pressed="true"' : "") + ">" + label + "</button>";
    }).join("");
    actions.onclick = async function (e) {
      var btn = e.target.closest("[data-attend]");
      if (!btn) return;
      var status = btn.getAttribute("data-attend");
      var write = await STF.sb.from("attendance").upsert({
        event_id: item.id,
        user_id: pack.session.user.id,
        status: status,
        updated_at: new Date().toISOString()
      }, { onConflict: "event_id,user_id" });
      if (write.error) {
        list.innerHTML = '<li>' + STF.esc(write.error.message) + "</li>";
        return;
      }
      paintAttendance(item);
    };
    var going = await STF.sb.from("attendance").select("status, profiles(gamer_tag)").eq("event_id", item.id).eq("status", "going");
    if (going.error) {
      list.innerHTML = "<li>" + STF.esc(going.error.message) + "</li>";
      return;
    }
    var names = (going.data || []).map(function (row) {
      return (row.profiles && row.profiles.gamer_tag) || "Agent";
    });
    list.innerHTML = names.length
      ? names.map(function (name) { return "<li>" + STF.esc(name) + "</li>"; }).join("")
      : "<li>Nobody marked going yet.</li>";
  }

  function showRemoteDetail(item) {
    showEventDetail(item);
  }

  STF.onAuth = function () {
    if (!document.getElementById("attendance-box")) return;
    var id = (location.hash || "").replace("#", "");
    var item = catalog.filter(function (row) { return row.id === id; })[0];
    if (item) paintAttendance(item);
  };

  function showEventDetail(item) {
    if (!detail || !item) return showRail();
    var type = item.type || {};
    var state = item.state || "active";
    var statusClass = state === "ended" ? "is-ended" : state === "upcoming" ? "is-soon" : "is-live";
    var buffs = splitBits(type.modifiers);
    var rules = splitBits(type.tasks);
    var note = !isPlaceholder(type.note) ? type.note : (!isPlaceholder(item.note) ? item.note : "");
    var showCopy = item.remote ? item.kind !== "rotation" : !!type.show_description;
    var copy = "";
    if (showCopy && item.remote && item.htmlDescription && STF.plainText(item.htmlDescription)) {
      copy = '<div class="rich-html ev-copy">' + stripSourceHTML(item.htmlDescription) + "</div>";
    } else if (showCopy && !isPlaceholder(type.description)) {
      copy = '<p class="ev-copy">' + STF.esc(type.description) + "</p>";
    }
    var buffHtml = buffs.length
      ? '<div class="ev-buffs">' + buffs.map(function (line) { return '<p class="ev-buff">' + STF.esc(line) + "</p>"; }).join("") + "</div>"
      : "";
    var ruleHtml = rules.length
      ? '<div class="ev-rules">' + rules.map(function (line) { return "<p>" + STF.esc(line) + "</p>"; }).join("") + "</div>"
      : "";
    var mapSrc = item.mapImage || "";
    var mapCaption = item.mapCaption || "";
    var mapBlock = mapSrc
      ? '<figure class="ev-map"><button type="button" class="map-shot" id="event-map-open">' +
        '<img src="' + STF.esc(mapSrc) + '" alt="' + STF.esc(mapCaption || "Event map") + '"></button>' +
        (mapCaption ? "<figcaption>" + STF.esc(mapCaption) + "</figcaption>" : "") +
        "</figure>"
      : "";
    detail.innerHTML =
      '<article class="ev-page">' +
      '<p class="ev-status-row"><span class="tl-tag ' + statusClass + '">' + statusLabel(state) + "</span></p>" +
      '<p class="ev-ticker" data-ticker data-state="' + STF.esc(state) + '" data-remain-start="' + STF.esc(item.start || "") + '" data-remain-end="' + STF.esc(item.end || "") + '">' + STF.esc(tickerFor(item)) + "</p>" +
      '<p class="ev-dates">' + dateTag(item.start, "Start") + dateTag(item.end, "End") + "</p>" +
      '<p class="ev-cat">' + STF.esc(categoryFor(item)) + "</p>" +
      "<h1>" + STF.esc(type.name || "Event") + "</h1>" +
      (note ? '<p class="ev-note">' + STF.esc(note) + "</p>" : "") +
      buffHtml +
      copy +
      ruleHtml +
      mapBlock +
      (item.kind === "clan"
        ? '<section class="attendance-box" id="attendance-box"><h2 class="upd-h">Attendance</h2><div class="attendance-actions"></div><ul class="attendance-going"></ul></section>'
        : "") +
      "</article>";
    var screen = document.getElementById("tl-screen");
    if (screen) screen.hidden = true;
    rail.hidden = true;
    detail.hidden = false;
    setEventsBack(true);
    var mapOpen = document.getElementById("event-map-open");
    if (mapOpen && mapSrc) {
      mapOpen.addEventListener("click", function () {
        STF.openMap(mapSrc, mapCaption);
      });
    }
    window.scrollTo(0, 0);
  }

  function routeEvent() {
    var id = (location.hash || "").replace("#", "");
    var item = catalog.filter(function (row) { return row.id === id; })[0];
    if (item) showEventDetail(item);
    else showRail();
  }

  try {
    var results = await Promise.all([
      STF.fetchJSON("data/season.json"),
      STF.fetchJSON("data/event-types.json").catch(function () { return { types: [] }; }),
      STF.fetchJSON("data/events.json").catch(function () { return { events: [] }; })
    ]);
    var season = results[0] || {};
    var typeById = {};
    ((results[1] && results[1].types) || []).forEach(function (type) { typeById[type.id] = type; });
    var now = Date.now();
    var joined = ((results[2] && results[2].events) || []).map(function (ev) {
      var startMs = new Date(ev.start).getTime();
      var endMs = new Date(ev.end).getTime();
      var state = now >= endMs ? "ended" : now < startMs ? "upcoming" : "active";
      var chip = state === "upcoming" ? countdownLabel(new Date(ev.start)) : state === "active" ? "Live" : "Ended";
      return {
        id: ev.id,
        type: typeById[ev.typeId] || { name: ev.typeId, description: "" },
        start: ev.start,
        end: ev.end,
        note: ev.note || "",
        mapImage: ev.mapImage || (typeById[ev.typeId] && typeById[ev.typeId].mapImage) || "",
        mapCaption: ev.mapCaption || (typeById[ev.typeId] && typeById[ev.typeId].mapCaption) || "",
        state: state,
        chip: chip
      };
    });
    if (STF.sb) {
      var remoteEvents = await STF.sb.from("events").select("*, event_templates(map_image, map_caption)").order("starts_at", { ascending: true });
      (remoteEvents.data || []).forEach(function (row) {
        var startMs = new Date(row.starts_at).getTime();
        var endMs = row.ends_at ? new Date(row.ends_at).getTime() : 0;
        var state = endMs && now >= endMs ? "ended" : now < startMs ? "upcoming" : "active";
        var chip = state === "upcoming" ? countdownLabel(new Date(row.starts_at)) : state === "active" ? "Live" : "Ended";
        var cardLabel = row.kind === "clan" ? "Clan" : row.kind === "special" ? "Special" : "Rotation";
        var templateMap = row.event_templates || {};
        joined.push({
          id: row.id,
          remote: true,
          kind: row.kind,
          htmlDescription: row.description_html || "",
          type: {
            id: row.kind,
            name: row.title,
            description: "",
            image_url: row.image_url || "",
            image: "",
            cardLabel: cardLabel,
            activityType: row.activity_type || "",
            accent: "#FF6D10"
          },
          start: row.starts_at,
          end: row.ends_at || "",
          note: "",
          mapImage: row.map_image || templateMap.map_image || "",
          mapCaption: row.map_caption || templateMap.map_caption || "",
          state: state,
          chip: chip
        });
      });
    }
    catalog = joined;
    var HISTORY_MS = 30 * 24 * 60 * 60 * 1000;
    function timeOf(value) {
      var ms = new Date(value || 0).getTime();
      return isNaN(ms) ? 0 : ms;
    }
    function byStart(a, b) {
      var diff = timeOf(a.start) - timeOf(b.start);
      if (diff) return diff;
      return timeOf(a.end) - timeOf(b.end);
    }
    var ended = joined.filter(function (row) {
      if (row.state !== "ended") return false;
      var endMs = timeOf(row.end);
      return endMs && now - endMs <= HISTORY_MS;
    }).sort(function (a, b) { return timeOf(a.end) - timeOf(b.end); });
    var active = joined.filter(function (row) { return row.state === "active"; }).sort(byStart);
    var upcoming = joined.filter(function (row) { return row.state === "upcoming"; }).sort(byStart);
    var focus = null;
    if (active.length) {
      focus = active.slice().sort(function (a, b) {
        var ae = timeOf(a.end) || Infinity;
        var be = timeOf(b.end) || Infinity;
        if (ae !== be) return ae - be;
        return timeOf(b.start) - timeOf(a.start);
      })[0];
    } else if (upcoming.length) focus = upcoming[0];
    else if (ended.length) focus = ended[ended.length - 1];
    var ordered = ended.concat(active, upcoming);

    var slides = ordered.map(function (item) {
      return {
        kind: "event",
        id: item.id,
        focus: focus && item.id === focus.id,
        href: "#" + item.id,
        image: item.type.image || "",
        chip: item.chip,
        chipClass: item.state === "upcoming" ? " countdown" : "",
        title: item.type.name || "Event",
        kicker: melbourneRange(item.start, item.end),
        sub: item.type.description || "",
        label: item.type.name || "Event",
        remainStart: item.start,
        remainEnd: item.end,
        state: item.state,
        accent: item.type.accent || "#FF6D10",
        cardLabel: categoryFor(item),
        clanLine: item.kind === "clan" && STF.clanFooter
          ? STF.clanFooter(item.type.name, item.type.image_url, item.type.activityType)
          : "",
        icon: emblemKind(item.type.id),
        emblem: emblemSrc(item),
        typeId: item.type.id,
        endedLine: item.state === "ended" ? endedAgo(item.end) : ""
      };
    });

    var banner = document.getElementById("season-banner");
    if (banner) {
      var label = document.getElementById("season-banner-label");
      var name = document.getElementById("season-banner-name");
      if (label) label.textContent = season.yearSeason || "Season";
      if (name) name.textContent = season.name || "";
      var art = season.cardImage || "assets/events/season-hero.jpg";
      banner.style.backgroundImage = "url('" + art + "')";
    }

    rail.style.visibility = "hidden";
    rail.style.scrollBehavior = "auto";
    rail.innerHTML = slides
      .map(function (slide) {
        var statusClass = slide.state === "ended" ? "is-ended" : slide.state === "upcoming" ? "is-soon" : "is-live";
        var ticker = tickerFor({
          start: slide.remainStart,
          end: slide.remainEnd,
          state: slide.state
        });
        var emblem = slide.emblem || EMBLEMS.raid;
        var fullBleed = /^assets\/event-cards\//.test(emblem) || /^https:\/\//.test(emblem);
        var artOpen = fullBleed
          ? '<div class="tl-art has-card"><img class="tl-card-art" src="' + STF.esc(emblem) + '" alt="">'
          : '<div class="tl-art">';
        var inner =
          artOpen +
          '<span class="tl-tag ' + statusClass + '">' + statusLabel(slide.state || "active") + "</span>" +
          '<span class="tl-ticker" data-ticker data-state="' + STF.esc(slide.state || "") + '" data-remain-start="' + STF.esc(slide.remainStart || "") + '" data-remain-end="' + STF.esc(slide.remainEnd || "") + '">' + STF.esc(ticker) + "</span>" +
          (fullBleed ? "" : '<img class="tl-emblem-img" src="' + STF.esc(emblem) + '" alt="">') +
          "</div>" +
          (slide.clanLine
            ? '<div class="tl-foot is-clan"><strong>' + STF.esc(slide.clanLine) + "</strong></div>"
            : '<div class="tl-foot">' +
              '<span class="tl-kind">' + STF.esc(slide.cardLabel || "Season Event") + "</span>" +
              "<strong>" + STF.esc(slide.title) + "</strong>" +
              "</div>");
        var card = slide.href
          ? '<a class="hero-card tl-card is-' + slide.kind + '" href="' + slide.href + '" aria-label="' + STF.esc(slide.label) + '">' + inner + "</a>"
          : '<article class="hero-card tl-card is-' + slide.kind + '" aria-label="' + STF.esc(slide.label) + '">' + inner + "</article>";
        return '<div class="hero-slide"' + (slide.focus ? ' data-focus="1"' : "") + ">" + card + "</div>";
      })
      .join("");
    var thumb = document.getElementById("tl-thumb");
    function moveThumb() {
      if (!thumb) return;
      var max = rail.scrollWidth - rail.clientWidth;
      var track = thumb.parentElement.clientWidth;
      var width = Math.max(28, rail.scrollWidth ? (rail.clientWidth / rail.scrollWidth) * track : track);
      var x = max > 0 ? (rail.scrollLeft / max) * (track - width) : 0;
      thumb.style.width = width + "px";
      thumb.style.transform = "translateX(" + x + "px)";
    }
    function markSelected() {
      var slides = rail.querySelectorAll(".hero-slide");
      if (!slides.length) return;
      var mid = rail.scrollLeft + rail.clientWidth / 2;
      var best = slides[0];
      var bestDist = Infinity;
      Array.prototype.forEach.call(slides, function (slide) {
        var center = slide.offsetLeft + slide.offsetWidth / 2;
        var dist = Math.abs(center - mid);
        if (dist < bestDist) {
          best = slide;
          bestDist = dist;
        }
      });
      Array.prototype.forEach.call(slides, function (slide) {
        var card = slide.querySelector(".tl-card");
        if (card) card.classList.toggle("is-selected", slide === best);
      });
    }
    function centerFocus(smooth) {
      var slide = rail.querySelector(".hero-slide[data-focus='1']") || rail.querySelector(".hero-slide");
      if (!slide || !rail.clientWidth) return;
      var left = slide.offsetLeft - Math.max(0, (rail.clientWidth - slide.offsetWidth) / 2);
      rail.scrollTo({ left: Math.max(0, left), behavior: smooth ? "smooth" : "auto" });
    }
    rail.addEventListener("scroll", function () {
      moveThumb();
      markSelected();
    }, { passive: true });
    centerFocus(false);
    requestAnimationFrame(function () {
      centerFocus(false);
      moveThumb();
      markSelected();
      requestAnimationFrame(function () {
        centerFocus(false);
        moveThumb();
        markSelected();
        rail.style.visibility = "";
        rail.style.scrollBehavior = "";
      });
    });

    function openHashCard(href) {
      if (!href || href.charAt(0) !== "#") return;
      if (location.hash === href) routeEvent();
      else location.hash = href;
    }
    rail.addEventListener("click", function (e) {
      var link = e.target.closest("a.hero-card");
      if (!link) return;
      var href = link.getAttribute("href") || "";
      if (href.charAt(0) !== "#") return;
      e.preventDefault();
      openHashCard(href);
    });
    var tap = null;
    rail.addEventListener("touchstart", function (e) {
      if (!e.touches[0]) return;
      tap = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }, { passive: true });
    rail.addEventListener("touchend", function (e) {
      if (!tap || !e.changedTouches[0]) return;
      var t = e.changedTouches[0];
      var moved = Math.abs(t.clientX - tap.x) > 12 || Math.abs(t.clientY - tap.y) > 12;
      tap = null;
      if (moved) return;
      var link = e.target.closest("a.hero-card");
      if (!link) return;
      var href = link.getAttribute("href") || "";
      if (href.charAt(0) !== "#") return;
      e.preventDefault();
      openHashCard(href);
    });
    rail.addEventListener("keydown", function (e) {
      if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
      e.preventDefault();
      var dir = e.key === "ArrowRight" ? 1 : -1;
      rail.scrollBy({ left: dir * rail.clientWidth, behavior: "smooth" });
    });
    window.addEventListener("hashchange", routeEvent);
    routeEvent();
    setInterval(paintRemain, 60000);
  } catch (err) {
    rail.innerHTML = '<p class="lede hero-loading">Could not load events.</p>';
    console.error(err);
  }
})();
