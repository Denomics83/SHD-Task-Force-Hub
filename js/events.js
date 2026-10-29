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

  var detail = document.getElementById("event-detail");
  var catalog = [];

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
    var mapBtn = item.mapImage
      ? '<p><button type="button" class="guide-btn" id="event-map-open">Map</button></p>'
      : "";
    detail.innerHTML =
      "<h1>" + STF.esc(type.name || "Event") + "</h1>" +
      '<p class="upd-posted">Starts · ' + STF.esc(melWhen(item.start)) + "</p>" +
      '<p class="upd-posted">Ends · ' + STF.esc(melWhen(item.end)) + "</p>" +
      '<p class="upd-pill">' + STF.esc(detailCountdown(item)) + "</p>" +
      (item.note ? "<p>" + STF.esc(item.note) + "</p>" : "") +
      "<h2 class=\"upd-h\">Specifics</h2><p>" + STF.esc(type.description || "add details") + "</p>" +
      block("Rewards", type.rewards) +
      block("Modifiers", type.modifiers) +
      block("Tasks", type.tasks) +
      mapBtn +
      (type.source ? '<p class="src-line">' + STF.esc(type.source) + "</p>" : "") +
      suggested;
    var mapOpen = document.getElementById("event-map-open");
    if (mapOpen) {
      mapOpen.addEventListener("click", function () {
        STF.openMap(item.mapImage, item.mapCaption || "");
      });
    }
    rail.hidden = true;
    detail.hidden = false;
    setEventsBack(true);
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
      STF.fetchJSON("data/events.json").catch(function () { return { events: [] }; })
    ]);
    var season = results[0] || {};
    var raids = ((results[1] && results[1].raids) || []).slice().sort(function (a, b) {
      var ka = (a.date || "") + " " + (a.time || "");
      var kb = (b.date || "") + " " + (b.time || "");
      return ka < kb ? -1 : ka > kb ? 1 : 0;
    });
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
        label: item.type.name || "Event"
      });
    });

    var seasonLine = [season.yearSeason, season.name].filter(Boolean).join(" · ");
    slides.push({
      kind: "season",
      href: "season.html",
      chip: "Live",
      chipClass: "",
      title: "Current Season",
      kicker: seasonLine,
      sub: "Manhunt · Journey · Maps · Modifiers",
      label: "Open current season"
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
        label: "Scheduled raid"
      });
    });

    if (ended.length) {
      slides.push({
        kind: "recent",
        href: "",
        chip: "Recent",
        chipClass: "",
        title: "Recently ended",
        sub: ended.map(function (row) { return row.type.name || row.id; }).join(" · "),
        label: "Recently ended events"
      });
    }

    var count = slides.length;
    rail.innerHTML = slides
      .map(function (slide, i) {
        var kicker = slide.kickerHtml || (slide.kicker ? STF.esc(slide.kicker) : "");
        var photo = slide.image && /^assets\/[a-z0-9._/-]+$/i.test(slide.image)
          ? '<div class="hero-photo" style="background-image:url(\'' + slide.image + '\')"></div>'
          : '<div class="hero-photo"></div>';
        var inner =
          photo +
          '<div class="hero-copy">' +
          '<span class="hero-chip' + slide.chipClass + '">' + STF.esc(slide.chip) + "</span>" +
          "<h2>" + STF.esc(slide.title) + "</h2>" +
          (kicker ? '<p class="hero-kicker">' + kicker + "</p>" : "") +
          (slide.sub ? '<p class="hero-sub">' + STF.esc(slide.sub) + "</p>" : "") +
          dots(i, count) +
          "</div>";
        var card = slide.href
          ? '<a class="hero-card is-' + slide.kind + '" href="' + slide.href + '" aria-label="' + STF.esc(slide.label) + '">' + inner + "</a>"
          : '<article class="hero-card is-' + slide.kind + '" aria-label="' + STF.esc(slide.label) + '">' + inner + "</article>";
        return '<div class="hero-slide">' + card + "</div>";
      })
      .join("");

    rail.addEventListener("keydown", function (e) {
      if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
      e.preventDefault();
      var dir = e.key === "ArrowRight" ? 1 : -1;
      rail.scrollBy({ left: dir * rail.clientWidth, behavior: "smooth" });
    });
    window.addEventListener("hashchange", routeEvent);
    routeEvent();
  } catch (err) {
    rail.innerHTML = '<p class="lede hero-loading">Could not load events.</p>';
    console.error(err);
  }
})();
