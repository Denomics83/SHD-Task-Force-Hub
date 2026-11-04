/* Built-in event card art. image_url on a row wins; otherwise match by slug or name.
   Dark Zone and Conflict gate art are clan activity art only (see clanGateArt). */
(function () {
  window.STF = window.STF || {};

  var SLUGS = [
    "ambush",
    "assault",
    "countdown-surge",
    "dark-zone",
    "dark-zone-surge",
    "deadeye-overdrive",
    "expertise-surge",
    "fivefold-season-xp",
    "golden-bullet",
    "kenly-college",
    "optimization-surge",
    "proficiency-xp-event",
    "prototype-surge",
    "rage-harvest",
    "red-moon-unleashed",
    "redline-overdrive",
    "retaliation-surge",
    "shd-exposed",
    "shepherd-xp-x3",
    "sixfold-xp",
    "triple-xp",
    "vanguard-overdrive",
    "x5-xp-event",
    "dark-hours",
    "iron-horse",
    "paradise-lost",
    "broken-rain",
    "conflict"
  ];

  var ALIAS = {
    "x5-season-xp": "x5-xp-event",
    "x5-xp": "x5-xp-event",
    "xp-event": "x5-xp-event",
    "xp-x5": "x5-xp-event",
    "season-xp": "x5-xp-event",
    "season-pass-xp": "x5-xp-event",
    "fivefold-season-pass-xp": "fivefold-season-xp",
    "triple-xp": "triple-xp",
    "sixfold-xp": "sixfold-xp",
    "golden-bullet-global-event": "golden-bullet",
    "kenly-college-expedition": "kenly-college",
    "shepherd": "shepherd-xp-x3",
    "shepherd-xp": "shepherd-xp-x3",
    "proficiency": "proficiency-xp-event",
    "proficiency-xp": "proficiency-xp-event",
    "operation-dark-hours": "dark-hours",
    "raid-dark-hours": "dark-hours",
    "operation-iron-horse": "iron-horse",
    "raid-iron-horse": "iron-horse",
    "incursion-paradise-lost": "paradise-lost",
    "incursion-broken-rain": "broken-rain",
    "pvp-conflict": "conflict",
    "dz": "dark-zone",
    "darkzone": "dark-zone"
  };

  var RULES = [
    [/dark hours/, "dark-hours"],
    [/iron horse/, "iron-horse"],
    [/paradise lost/, "paradise-lost"],
    [/broken rain/, "broken-rain"],
    [/\bconflict\b/, "conflict"],
    [/triple xp|3x xp/, "triple-xp"],
    [/sixfold|6x xp/, "sixfold-xp"],
    [/fivefold|5x season/, "fivefold-season-xp"],
    [/golden bullet/, "golden-bullet"],
    [/kenly/, "kenly-college"],
    [/proficiency/, "proficiency-xp-event"],
    [/shepherd/, "shepherd-xp-x3"],
    [/x5|xp event|season xp/, "x5-xp-event"],
    [/rage harvest/, "rage-harvest"],
    [/shd exposed/, "shd-exposed"],
    [/deadeye/, "deadeye-overdrive"],
    [/redline/, "redline-overdrive"],
    [/vanguard/, "vanguard-overdrive"],
    [/expertise/, "expertise-surge"],
    [/optimi[sz]/, "optimization-surge"],
    [/retaliat/, "retaliation-surge"],
    [/countdown/, "countdown-surge"],
    [/prototype/, "prototype-surge"],
    [/dark zone surge|darkzone surge/, "dark-zone-surge"],
    [/dark zone|darkzone|\bdz\b/, "dark-zone"],
    [/ambush/, "ambush"],
    [/assault/, "assault"]
  ];

  function fileFor(slug) {
    return "assets/event-cards/" + slug + ".jpg";
  }

  function slugify(name) {
    return String(name || "")
      .toLowerCase()
      .replace(/:.*/, "")
      .replace(/&/g, " ")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  }

  function labelFor(slug) {
    return slug
      .split("-")
      .map(function (part) {
        if (part === "xp") return "XP";
        if (part === "x5") return "x5";
        if (part === "3x") return "3X";
        if (part === "6x") return "6X";
        if (part === "shd") return "SHD";
        return part.charAt(0).toUpperCase() + part.slice(1);
      })
      .join(" ");
  }

  var CAPTIONS = {
    ambush: "Global Event: Ambush",
    assault: "Global Event: Assault",
    "shd-exposed": "Global Event: SHD Exposed",
    "rage-harvest": "Global Event: Rage Harvest",
    "vanguard-overdrive": "Global Event: Vanguard Overdrive",
    "deadeye-overdrive": "Global Event: Deadeye Overdrive",
    "redline-overdrive": "Global Event: Redline Overdrive",
    "red-moon-unleashed": "Season Event: Red Moon Unleashed",
    "countdown-surge": "Countdown Surge",
    "dark-zone-surge": "Dark Zone Surge",
    "expertise-surge": "Expertise Surge",
    "optimization-surge": "Optimization Surge",
    "retaliation-surge": "Retaliation Surge",
    "prototype-surge": "Prototype Surge",
    "proficiency-xp-event": "Proficiency XP Event",
    "shepherd-xp-x3": "Shepherd XP ×3",
    "sixfold-xp": "6X XP",
    "triple-xp": "3X XP",
    "fivefold-season-xp": "5X Season Pass XP",
    "golden-bullet": "Global Event: Golden Bullet",
    "kenly-college": "Kenly College Expedition",
    "x5-xp-event": "XP Event",
    "dark-zone": "Dark Zone",
    conflict: "Conflict",
    "dark-hours": "Dark Hours",
    "iron-horse": "Iron Horse",
    "paradise-lost": "Paradise Lost",
    "broken-rain": "Broken Rain"
  };

  STF.EVENT_CARDS = SLUGS.map(function (slug) {
    return {
      slug: slug,
      file: fileFor(slug),
      label: labelFor(slug),
      caption: CAPTIONS[slug] || labelFor(slug)
    };
  });

  var CLAN_MATCHES = [
    { test: /dark hours|dark-hours/, type: "raid", name: "Dark Hours" },
    { test: /iron horse|iron-horse/, type: "raid", name: "Iron Horse" },
    { test: /broken rain|broken-rain/, type: "incursion", name: "Broken Rain" },
    { test: /paradise lost|paradise-lost/, type: "incursion", name: "Paradise Lost" },
    { test: /\bconflict\b|conflict\.jpg/, type: "pvp", name: "Conflict" },
    { test: /dark zone|\bdz\b|dark-zone(?!-surge)/, type: "dark-zone", name: "" }
  ];

  STF.clanActivity = function (title, art) {
    var text = (String(title || "") + " " + String(art || "")).toLowerCase();
    for (var i = 0; i < CLAN_MATCHES.length; i++) {
      if (CLAN_MATCHES[i].test.test(text)) {
        return { type: CLAN_MATCHES[i].type, name: CLAN_MATCHES[i].name || String(title || "").trim() };
      }
    }
    return { type: "", name: String(title || "").trim() };
  };

  STF.clanFooter = function (title, art, activityType) {
    var found = STF.clanActivity(title, art);
    var type = activityType || found.type || "other";
    var name = found.name || String(title || "").trim() || "Event";
    if (type === "dark-zone" || type === "other") name = String(title || "").trim() || name;
    var label = {
      raid: "Clan Raid",
      incursion: "Clan Incursion",
      pvp: "Clan PvP",
      "dark-zone": "Clan Dark Zone",
      other: "Clan"
    }[type] || "Clan";
    return label + ": " + name;
  };

  var CLAN_GATE = {
    "dark-zone": true,
    conflict: true
  };

  STF.clanGateArt = function (activityType) {
    if (activityType === "dark-zone") return fileFor("dark-zone");
    if (activityType === "pvp") return fileFor("conflict");
    return "";
  };

  STF.eventCardPath = function (name) {
    if (name == null || name === "") return "";
    var slug = slugify(name);
    var mapped = SLUGS.indexOf(slug) >= 0 ? slug : (ALIAS[slug] || "");
    if (mapped && !CLAN_GATE[mapped]) return fileFor(mapped);
    var text = String(name).toLowerCase();
    for (var i = 0; i < RULES.length; i++) {
      if (!RULES[i][0].test(text)) continue;
      if (CLAN_GATE[RULES[i][1]]) continue;
      return fileFor(RULES[i][1]);
    }
    return "";
  };
})();
