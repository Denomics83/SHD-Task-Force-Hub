/* Events — full-bleed season + raid cards. RSVP stays on Resources. */
(async function () {
  STF.mountChrome("events");
  var rail = document.getElementById("hero-rail");
  if (!rail) return;

  function zonedDate(dateStr, timeStr, timeZone) {
    var dp = String(dateStr || "").split("-");
    var tp = String(timeStr || "00:00").split(":");
    if (dp.length < 3) return null;
    var y = +dp[0];
    var mo = +dp[1];
    var d = +dp[2];
    var h = +tp[0] || 0;
    var mi = +tp[1] || 0;
    var zone = timeZone || "UTC";
    var fmt = new Intl.DateTimeFormat("en-US", {
      timeZone: zone,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    });
    function asUTC(ms) {
      var map = {};
      fmt.formatToParts(new Date(ms)).forEach(function (p) {
        map[p.type] = p.value;
      });
      return Date.UTC(+map.year, +map.month - 1, +map.day, +map.hour, +map.minute, +map.second);
    }
    var target = Date.UTC(y, mo - 1, d, h, mi, 0);
    var guess = target;
    for (var i = 0; i < 3; i++) guess -= asUTC(guess) - target;
    return new Date(guess);
  }

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

  function paintRemain() {
    document.querySelectorAll(".hero-remain[data-remain-end]").forEach(function (el) {
      el.textContent = eventRemainLabel(el.getAttribute("data-remain-start"), el.getAttribute("data-remain-end"));
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

  function zoneLabel(when, timeZone) {
    var zone = timeZone || "UTC";
    var name = "";
    try {
      new Intl.DateTimeFormat("en-AU", {
        timeZone: zone,
        timeZoneName: "short"
      }).formatToParts(when).forEach(function (p) {
        if (p.type === "timeZoneName") name = p.value;
      });
    } catch (e) {}
    if (name && !/^GMT|^UTC/i.test(name)) return name;
    var fmt = new Intl.DateTimeFormat("en-US", {
      timeZone: zone,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    });
    var map = {};
    fmt.formatToParts(when).forEach(function (p) { map[p.type] = p.value; });
    var asUTC = Date.UTC(+map.year, +map.month - 1, +map.day, +map.hour, +map.minute, +map.second);
    var off = Math.round((asUTC - when.getTime()) / 3600000);
    if (zone === "Australia/Melbourne" || zone === "Australia/Sydney" || zone === "Australia/Hobart") {
      return off >= 11 ? "AEDT" : "AEST";
    }
    var sign = off >= 0 ? "+" : "";
    return "UTC" + sign + off;
  }

  function clockLabel(when, timeZone) {
    var zone = timeZone || "UTC";
    var time = new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      minute: "2-digit",
      timeZone: zone
    }).format(when);
    time = time.replace(":00", "").replace(/\s+/g, "").toLowerCase();
    var day = new Intl.DateTimeFormat("en-US", {
      weekday: "long",
      timeZone: zone
    }).format(when);
    var tzPart = zoneLabel(when, zone);
    return day + " " + time + (tzPart ? " " + tzPart : "");
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
  var altarsDoc = { altars: [] };
  var eventMap = null;

  function clearEventMap() {
    if (eventMap) {
      eventMap.remove();
      eventMap = null;
    }
  }

  function melbourneRange(start, end) {
    var fmt = new Intl.DateTimeFormat("en-AU", {
      timeZone: "Australia/Melbourne",
      day: "numeric", month: "short", hour: "numeric", minute: "2-digit"
    });
    return fmt.format(new Date(start)) + " – " + fmt.format(new Date(end)) + " Melbourne";
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
    clearEventMap();
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

  function showEventDetail(item) {
    if (!detail || !item) return showRail();
    var type = item.type || {};
    function block(label, text) {
      return "<h2 class=\"upd-h\">" + STF.esc(label) + "</h2><p>" + STF.esc(text || "add details") + "</p>";
    }
    var suggested = type.suggested
      ? "<details class=\"event-suggested\"><summary>Suggested note</summary><p>" + STF.esc(type.suggested) + "</p></details>"
      : "";
    var redMoon = item.type && item.type.id === "red-moon-unleashed";
    var mapBlock = "";
    if (redMoon && item.mapImage) {
      mapBlock =
        '<h2 class="upd-h">Map</h2>' +
        '<button type="button" class="map-shot" id="event-map-open">' +
        '<img src="' + STF.esc(item.mapImage) + '" alt="Red Moon Unleashed map">' +
        "</button>" +
        (item.mapCaption ? '<p class="lede map-note">' + STF.esc(item.mapCaption) + "</p>" : "") +
        '<p class="lede map-note">Tap the map to open it full screen. Pinch to zoom.</p>';
    } else if (redMoon) {
      var altarList = (altarsDoc.altars || []).map(function (altar) {
        var coords = "Menu " + (altar.menu || []).join(", ");
        if (altar.map) coords += " · map " + altar.map.join(", ");
        return (
          "<li><strong>" + STF.esc(altar.n + ". " + altar.zone) + "</strong> " +
          STF.esc(altar.where) + ' <span class="coords">' + STF.esc(coords) + "</span></li>"
        );
      }).join("");
      mapBlock =
        '<h2 class="upd-h">Map</h2>' +
        '<div id="altar-leaflet" role="region" aria-label="Red Moon altar map"></div>' +
        '<ol class="altar-list">' + altarList + "</ol>";
    } else if (item.mapImage) {
      mapBlock = '<p><button type="button" class="guide-btn" id="event-map-open">Map</button></p>';
    }
    var active = item.state === "active";
    var endedState = item.state === "ended";
    var flag = active ? "ACTIVATED" : endedState ? "ENDED" : "COMING SOON";
    var timeLine = endedState
      ? endedAgo(item.end)
      : "Time Remaining " + eventRemainLabel(item.start, item.end);
    function geRows(text) {
      var parts = String(text || "").split(/\n+/).map(function (line) { return line.trim(); }).filter(Boolean);
      if (!parts.length) parts = [text || "add details"];
      return parts.map(function (line, index) {
        var n = index + 1;
        return (
          '<div class="ge-row"><span class="ge-ring" aria-hidden="true"></span><span>' + STF.esc(line) + "</span>" +
          "<b>" + (n < 10 ? "0" : "") + n + "</b></div>"
        );
      }).join("");
    }
    var rewardTitle = endedState ? "Bonus reward" : "Rewards";
    var rewardState = endedState ? "ENDED" : active ? "IN PROGRESS" : "COMING SOON";
    detail.innerHTML =
      '<p class="ge-time">' + STF.esc(timeLine) + ' <span class="ge-flag">' + flag + "</span></p>" +
      "<h1>" + STF.esc(type.name || "Event") + "</h1>" +
      '<p class="upd-posted">Starts · ' + STF.esc(melWhen(item.start)) + "</p>" +
      '<p class="upd-posted">Ends · ' + STF.esc(melWhen(item.end)) + "</p>" +
      (item.note ? "<p>" + STF.esc(item.note) + "</p>" : "") +
      '<section class="ge-reward' + (endedState ? " is-bonus" : "") + '">' +
      "<h2>" + rewardTitle + "</h2>" +
      '<p class="ge-kicker">' + rewardState + "</p>" +
      "<p>" + STF.esc(type.rewards || "add details") + "</p></section>" +
      "<h2 class=\"upd-h\">Requirement</h2><p>" + STF.esc(type.description || "add details") + "</p>" +
      "<h2 class=\"upd-h\">Challenges</h2>" + geRows(type.tasks) +
      "<h2 class=\"upd-h\">Modifiers</h2>" + geRows(type.modifiers) +
      mapBlock +
      (type.source ? '<p class="src-line">' + STF.esc(type.source) + "</p>" : "") +
      suggested +
      '<p class="pad-hints"><span><i>Esc</i> Back</span></p>';
    var screen = document.getElementById("tl-screen");
    if (screen) screen.hidden = true;
    rail.hidden = true;
    detail.hidden = false;
    setEventsBack(true);
    var mapOpen = document.getElementById("event-map-open");
    if (mapOpen && item.mapImage) {
      mapOpen.addEventListener("click", function () {
        STF.openMap(item.mapImage, item.mapCaption || "");
      });
    }
    var altarEl = document.getElementById("altar-leaflet");
    if (altarEl && window.L) {
      clearEventMap();
      eventMap = L.map(altarEl, { scrollWheelZoom: false });
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      }).addTo(eventMap);
      var bounds = [];
      (altarsDoc.altars || []).forEach(function (altar) {
        if (altar.lat == null || altar.lon == null) return;
        var icon = L.divIcon({
          className: "altar-pin",
          html: "<span>" + altar.n + "</span>",
          iconSize: [28, 28],
          iconAnchor: [14, 14]
        });
        L.marker([altar.lat, altar.lon], { icon: icon, title: String(altar.n) })
          .addTo(eventMap)
          .bindPopup("<strong>" + altar.n + ". " + STF.esc(altar.zone) + "</strong><br>" + STF.esc(altar.where));
        bounds.push([altar.lat, altar.lon]);
      });
      if (bounds.length) eventMap.fitBounds(bounds, { padding: [28, 28] });
      setTimeout(function () {
        if (!eventMap) return;
        eventMap.invalidateSize();
        if (bounds.length) eventMap.fitBounds(bounds, { padding: [28, 28] });
      }, 80);
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
      STF.fetchJSON("data/raids.json"),
      STF.fetchJSON("data/event-types.json").catch(function () { return { types: [] }; }),
      STF.fetchJSON("data/events.json").catch(function () { return { events: [] }; }),
      STF.fetchJSON("data/altars.json").catch(function () { return { altars: [] }; })
    ]);
    var season = results[0] || {};
    var raids = ((results[1] && results[1].raids) || []).slice().sort(function (a, b) {
      var ka = (a.date || "") + " " + (a.time || "");
      var kb = (b.date || "") + " " + (b.time || "");
      return ka < kb ? -1 : ka > kb ? 1 : 0;
    });
    altarsDoc = results[4] || { altars: [] };
    var typeById = {};
    ((results[2] && results[2].types) || []).forEach(function (type) { typeById[type.id] = type; });
    var now = Date.now();
    var joined = ((results[3] && results[3].events) || []).map(function (ev) {
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
    catalog = joined;
    var live = joined.filter(function (row) { return row.state !== "ended"; })
      .sort(function (a, b) { return a.start < b.start ? -1 : 1; });
    var ended = joined.filter(function (row) { return row.state === "ended"; });

    var slides = [];

    live.forEach(function (item) {
      slides.push({
        kind: "event",
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
        cardLabel: item.type.cardLabel || "Season Event",
        icon: emblemKind(item.type.id)
      });
    });

    var seasonLine = [season.yearSeason, season.name].filter(Boolean).join(" · ");
    slides.push({
      kind: "season",
      href: "season.html",
      chip: "Live",
      chipClass: "",
      title: season.name || "Current Season",
      kicker: "",
      sub: "",
      label: "Open current season",
      image: season.cardImage || "",
      accent: "#FF6D10",
      cardLabel: "Season",
      icon: "season",
      state: "active"
    });

    raids.forEach(function (raid) {
      var when = zonedDate(raid.date, raid.time, raid.timezone);
      var chip = when ? countdownLabel(when) : "Scheduled";
      var kicker = STF.esc(raid.activity || "Raid");
      if (when) kicker += " · " + STF.esc(clockLabel(when, raid.timezone));
      slides.push({
        kind: "raid",
        href: "",
        chip: chip,
        chipClass: " countdown",
        title: "Raid Scheduled",
        kickerHtml: kicker,
        sub: "",
        label: "Scheduled raid",
        accent: "#FF6D10",
        cardLabel: "Raid",
        icon: "raid",
        state: "upcoming"
      });
    });

    ended.forEach(function (item) {
      slides.push({
        kind: "event",
        href: "#" + item.id,
        image: item.type.image || "",
        title: item.type.name || "Event",
        label: item.type.name || "Event",
        state: "ended",
        accent: item.type.accent || "#6e7480",
        cardLabel: item.type.cardLabel || "Season Event",
        icon: emblemKind(item.type.id),
        endedLine: endedAgo(item.end),
        bonus: shownReward(item.type.rewards)
      });
    });

    var head = document.getElementById("tl-head");
    if (head) {
      head.innerHTML =
        "<h1>" + STF.esc(season.yearSeason || "Season") + "</h1>" +
        "<p>" + STF.esc(season.name || "") + "</p>";
    }
    rail.innerHTML = slides
      .map(function (slide) {
        var upcoming = slide.state === "upcoming";
        var ended = slide.state === "ended";
        var photo = slide.image && /^assets\/[a-z0-9._/-]+$/i.test(slide.image);
        var remain = slide.remainEnd
          ? '<span class="hero-remain" data-remain-start="' + STF.esc(slide.remainStart) + '" data-remain-end="' + STF.esc(slide.remainEnd) + '">' + STF.esc(eventRemainLabel(slide.remainStart, slide.remainEnd)) + "</span>"
          : (slide.kind === "raid" && slide.chip
            ? '<span class="hero-remain">' + STF.esc(slide.chip) + "</span>"
            : "");
        var top = upcoming
          ? '<div class="tl-soon-head"><span>Coming Soon</span>' + remain + "</div>"
          : ended
            ? '<span class="tl-tag">ENDED</span>' + (slide.endedLine ? '<span class="hero-remain">' + STF.esc(slide.endedLine) + "</span>" : "")
            : '<span class="tl-tag">ONGOING</span>' + remain;
        var lock = upcoming
          ? '<svg class="tl-lock" viewBox="0 0 24 24" aria-hidden="true"><rect x="7" y="11" width="10" height="8" fill="#f4f4f4"/><path d="M9 11V8.4a3 3 0 0 1 6 0V11" fill="none" stroke="#f4f4f4" stroke-width="1.7"/></svg>'
          : "";
        var soonPill = upcoming ? '<span class="tl-soon-pill">COMING SOON</span>' : "";
        var extra = slide.bonus
          ? '<span class="tl-bonus">BONUS REWARD</span><em>' + STF.esc(slide.bonus) + "</em>"
          : "";
        var kicker = slide.kickerHtml || (slide.kicker ? STF.esc(slide.kicker) : "");
        var inner =
          '<div class="tl-art' + (photo ? " has-photo" : "") + '"' +
          (photo ? ' style="background-image:url(\'' + slide.image + '\')"' : "") + ">" +
          top +
          '<div class="tl-emblem" style="--ring:' + STF.esc(slide.accent || "#FF6D10") + '">' +
          emblemSVG(slide.icon || "shield") + lock + "</div></div>" +
          '<div class="tl-foot' + (upcoming ? " is-hot" : "") + '">' +
          '<span class="tl-kind">' + STF.esc(slide.cardLabel || "Season Event") + "</span>" +
          "<strong>" + STF.esc(slide.title) + "</strong>" +
          (kicker && !slide.remainEnd ? '<small>' + kicker + "</small>" : "") +
          extra + soonPill +
          '<span class="tl-mini" aria-hidden="true">' + emblemSVG(slide.icon || "shield") + "</span>" +
          "</div>";
        var card = slide.href
          ? '<a class="hero-card tl-card is-' + slide.kind + '" href="' + slide.href + '" aria-label="' + STF.esc(slide.label) + '">' + inner + "</a>"
          : '<article class="hero-card tl-card is-' + slide.kind + '" aria-label="' + STF.esc(slide.label) + '">' + inner + "</article>";
        return '<div class="hero-slide">' + card + "</div>";
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
    rail.addEventListener("scroll", moveThumb, { passive: true });
    moveThumb();

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
