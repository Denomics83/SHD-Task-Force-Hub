/* Shared helpers — Shade Hub */
window.STF = window.STF || {};

STF.fetchJSON = async function (path) {
  var sep = path.indexOf("?") >= 0 ? "&" : "?";
  var res = await fetch(path + sep + "t=" + Date.now(), { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to load " + path);
  return res.json();
};

STF.esc = function (s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
};

STF.formatDate = function (iso) {
  if (!iso) return "";
  var p = String(iso).split("-");
  if (p.length < 3) return String(iso);
  var months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  var day = parseInt(p[2], 10);
  var mon = months[parseInt(p[1], 10) - 1] || "";
  return day + " " + mon + " " + p[0];
};

STF.NAV_ICONS = {
  updates:
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 10v4h3l5 3V7L7 10H4z"/><path d="M16 9.2a3.4 3.4 0 0 1 0 5.6"/><path d="M18.3 6.8a6.5 6.5 0 0 1 0 10.4"/></svg>',
  events:
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4.2a7.3 7.3 0 0 0-7.3 7.3c0 1.4.4 2.7 1.1 3.8L4.2 19.8l4.5-1.6A7.3 7.3 0 1 0 12 4.2z"/></svg>',
  loot:
    '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="6.1"/><path d="M12 2.2v3.1M12 18.7v3.1M2.2 12h3.1M18.7 12h3.1"/></svg>',
  resources:
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4.5h9.2L19 9.2V19.5H5z"/><path d="M14 4.8V9h4.2"/></svg>',
  chat:
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 6.5h14v9H8.5L5 18.2z"/></svg>'
};

STF.bottomNavHTML = function (active) {
  var tabs = [
    { id: "updates", href: "index.html", label: "Updates" },
    { id: "events", href: "events.html", label: "Events" },
    { id: "loot", href: "loot.html", label: "Loot" },
    { id: "resources", href: "resources.html?tab=builds", label: "Resources" },
    { id: "chat", href: "chat.html", label: "Chat" }
  ];
  return (
    '<nav class="bottom-nav" aria-label="Primary">' +
    tabs
      .map(function (t) {
        var cls = t.id === active ? " active" : "";
        var aria = t.id === active ? ' aria-current="page"' : "";
        return (
          '<a href="' + t.href + '" class="' + cls.trim() + '"' + aria + ">" +
          '<span class="nav-ico">' + STF.NAV_ICONS[t.id] + "</span>" +
          "<span>" + t.label + "</span></a>"
        );
      })
      .join("") +
    "</nav>"
  );
};

STF.topbarHTML = function () {
  return (
    '<header class="topbar">' +
    '<a class="brand" href="index.html">' +
    "<strong>Shade Hub</strong></a>" +
    '<button type="button" class="profile-btn" id="profile-btn" aria-label="Sign in">' +
    '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8.2" r="3.1" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M5.5 19.2c1.1-3.1 3.2-4.6 6.5-4.6s5.4 1.5 6.5 4.6" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>' +
    "</button></header>"
  );
};

STF.openSignIn = function () {
  var old = document.getElementById("signin-panel");
  if (old) {
    old.remove();
    return;
  }
  var el = document.createElement("div");
  el.id = "signin-panel";
  el.className = "signin-panel";
  el.innerHTML =
    '<div class="signin-card" role="dialog" aria-labelledby="signin-title">' +
    '<h2 id="signin-title">Sign in coming soon</h2>' +
    "<p>Profile will be sign up, log in, and log out. Nothing else lives here yet.</p>" +
    '<button type="button" class="admin-btn" id="signin-close">Close</button>' +
    "</div>";
  document.body.appendChild(el);
  el.querySelector("#signin-close").addEventListener("click", function () { el.remove(); });
  el.addEventListener("click", function (e) { if (e.target === el) el.remove(); });
};

STF.mountChrome = function (active) {
  var top = document.getElementById("topbar-root");
  var bottom = document.getElementById("bottomnav-root");
  if (top) top.innerHTML = STF.topbarHTML();
  if (bottom) bottom.innerHTML = STF.bottomNavHTML(active || "");
  var profile = document.getElementById("profile-btn");
  if (profile) profile.addEventListener("click", STF.openSignIn);
};

STF.openMap = function (src, caption) {
  var old = document.getElementById("map-zoom");
  if (old) old.remove();
  var el = document.createElement("div");
  el.id = "map-zoom";
  el.className = "map-zoom";
  el.innerHTML =
    '<button type="button" class="map-zoom-close" aria-label="Close map">×</button>' +
    '<div class="map-zoom-stage"><img alt="Map" src="' + STF.esc(src) + '"></div>' +
    (caption ? "<p>" + STF.esc(caption) + "</p>" : "");
  document.body.appendChild(el);
  var img = el.querySelector("img");
  var stage = el.querySelector(".map-zoom-stage");
  var scale = 1;
  var startDist = 0;
  var startScale = 1;
  stage.addEventListener("touchmove", function (e) {
    if (e.touches.length !== 2) return;
    e.preventDefault();
    var dx = e.touches[0].clientX - e.touches[1].clientX;
    var dy = e.touches[0].clientY - e.touches[1].clientY;
    var dist = Math.hypot(dx, dy);
    if (!startDist) {
      startDist = dist;
      startScale = scale;
    }
    scale = Math.min(4, Math.max(1, startScale * (dist / startDist)));
    img.style.transform = "scale(" + scale + ")";
  }, { passive: false });
  stage.addEventListener("touchend", function () { startDist = 0; });
  img.addEventListener("click", function () {
    scale = scale > 1 ? 1 : 2;
    img.style.transform = "scale(" + scale + ")";
  });
  el.querySelector(".map-zoom-close").addEventListener("click", function () { el.remove(); });
};
