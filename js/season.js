(async function () {
  STF.mountChrome("events", "Season");
  const title = document.getElementById("season-title");
  const summary = document.getElementById("season-summary");
  const tabs = document.getElementById("season-tabs");
  const panels = {
    manhunts: document.getElementById("panel-manhunts"),
    maps: document.getElementById("panel-maps"),
    modifiers: document.getElementById("panel-modifiers")
  };

  function renderList(el, items) {
    if (!el) return;
    el.innerHTML = (items || [])
      .map(function (it) {
        return (
          '<article class="season-item">' +
          (it.status ? '<span class="status">' + STF.esc(it.status) + "</span>" : "") +
          "<h3>" + STF.esc(it.title) + "</h3>" +
          "<p>" + STF.esc(it.blurb) + "</p></article>"
        );
      })
      .join("");
  }

  try {
    const data = await STF.fetchJSON("data/season.json");
    if (title) title.textContent = (data.yearSeason || "") + " — " + (data.name || "Season");
    if (summary) {
      summary.textContent =
        (data.summary || "") +
        (data.patch ? " · Patch: " + data.patch : "");
    }
    renderList(panels.manhunts, data.manhunts);
    renderList(panels.maps, data.maps);
    renderList(panels.modifiers, data.modifiers);
  } catch (e) {
    if (summary) summary.textContent = "Could not load season data.";
  }

  if (tabs) {
    tabs.addEventListener("click", function (e) {
      const btn = e.target.closest(".subtab");
      if (!btn) return;
      const id = btn.getAttribute("data-panel");
      tabs.querySelectorAll(".subtab").forEach(function (b) {
        b.setAttribute("aria-selected", b === btn ? "true" : "false");
      });
      Object.keys(panels).forEach(function (key) {
        if (panels[key]) panels[key].classList.toggle("active", key === id);
      });
    });
  }
})();
