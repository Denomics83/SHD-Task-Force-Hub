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

STF.bottomNavHTML = function (active) {
  const tabs = [
    { id: "events", href: "index.html", label: "Events", ico: "◈" },
    { id: "builds", href: "builds.html", label: "Builds", ico: "⬡" },
    { id: "resources", href: "resources.html", label: "Resources", ico: "▣" },
    { id: "more", href: null, label: "More", ico: "⋯", disabled: true }
  ];
  return (
    '<nav class="bottom-nav" aria-label="Primary">' +
    tabs
      .map(function (t) {
        if (t.disabled) {
          return (
            '<span class="nav-disabled" aria-disabled="true" title="Coming soon">' +
            '<span class="nav-ico" aria-hidden="true">' + t.ico + "</span>" +
            "<span>" + t.label + "</span></span>"
          );
        }
        const cls = t.id === active ? " active" : "";
        const aria = t.id === active ? ' aria-current="page"' : "";
        return (
          '<a href="' + t.href + '" class="' + cls.trim() + '"' + aria + ">" +
          '<span class="nav-ico" aria-hidden="true">' + t.ico + "</span>" +
          "<span>" + t.label + "</span></a>"
        );
      })
      .join("") +
    "</nav>"
  );
};

STF.topbarHTML = function (pageLabel) {
  return (
    '<header class="topbar">' +
    '<a class="brand" href="index.html">' +
    '<img src="assets/clan-mark.svg" alt="" width="34" height="34">' +
    '<div class="brand-text"><strong>Shade Task Force Hub</strong>' +
    "<span>Division 2 · Clan</span></div></a>" +
    (pageLabel ? '<span class="page-chip">' + STF.esc(pageLabel) + "</span>" : "") +
    "</header>"
  );
};

STF.mountChrome = function (active, pageLabel) {
  const top = document.getElementById("topbar-root");
  const bottom = document.getElementById("bottomnav-root");
  if (top) top.innerHTML = STF.topbarHTML(pageLabel);
  if (bottom) bottom.innerHTML = STF.bottomNavHTML(active);
};
