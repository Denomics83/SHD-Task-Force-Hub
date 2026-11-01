#!/usr/bin/env python3
"""Fetch one ProtoTrack targeted-loot page and update data/loot.json.

Writes the file when the loot date changed, or when the date is unchanged
but saved rows are missing faction / brand icons. A layout that is not
5 escalation missions and 2 requisition caches exits without writing.
"""

import html
import json
import re
import sys
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LOOT_PATH = ROOT / "data" / "loot.json"
ICONS_PATH = ROOT / "data" / "icons.json"
URL = "https://prototrack.gg/target-loot/target-loot.php"
UA = "SHD-Task-Force-Hub clan site (github.com/Denomics83/SHD-Task-Force-Hub)"
GENERIC = "assets/icons/loot/generic.svg"

FOLDER_KIND = {
    "factions": "faction",
    "brandsets": "brand",
    "brands": "brand",
    "gearsets": "gearset",
    "weapons": "weapon",
    "gear": "slot",
}


def normalise(name):
    text = html.unescape(str(name or "")).lower().replace("&", " and ")
    text = text.replace("'", "").replace("’", "")
    text = re.sub(r"[^a-z0-9]+", " ", text)
    return re.sub(r"\s+", " ", text).strip()


def unescape(value):
    text = str(value or "")
    for _ in range(2):
        nxt = html.unescape(text)
        if nxt == text:
            break
        text = nxt
    return text.strip()


def load_icons():
    try:
        doc = json.loads(ICONS_PATH.read_text())
    except (OSError, json.JSONDecodeError) as err:
        print("warning: could not read icons.json: %s" % err, file=sys.stderr)
        return {}, {}
    by_proto = {}
    by_key = {}

    def add(key, icon):
        if key and key not in by_key:
            by_key[key] = icon

    for icon in doc.get("icons") or []:
        proto = icon.get("proto") or ""
        kind = icon.get("kind") or ""
        if proto and kind:
            by_proto[(kind, proto)] = icon
        for alias in [icon.get("name"), icon.get("slug"), proto] + list(icon.get("aliases") or []):
            phrase = normalise(alias)
            if not phrase:
                continue
            add(phrase, icon)
            add(phrase.replace(" ", ""), icon)
    return by_proto, by_key


BY_PROTO, BY_KEY = load_icons()


def lookup_name(name):
    phrase = normalise(name)
    if not phrase:
        return None
    return BY_KEY.get(phrase) or BY_KEY.get(phrase.replace(" ", ""))


def lookup_src(src):
    path = unescape(src).split("?", 1)[0]
    match = re.search(
        r"/(factions|brandsets|brands|gearsets|weapons|gear)/([^/]+)\.(?:png|svg|webp)$",
        path,
    )
    if not match:
        return None
    return BY_PROTO.get((FOLDER_KIND[match.group(1)], match.group(2)))


def classify(name, src=""):
    icon = lookup_src(src) or lookup_name(name)
    if icon:
        return icon.get("kind") or "unknown", icon.get("slug") or "", icon.get("file") or GENERIC
    print("warning: no logo for %r; using generic icon" % name, file=sys.stderr)
    return "unknown", "", GENERIC


def faction_from(src, alt):
    icon = lookup_src(src) or lookup_name(re.sub(r"\s+faction$", "", unescape(alt), flags=re.I))
    if icon:
        return icon.get("name") or "", icon.get("file") or GENERIC
    label = re.sub(r"\s+faction$", "", unescape(alt), flags=re.I).strip()
    if label:
        print("warning: no faction icon for %r; using generic icon" % label, file=sys.stderr)
    return label, GENERIC


def fetch():
    req = urllib.request.Request(URL, headers={"User-Agent": UA, "Accept": "text/html"})
    with urllib.request.urlopen(req, timeout=30) as res:
        return res.read().decode("utf-8", "replace")


def tag_attr(tag, name):
    if hasattr(tag, "group"):
        tag = tag.group(0)
    match = re.search(r'\b%s="([^"]*)"' % re.escape(name), tag or "")
    return unescape(match.group(1)) if match else ""


def parse(html_text):
    date_match = re.search(
        r'Loot date</span>\s*<strong><time datetime="(\d{4}-\d{2}-\d{2})"',
        html_text,
    )
    week = re.search(
        r'Rotation week</span>\s*<strong><time datetime="(\d{4}-\d{2}-\d{2})">.*?'
        r'<time datetime="(\d{4}-\d{2}-\d{2})">',
        html_text,
        re.S,
    )
    table = re.search(
        r'aria-label="Escalation target loot and history"(.*?)</table>',
        html_text,
        re.S,
    )
    missions = []
    if table:
        for cls, body in re.findall(r'<tr class="([^"]*)">(.*?)</tr>', table.group(1), re.S):
            mission = re.search(r'data-label="Mission".*?<span>([^<]+)</span>', body, re.S)
            faction_tag = re.search(r'<img[^>]*class="tl-faction-icon"[^>]*>', body)
            loot_tag = re.search(r'<img[^>]*\bdata-loot="[^"]*"[^>]*>', body)
            loot_span = re.search(
                r'data-label="Target Loot".*?<span>([^<]+)</span>',
                body,
                re.S,
            )
            if not mission or not (loot_tag or loot_span):
                continue
            loot_name = tag_attr(loot_tag, "data-loot") if loot_tag else ""
            if not loot_name and loot_span:
                loot_name = unescape(loot_span.group(1))
            priority = "priority-row" in cls or "priority-mark" in body
            missions.append({
                "mission": unescape(mission.group(1)),
                "faction_src": tag_attr(faction_tag, "src"),
                "faction_alt": tag_attr(faction_tag, "alt"),
                "loot": loot_name,
                "loot_src": tag_attr(loot_tag, "src"),
                "priority": priority,
            })

    caches = []
    for label, body in re.findall(
        r'aria-label="(Prototype (?:Gear|Weapon) Cache)"(.*?)</article>',
        html_text,
        re.S,
    ):
        loot_tag = re.search(r'class="tl-loot"[^>]*>\s*<img[^>]*>', body, re.S)
        loot_span = re.search(r'class="tl-loot"[^>]*>.*?<span>([^<]+)</span>', body, re.S)
        if not loot_span:
            continue
        caches.append({
            "cache": unescape(label),
            "loot": unescape(loot_span.group(1)),
            "loot_src": tag_attr(loot_tag.group(0) if loot_tag else "", "src"),
        })

    return {
        "date": date_match.group(1) if date_match else "",
        "week_of": week.group(1) if week else "",
        "week_end": week.group(2) if week else "",
        "missions": missions,
        "caches": caches,
    }


def load_existing():
    try:
        return json.loads(LOOT_PATH.read_text())
    except (OSError, json.JSONDecodeError):
        return {}


def needs_icon_backfill(existing):
    rows = existing.get("escalations") or []
    caches = existing.get("protoCaches") or []
    if len(rows) != 5 or len(caches) != 2:
        return True
    for row in rows:
        if not row.get("missionIcon") or not row.get("slug"):
            return True
    for row in caches:
        if not row.get("slug") or not row.get("cacheIcon"):
            return True
    return False


def build(parsed, existing):
    dark = existing.get("darkZone") or [
        {"map": "DZ East", "loot": "confirm in-game", "kind": "unknown", "icon": "", "badge": ""},
        {"map": "DZ South", "loot": "confirm in-game", "kind": "unknown", "icon": "", "badge": ""},
        {"map": "DZ West", "loot": "confirm in-game", "kind": "unknown", "icon": "", "badge": ""},
    ]
    now = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M")
    week_of = parsed["week_of"] or existing.get("weekOf") or ""
    week_end = parsed["week_end"] or existing.get("weekEnd") or ""
    note = (
        "Escalation targeted loot for %s (rotation week %s to %s, daily reset 08:00 UTC). "
        "Dark Zone targeted loot is not on the ProtoTrack board."
    ) % (parsed["date"], week_of, week_end)
    escalations = []
    for row in parsed["missions"]:
        faction, mission_icon = faction_from(row["faction_src"], row["faction_alt"])
        kind, slug, icon = classify(row["loot"], row["loot_src"])
        item = {
            "mission": row["mission"],
            "faction": faction,
            "missionIcon": mission_icon,
            "loot": row["loot"],
            "kind": kind,
            "slug": slug,
            "icon": icon,
        }
        if row["priority"]:
            item["priority"] = True
        escalations.append(item)
    caches = []
    for row in parsed["caches"]:
        kind, slug, icon = classify(row["loot"], row["loot_src"])
        caches.append({
            "cache": row["cache"],
            "cacheIcon": GENERIC,
            "loot": row["loot"],
            "kind": kind,
            "slug": slug,
            "icon": icon,
        })
    return {
        "source": "https://prototrack.gg/",
        "sourceName": "ProtoTrack.gg",
        "lootDate": parsed["date"],
        "weekOf": week_of,
        "weekEnd": week_end,
        "updated": now,
        "note": note,
        "escalations": escalations,
        "protoCaches": caches,
        "darkZone": dark,
    }


def main():
    try:
        page = fetch()
    except Exception as err:
        print("fetch failed: %s" % err, file=sys.stderr)
        return 1

    parsed = parse(page)
    if not parsed["date"] or len(parsed["missions"]) != 5 or len(parsed["caches"]) != 2:
        print(
            "not writing: date=%r missions=%d caches=%d"
            % (parsed["date"], len(parsed["missions"]), len(parsed["caches"])),
            file=sys.stderr,
        )
        return 0

    existing = load_existing()
    if existing.get("lootDate") == parsed["date"] and not needs_icon_backfill(existing):
        print("Loot date unchanged (%s); not writing." % parsed["date"])
        return 0

    payload = build(parsed, existing)
    LOOT_PATH.write_text(json.dumps(payload, indent=2) + "\n")
    print("Wrote %s for %s" % (LOOT_PATH, parsed["date"]))
    return 0


if __name__ == "__main__":
    sys.exit(main())
