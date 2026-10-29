#!/usr/bin/env python3
"""Rewrite local CSS/JS query strings and data/build-version.json.

GitHub Pages caches HTML and assets. Every deploy should pass a new version
so phones drop the previous script. External CDN URLs (Leaflet) stay as they are.
"""

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
VERSION = sys.argv[1] if len(sys.argv) > 1 else ""
if not re.fullmatch(r"[A-Za-z0-9._-]{4,40}", VERSION or ""):
    sys.exit("usage: stamp-assets.py <version>")

PAGES = [
    "index.html",
    "builds.html",
    "events.html",
    "loot.html",
    "resources.html",
    "season.html",
    "admin.html",
    "chat.html",
]

CACHE_METAS = """  <meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate">
  <meta http-equiv="Pragma" content="no-cache">
  <meta http-equiv="Expires" content="0">
  <meta name="stf-build" content="{version}">
"""

TOAST = """<script data-stf-toast>
(function () {
  var meta = document.querySelector('meta[name="stf-build"]');
  var current = meta ? meta.content : "";
  fetch("data/build-version.json?t=" + Date.now(), { cache: "no-store" })
    .then(function (res) { return res.ok ? res.json() : null; })
    .then(function (doc) {
      if (!doc || !doc.version || doc.version === current) return;
      if (document.querySelector(".build-toast")) return;
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "build-toast";
      btn.textContent = "New version available — tap to refresh";
      btn.addEventListener("click", function () { location.reload(); });
      document.body.appendChild(btn);
    })
    .catch(function () {});
})();
</script>
"""


def stamp_local_url(url):
    path = url.split("?", 1)[0]
    if path == "styles.css" or (path.startswith("js/") and path.endswith(".js")):
        return path + "?v=" + VERSION
    return url


def stamp_html(text):
    if 'http-equiv="Cache-Control"' not in text:
        text = text.replace(
            '<meta charset="utf-8">',
            '<meta charset="utf-8">\n' + CACHE_METAS.format(version=VERSION).rstrip("\n"),
            1,
        )
    text = re.sub(
        r'(<meta name="stf-build" content=")[^"]*(")',
        r"\g<1>" + VERSION + r"\2",
        text,
        count=1,
    )

    def repl_attr(match):
        return match.group(1) + stamp_local_url(match.group(2)) + match.group(3)

    text = re.sub(
        r'((?:href|src)=")([^"]+)(")',
        repl_attr,
        text,
    )
    if "data-stf-toast" not in text:
        text = text.replace("</body>", TOAST + "</body>", 1)
    return text


def main():
    for name in PAGES:
        path = ROOT / name
        updated = stamp_html(path.read_text())
        path.write_text(updated)
    version_path = ROOT / "data" / "build-version.json"
    version_path.write_text(json.dumps({"version": VERSION}, indent=2) + "\n")
    print("stamped", VERSION)


if __name__ == "__main__":
    main()
