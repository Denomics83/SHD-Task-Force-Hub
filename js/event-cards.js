/* Built-in event card art. image_url on a row wins; otherwise match by slug or name. */
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
    "optimization-surge",
    "proficiency-xp-event",
    "prototype-surge",
    "rage-harvest",
    "red-moon-unleashed",
    "redline-overdrive",
    "retaliation-surge",
    "shd-exposed",
    "shepherd-xp-x3",
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
        if (part === "shd") return "SHD";
        return part.charAt(0).toUpperCase() + part.slice(1);
      })
      .join(" ");
  }

  STF.EVENT_CARDS = SLUGS.map(function (slug) {
    return { slug: slug, file: fileFor(slug), label: labelFor(slug) };
  });

  STF.eventCardPath = function (name) {
    if (name == null || name === "") return "";
    var slug = slugify(name);
    if (SLUGS.indexOf(slug) >= 0) return fileFor(slug);
    if (ALIAS[slug]) return fileFor(ALIAS[slug]);
    var text = String(name).toLowerCase();
    for (var i = 0; i < RULES.length; i++) {
      if (RULES[i][0].test(text)) return fileFor(RULES[i][1]);
    }
    return "";
  };
})();
