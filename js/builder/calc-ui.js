/* Calculator tab. Reads the loadout the builder already holds. */
(function () {
  var WEAPONS = [
    { id: "primary", label: "Primary" },
    { id: "secondary", label: "Secondary" },
    { id: "sidearm", label: "Sidearm" }
  ];

  function esc(value) {
    if (window.STF && STF.esc) return STF.esc(value);
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function commas(value) {
    if (value == null || value === "") return "—";
    var n = Number(value);
    if (!isFinite(n)) return "—";
    return Math.round(n).toLocaleString("en-US");
  }

  function pct(value) {
    if (value == null || value === "") return "—";
    var n = Math.round(Number(value) * 10) / 10;
    return n + "%";
  }

  function ensure(state) {
    if (!state.calculator) state.calculator = { weapon: "primary", outOfCover: true, talents: {} };
    if (!state.calculator.talents) state.calculator.talents = {};
    if (state.calculator.outOfCover == null) state.calculator.outOfCover = true;
    return state.calculator;
  }

  function talentState(calc, name) {
    if (!calc.talents[name]) calc.talents[name] = { on: false, stacks: 0, uptime: 100 };
    return calc.talents[name];
  }

  function render(el, state, catalog) {
    if (!el || !window.ShadeCalc) return;
    var calc = ensure(state);
    var row = ShadeCalc.calculate(state, catalog, calc.weapon, ShadeCalc.assumptionsOf(state));
    el.innerHTML = view(state, row);
    if (!el.dataset.bound) {
      el.dataset.bound = "1";
      el.addEventListener("click", function (e) {
        var tab = e.target.closest("[data-calc-weapon]");
        if (!tab) return;
        ensure(el._state).weapon = tab.getAttribute("data-calc-weapon");
        render(el, el._state, el._catalog);
      });
      el.addEventListener("change", function (e) {
        var live = el._state;
        var bag = ensure(live);
        if (e.target.getAttribute("data-cover") != null) {
          bag.outOfCover = e.target.checked;
          render(el, live, el._catalog);
          return;
        }
        var name = e.target.getAttribute("data-talent");
        if (!name) return;
        var saved = talentState(bag, name);
        if (e.target.getAttribute("data-talent-on") != null) {
          saved.on = e.target.checked;
          var max = Number(e.target.getAttribute("data-max"));
          if (saved.on && max > 1 && !saved.stacks) saved.stacks = max;
        }
        render(el, live, el._catalog);
      });
      el.addEventListener("input", function (e) {
        var name = e.target.getAttribute("data-talent");
        if (!name) return;
        var saved = talentState(ensure(el._state), name);
        if (e.target.getAttribute("data-stacks") != null) saved.stacks = Number(e.target.value);
        if (e.target.getAttribute("data-uptime") != null) saved.uptime = Number(e.target.value);
        var readout = e.target.parentElement && e.target.parentElement.querySelector("strong");
        if (readout) readout.textContent = e.target.getAttribute("data-uptime") != null ? e.target.value + "%" : e.target.value;
        fill(el, ShadeCalc.calculate(el._state, el._catalog, ensure(el._state).weapon, ShadeCalc.assumptionsOf(el._state)));
      });
    }
    el._state = state;
    el._catalog = catalog;
    fill(el, ShadeCalc.calculate(state, catalog, ensure(state).weapon, ShadeCalc.assumptionsOf(state)));
  }

  function fill(el, row) {
    el.querySelectorAll("[data-out]").forEach(function (node) {
      var key = node.getAttribute("data-out");
      node.textContent = textFor(row, key);
    });
  }

  function textFor(row, key) {
    var map = {
      rpm: row.rpm == null ? "—" : String(row.rpm),
      mag: row.mag == null ? "—" : String(row.mag),
      reload: row.reload == null ? "—" : row.reload + "s",
      baseDamage: commas(row.baseDamage),
      weaponDamage: row.sourced ? commas(row.health.body) : "—",
      avgShot: row.base ? commas(row.base.avgShot) : "—",
      dmgPerMag: row.base ? commas(row.base.dmgPerMag) : "—",
      burstDps: row.base ? commas(row.base.burstDps) : "—",
      sustainedDps: row.base ? commas(row.base.sustainedDps) : "—",
      effAvgShot: row.effective ? commas(row.effective.avgShot) : "—",
      effDmgPerMag: row.effective ? commas(row.effective.dmgPerMag) : "—",
      effBurstDps: row.effective ? commas(row.effective.burstDps) : "—",
      effSustainedDps: row.effective ? commas(row.effective.sustainedDps) : "—",
      allWeaponDamage: pct(row.stats.allWeaponDamage),
      specialization: pct(row.stats.specialization),
      weaponDamageStat: pct(row.stats.weaponDamage),
      totalWeaponDamage: pct(row.stats.totalWeaponDamage),
      criticalHitChance: pct(row.stats.criticalHitChance),
      criticalHitDamage: pct(row.stats.criticalHitDamage),
      headshotDamage: pct(row.stats.headshotDamage),
      damageToArmor: pct(row.stats.damageToArmor),
      damageToHealth: pct(row.stats.damageToHealth),
      dtoc: pct(row.stats.damageToTargetOutOfCover),
      body: commas(row.health.body),
      bodyCrit: commas(row.health.bodyCrit),
      head: commas(row.health.head),
      headCrit: commas(row.health.headCrit),
      bodyArmor: commas(row.armorPool.body),
      bodyCritArmor: commas(row.armorPool.bodyCrit),
      headArmor: commas(row.armorPool.head),
      headCritArmor: commas(row.armorPool.headCrit)
    };
    return map[key] == null ? "—" : map[key];
  }

  function view(state, row) {
    var calc = ensure(state);
    var tabs = WEAPONS.map(function (weapon) {
      var item = state[weapon.id] || {};
      var on = calc.weapon === weapon.id ? " is-on" : "";
      return '<button type="button" class="bb-chip' + on + '" data-calc-weapon="' + weapon.id + '">' + esc(weapon.label) + (item.name ? " · " + esc(item.name) : "") + "</button>";
    }).join("");
    var talents = (row.talents || []).map(function (talent) {
      if (!talent.modeled) {
        return '<article class="bc-talent"><header><strong>' + esc(talent.name) + '</strong></header><p>Not included in calculations</p></article>';
      }
      var saved = talentState(calc, talent.name);
      var stacks = "";
      if (talent.maxStacks > 1) {
        stacks = '<label class="bc-slide"><span>' + esc(talent.stackLabel || "Stacks") + ' <strong>' + esc(saved.stacks) + "/" + talent.maxStacks + '</strong></span>' +
          '<input type="range" min="0" max="' + talent.maxStacks + '" step="1" value="' + Number(saved.stacks || 0) + '" data-talent="' + esc(talent.name) + '" data-stacks="1" data-max="' + talent.maxStacks + '"></label>';
      }
      return '<article class="bc-talent"><header><label class="bb-check"><input type="checkbox" data-talent="' + esc(talent.name) + '" data-talent-on="1" data-max="' + talent.maxStacks + '"' + (saved.on ? " checked" : "") + "> " + esc(talent.name) + "</label></header>" +
        stacks +
        '<label class="bc-slide"><span>Uptime <strong>' + esc(saved.uptime == null ? 100 : saved.uptime) + '%</strong></span>' +
        '<input type="range" min="0" max="100" step="1" value="' + Number(saved.uptime == null ? 100 : saved.uptime) + '" data-talent="' + esc(talent.name) + '" data-uptime="1"></label></article>';
    }).join("");
    if (!talents) talents = '<p class="lede">No weapon or gear talents on this loadout.</p>';
    var missing = row.sourced ? "" : '<p class="lede">This weapon has no sourced base damage, RPM, magazine, or reload, so the shot numbers stay blank.</p>';
    return '<div class="bc-wrap">' +
      '<div class="bb-chips">' + tabs + "</div>" +
      '<label class="bb-check"><input type="checkbox" data-cover="1"' + (calc.outOfCover !== false ? " checked" : "") + "> Target is out of cover</label>" +
      '<section class="bc-block"><h3>Talent modifiers</h3><div class="bc-talents">' + talents + "</div></section>" +
      '<section class="bc-block"><h3>Weapon</h3>' + missing +
      '<dl class="bc-weapon">' +
      "<div><dt>RPM</dt><dd data-out=\"rpm\"></dd></div>" +
      "<div><dt>Mag size</dt><dd data-out=\"mag\"></dd></div>" +
      "<div><dt>Reload</dt><dd data-out=\"reload\"></dd></div>" +
      "<div><dt>Base damage</dt><dd data-out=\"baseDamage\"></dd></div>" +
      "<div><dt>Weapon damage</dt><dd data-out=\"weaponDamage\"></dd></div>" +
      "</dl></section>" +
      '<section class="bc-block"><h3>DPS overview</h3>' +
      '<div class="bc-table"><div></div><div>Burst DPS</div><div>Sustained DPS</div><div>Damage per mag</div><div>Average shot</div>' +
      '<div>Base</div><div data-out="burstDps"></div><div data-out="sustainedDps"></div><div data-out="dmgPerMag"></div><div data-out="avgShot"></div>' +
      '<div>With build</div><div data-out="effBurstDps"></div><div data-out="effSustainedDps"></div><div data-out="effDmgPerMag"></div><div data-out="effAvgShot"></div>' +
      "</div></section>" +
      '<section class="bc-block"><h3>Build stats</h3><dl class="bc-stats">' +
      stat("All weapon damage", "allWeaponDamage") +
      stat("Specialization", "specialization") +
      stat("Weapon damage", "weaponDamageStat") +
      stat("Total weapon damage", "totalWeaponDamage") +
      stat("CHC", "criticalHitChance") +
      stat("CHD", "criticalHitDamage") +
      stat("HSD", "headshotDamage") +
      stat("Damage to armor", "damageToArmor") +
      stat("Damage to health", "damageToHealth") +
      stat("DTOC", "dtoc") +
      "</dl></section>" +
      '<section class="bc-block"><h3>Damage numbers</h3>' +
      '<div class="bc-table bc-hits"><div></div><div>Health</div><div>Armor</div>' +
      "<div>Body</div><div data-out=\"body\"></div><div data-out=\"bodyArmor\"></div>" +
      "<div>Body crit</div><div data-out=\"bodyCrit\"></div><div data-out=\"bodyCritArmor\"></div>" +
      "<div>Headshot</div><div data-out=\"head\"></div><div data-out=\"headArmor\"></div>" +
      "<div>Headshot crit</div><div data-out=\"headCrit\"></div><div data-out=\"headCritArmor\"></div>" +
      "</div><p class=\"lede\">Headshots include the weapon's innate headshot (" + esc(row.innateHeadshot || 0) + "%). Average shot assumes no headshots.</p></section>" +
      "</div>";
  }

  function stat(label, key) {
    return "<div><dt>" + esc(label) + "</dt><dd data-out=\"" + key + "\"></dd></div>";
  }

  window.ShadeCalcUI = { render: render };
})();
