(function () {
  STF.mountChrome("builds", "Builds");

  const FILTERS = window.BUILD_FILTERS || [];
  const builds = window.CLAN_BUILDS || [];
  const filtersEl = document.getElementById("filters");
  const rail = document.getElementById("build-rail");
  const empty = document.getElementById("empty-state");
  const countEl = document.getElementById("build-count");
  if (!filtersEl || !rail) return;

  function coresHTML(cores) {
    if (!cores || !cores.length) return '<span class="core core-u"></span>';
    return cores
      .map(function (c) {
        const cls = c === "r" ? "core-r" : c === "b" ? "core-b" : c === "y" ? "core-y" : "core-u";
        return '<span class="core ' + cls + '"></span>';
      })
      .join("");
  }

  function rarityNameClass(r) {
    if (r === "exotic") return "exotic";
    if (r === "named") return "named";
    if (r === "gearset") return "gearset";
    if (r === "highend") return "highend";
    return "";
  }

  function gearIcon(p) {
    if (p.icon) return '<img src="' + p.icon + '" alt="" width="34" height="34" loading="lazy">';
    const letter = p.letter || (p.name || "?").slice(0, 2).toUpperCase();
    return '<span class="letter">' + STF.esc(letter) + "</span>";
  }

  function attrsLine(attrs) {
    if (!attrs || !attrs.length) return "";
    return (
      '<div class="gear-attrs" title="Priority attributes">' +
      attrs
        .map(function (a) {
          return '<span class="attr-chip">' + STF.esc(a) + "</span>";
        })
        .join("") +
      "</div>"
    );
  }

  function modsLine(mods) {
    if (!mods || !mods.length) return "";
    return (
      '<div class="gear-mods" title="Recommended gear mods">' +
      '<span class="mod-label">mod</span> ' +
      STF.esc(mods.join(" · ")) +
      "</div>"
    );
  }

  function findGear(buildId, slot) {
    const b = builds.find(function (x) {
      return x.id === buildId;
    });
    if (!b) return null;
    return (b.gear || []).find(function (g) {
      return g.slot === slot;
    });
  }

  /* Inventory order: Mask, Chest, Backpack, Gloves, Holster, Kneepads → 2×3 */
  function renderCard(b) {
    const cats = (b.categories || []).join(" ");
    const stats = (b.stats || [])
      .map(function (s) {
        return (
          '<div class="stat"><span class="stat-label">' +
          STF.esc(s.label) +
          '</span><span class="stat-value">' +
          STF.esc(s.value) +
          "</span></div>"
        );
      })
      .join("");

    const weapons = (b.weapons || [])
      .map(function (w) {
        return (
          '<div class="wep-slot">' +
          '<span class="slot-tag">' +
          STF.esc(w.slot) +
          "</span>" +
          '<span class="wep-name ' +
          rarityNameClass(w.rarity) +
          '">' +
          STF.esc(w.name) +
          (w.alt ? " " + STF.esc(w.alt) : "") +
          "</span>" +
          (w.note ? '<span class="wep-note">' + STF.esc(w.note) + "</span>" : "") +
          "</div>"
        );
      })
      .join("");

    const gear = (b.gear || [])
      .map(function (p) {
        return (
          '<button type="button" class="gear-slot rarity-' +
          STF.esc(p.rarity || "brand") +
          '" data-build-id="' +
          STF.esc(b.id) +
          '" data-slot="' +
          STF.esc(p.slot) +
          '" aria-label="' +
          STF.esc(p.slot + ": " + p.name) +
          '">' +
          '<div class="gear-top">' +
          '<div class="gear-ico">' +
          gearIcon(p) +
          "</div>" +
          '<span class="gear-slot-label">' +
          STF.esc(p.slot) +
          "</span></div>" +
          '<div class="gear-slot-name ' +
          rarityNameClass(p.rarity) +
          '">' +
          STF.esc(p.name) +
          "</div>" +
          (p.talent ? '<div class="gear-talent">' + STF.esc(p.talent) + "</div>" : "") +
          attrsLine(p.attrs) +
          modsLine(p.mods) +
          '<div class="cores">' +
          coresHTML(p.cores) +
          "</div>" +
          "</button>"
        );
      })
      .join("");

    const skills = (b.skills || [])
      .map(function (s) {
        return (
          '<div class="skill-slot"><small>' +
          STF.esc(s.slot) +
          "</small><span>" +
          STF.esc(s.name) +
          "</span></div>"
        );
      })
      .join("");

    return (
      '<article class="inv-card" data-categories="' +
      cats +
      '">' +
      '<div class="inv-head"><div>' +
      '<span class="cat-badge">' +
      STF.esc(b.categoryLabel || "Build") +
      "</span>" +
      "<h2>" +
      STF.esc(b.name) +
      "</h2></div></div>" +
      '<div class="inv-hud">' +
      '<aside class="inv-stats" aria-label="Key stats">' +
      stats +
      "</aside>" +
      '<div class="inv-main">' +
      '<div class="inv-weapons" aria-label="Weapons">' +
      weapons +
      "</div>" +
      '<div class="inv-gear" aria-label="Gear">' +
      gear +
      "</div>" +
      '<div class="inv-bottom" aria-label="Skills and specialization">' +
      skills +
      '<div class="spec-slot">' +
      (b.specialization && b.specialization.icon
        ? '<img src="' + b.specialization.icon + '" alt="">'
        : "") +
      "<small>Spec</small><span>" +
      STF.esc((b.specialization && b.specialization.name) || "—") +
      "</span></div></div></div></div>" +
      '<div class="inv-notes">' +
      (b.playstyle
        ? '<div class="play-blurb"><strong>Playstyle</strong>' + STF.esc(b.playstyle) + "</div>"
        : "") +
      (b.hardcore
        ? '<div class="hc-blurb"><strong>Hardcore</strong>' + STF.esc(b.hardcore) + "</div>"
        : "") +
      "</div></article>"
    );
  }

  /* Gear detail modal (injected once) */
  const modal = document.createElement("div");
  modal.id = "gear-modal";
  modal.className = "gear-modal";
  modal.hidden = true;
  modal.innerHTML =
    '<div class="gear-modal-backdrop" data-close="1"></div>' +
    '<div class="gear-modal-panel" role="dialog" aria-modal="true" aria-labelledby="gear-modal-title">' +
    '<button type="button" class="gear-modal-close" data-close="1" aria-label="Close">×</button>' +
    '<div class="gear-modal-ico" id="gear-modal-ico"></div>' +
    '<div class="gear-modal-slot" id="gear-modal-slot"></div>' +
    '<h3 id="gear-modal-title"></h3>' +
    '<div class="gear-modal-cores" id="gear-modal-cores"></div>' +
    '<div class="gear-modal-section" id="gear-modal-talent-wrap" hidden>' +
    "<strong>Talent</strong><span id=\"gear-modal-talent\"></span></div>" +
    '<div class="gear-modal-section"><strong>Attributes</strong>' +
    '<div class="gear-modal-chips" id="gear-modal-attrs"></div></div>' +
    '<div class="gear-modal-section"><strong>Gear mods</strong>' +
    '<div class="gear-modal-chips" id="gear-modal-mods"></div></div>' +
    "</div>";
  document.body.appendChild(modal);

  function chipsHTML(list, emptyLabel) {
    if (!list || !list.length) {
      return '<span class="gear-modal-empty">' + STF.esc(emptyLabel) + "</span>";
    }
    return list
      .map(function (a) {
        return '<span class="attr-chip">' + STF.esc(a) + "</span>";
      })
      .join("");
  }

  function openGearModal(p) {
    if (!p) return;
    document.getElementById("gear-modal-slot").textContent = p.slot || "";
    const title = document.getElementById("gear-modal-title");
    title.textContent = p.name || "";
    title.className = rarityNameClass(p.rarity);
    document.getElementById("gear-modal-ico").innerHTML = gearIcon(p);
    document.getElementById("gear-modal-cores").innerHTML = coresHTML(p.cores);
    const tw = document.getElementById("gear-modal-talent-wrap");
    if (p.talent) {
      tw.hidden = false;
      document.getElementById("gear-modal-talent").textContent = p.talent;
    } else {
      tw.hidden = true;
    }
    document.getElementById("gear-modal-attrs").innerHTML = chipsHTML(
      p.attrs,
      "No priority attrs listed"
    );
    document.getElementById("gear-modal-mods").innerHTML = chipsHTML(
      p.mods,
      p.rarity === "exotic" ? "Exotic — no mod slot" : "No mod slot on this piece"
    );
    modal.hidden = false;
    document.body.classList.add("modal-open");
  }

  function closeGearModal() {
    modal.hidden = true;
    document.body.classList.remove("modal-open");
  }

  modal.addEventListener("click", function (e) {
    if (e.target.closest("[data-close]")) closeGearModal();
  });

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && !modal.hidden) closeGearModal();
  });

  rail.addEventListener("click", function (e) {
    const btn = e.target.closest(".gear-slot");
    if (!btn || !rail.contains(btn)) return;
    openGearModal(findGear(btn.getAttribute("data-build-id"), btn.getAttribute("data-slot")));
  });

  filtersEl.innerHTML = FILTERS.map(function (f, i) {
    return (
      '<button type="button" class="chip" data-filter="' +
      f.id +
      '" aria-pressed="' +
      (i === 0 ? "true" : "false") +
      '">' +
      STF.esc(f.label) +
      "</button>"
    );
  }).join("");

  rail.innerHTML = builds.map(renderCard).join("");

  function apply(id) {
    filtersEl.querySelectorAll(".chip").forEach(function (btn) {
      btn.setAttribute("aria-pressed", btn.getAttribute("data-filter") === id ? "true" : "false");
    });
    let n = 0;
    rail.querySelectorAll(".inv-card").forEach(function (card) {
      const list = (card.getAttribute("data-categories") || "").split(/\s+/);
      const show = id === "all" || list.indexOf(id) !== -1;
      card.classList.toggle("hidden", !show);
      if (show) n++;
    });
    if (countEl) countEl.textContent = n + " build" + (n === 1 ? "" : "s");
    if (empty) empty.classList.toggle("visible", n === 0);
  }

  filtersEl.addEventListener("click", function (e) {
    const btn = e.target.closest(".chip");
    if (btn) apply(btn.getAttribute("data-filter"));
  });

  apply("all");
})();
