/* Resources landing. Maps, Hunters, Manhunts, and Creators open a short detail. Events opens admin. */
(function () {
  STF.mountChrome("resources");

  var landing = document.getElementById("res-landing");
  var resDetail = document.getElementById("res-detail");
  var resBody = document.getElementById("res-detail-body");
  var resBack = document.getElementById("res-back");
  var RES = {
    maps: {
      title: "Maps",
      html:
        "<p>SHD Tech caches and open-world markers.</p>" +
        '<p><a href="https://division2map.com/" target="_blank" rel="noopener">division2map.com</a></p>' +
        '<p class="muted">Hide all, then enable SHD Tech.</p>'
    },
    hunters: {
      title: "Hunter Guides",
      html: "<p>Hunter routes are not seeded in the hub yet. No mask locations are listed here.</p>"
    },
    manhunts: {
      title: "Manhunts",
      html:
        "<p>Current season manhunt, maps, and modifiers.</p>" +
        '<p><a href="season.html">Open Red Horizon season</a></p>'
    },
    creators: {
      title: "Creators",
      html: "<p>Creator links are not seeded yet.</p>"
    }
  };

  function showLanding() {
    if (landing) landing.hidden = false;
    if (resDetail) resDetail.hidden = true;
  }

  function openRes(id, push) {
    var item = RES[id];
    if (!item || !resBody) return;
    if (landing) landing.hidden = true;
    if (resDetail) resDetail.hidden = false;
    resBody.innerHTML = "<h1>" + STF.esc(item.title) + "</h1>" + item.html;
    window.scrollTo(0, 0);
    if (push) history.pushState({ res: id }, "", "#" + id);
  }

  if (landing) {
    landing.addEventListener("click", function (e) {
      var btn = e.target.closest("[data-res]");
      if (!btn) return;
      openRes(btn.getAttribute("data-res"), true);
    });
  }
  if (resBack) {
    resBack.addEventListener("click", function () {
      history.pushState({ res: null }, "", "resources.html");
      showLanding();
    });
  }
  window.addEventListener("popstate", function () {
    var id = (location.hash || "").replace("#", "");
    if (RES[id]) openRes(id, false);
    else showLanding();
  });

  var start = (location.hash || "").replace("#", "");
  if (RES[start]) openRes(start, false);
})();
