/* Shared Division 2 marks. data/icons.json maps names and aliases to files. */
(function () {
  window.STF = window.STF || {};
  var index = null;

  function norm(name) {
    return String(name == null ? "" : name)
      .toLowerCase()
      .replace(/&/g, " and ")
      .replace(/['’]/g, "")
      .replace(/[^a-z0-9]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  STF.loadIcons = async function () {
    if (index) return index;
    var doc = await STF.fetchJSON("data/icons.json");
    var map = {};
    function add(key, icon) {
      if (key && !map[key]) map[key] = icon;
    }
    (doc.icons || []).forEach(function (icon) {
      [icon.name, icon.slug, icon.proto].concat(icon.aliases || []).forEach(function (alias) {
        var phrase = norm(alias);
        if (!phrase) return;
        add(phrase, icon);
        add(phrase.replace(/ /g, ""), icon);
      });
    });
    index = {
      doc: doc,
      map: map,
      fallback: doc.fallback || "assets/icons/loot/generic.svg"
    };
    STF.iconIndex = index;
    return index;
  };

  STF.iconFor = function (name) {
    if (!index || name == null || name === "") return null;
    var phrase = norm(name);
    if (!phrase) return null;
    return index.map[phrase] || index.map[phrase.replace(/ /g, "")] || null;
  };

  STF.iconPath = function (name) {
    var hit = STF.iconFor(name);
    return hit && hit.file ? hit.file : "";
  };
})();
