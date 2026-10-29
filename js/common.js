/* Shared helpers — Shade Task Force Hub */
window.STF = window.STF || {};

STF.fetchJSON = async function (path) {
  const res = await fetch(path, { cache: "no-store" });
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
  builds:
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.2 19.6 6v5.7c0 4.5-3.2 7.1-7.6 8.5-4.4-1.4-7.6-4-7.6-8.5V6L12 3.2z"/><path d="m8.7 12.1 2.2 2.2 4.4-4.4"/></svg>',
  resources:
    '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="8" r="2.7"/><circle cx="16.6" cy="9.1" r="2"/><path d="M3.8 19.2c.7-2.8 2.7-4.2 5.2-4.2s4.5 1.4 5.2 4.2"/><path d="M14.2 15.2c1.5.15 2.9.9 3.6 2.5"/></svg>'
};

STF.bottomNavHTML = function (active) {
  var tabs = [
    { id: "updates", href: "index.html", label: "Updates" },
    { id: "events", href: "events.html", label: "Events" },
    { id: "loot", href: "loot.html", label: "Loot" },
    { id: "builds", href: "builds.html", label: "Builds" },
    { id: "resources", href: "resources.html", label: "Resources" }
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
    "<strong>Shade Task Force</strong>" +
    '<span class="hub-pill">Clan Hub</span></a>' +
    "</header>"
  );
};

STF.mountChrome = function (active) {
  var top = document.getElementById("topbar-root");
  var bottom = document.getElementById("bottomnav-root");
  if (top) top.innerHTML = STF.topbarHTML();
  if (bottom) bottom.innerHTML = STF.bottomNavHTML(active || "");
};
