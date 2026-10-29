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

  try {
    var results = await Promise.all([
      STF.fetchJSON("data/season.json"),
      STF.fetchJSON("data/raids.json")
    ]);
    var season = results[0] || {};
    var raids = ((results[1] && results[1].raids) || []).slice().sort(function (a, b) {
      var ka = (a.date || "") + " " + (a.time || "");
      var kb = (b.date || "") + " " + (b.time || "");
      return ka < kb ? -1 : ka > kb ? 1 : 0;
    });

    var slides = [];

    var seasonLine = [season.yearSeason, season.name].filter(Boolean).join(" · ");
    slides.push({
      kind: "season",
      href: "season.html",
      chip: "Live",
      chipClass: "",
      title: "Current Season",
      kicker: seasonLine,
      sub: "Manhunts · Maps · Modifiers",
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

    var count = slides.length;
    rail.innerHTML = slides
      .map(function (slide, i) {
        var kicker = slide.kickerHtml || (slide.kicker ? STF.esc(slide.kicker) : "");
        var inner =
          '<div class="hero-photo"></div>' +
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
  } catch (err) {
    rail.innerHTML = '<p class="lede hero-loading">Could not load events.</p>';
    console.error(err);
  }
})();
