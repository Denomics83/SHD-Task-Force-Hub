#!/usr/bin/env python3
"""Fetch one ProtoTrack targeted-loot page and update data/loot.json.

Writes the file only when the loot date changed and the page still has
5 escalation missions and 2 requisition caches. A layout change exits
without touching the file.
"""

import json
import re
import sys
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LOOT_PATH = ROOT / "data" / "loot.json"
URL = "https://prototrack.gg/target-loot/target-loot.php"
UA = "SHD-Task-Force-Hub clan site (github.com/Denomics83/SHD-Task-Force-Hub)"
GENERIC = "assets/icons/loot/generic.svg"

# name (normalised) -> (kind, icon, optional chip tone)
KNOWN = {
    "belstone armory": ("brand", "assets/icons/brands/belstone-mark.png", "belstone"),
    "wyvern wear": ("brand", "assets/icons/brands/wyvern-mark.png", "wyvern"),
    "murakami industries": ("brand", "assets/icons/brands/murakami.png", "murakami"),
    "airaldi holdings": ("brand", "assets/icons/brands/airaldi.png", "airaldi"),
    "alps summit armaments": ("brand", "assets/icons/brands/alps-logo.png", None),
    "alps summit": ("brand", "assets/icons/brands/alps-logo.png", None),
    "grupo sombra": ("brand", "assets/icons/brands/grupo-logo.png", None),
    "grupo sombra sa": ("brand", "assets/icons/brands/grupo-logo.png", None),
    "ceska vyroba": ("brand", "assets/icons/brands/ceska-logo.png", None),
    "ceska vyroba sro": ("brand", "assets/icons/brands/ceska-logo.png", None),
    "fenris group": ("brand", "assets/icons/brands/fenris.png", None),
    "fenris group ab": ("brand", "assets/icons/brands/fenris.png", None),
    "gila guard": ("brand", "assets/icons/brands/gila-logo.png", None),
    "providence defense": ("brand", "assets/icons/brands/providence-logo.png", None),
    "hana u corporation": ("brand", "assets/icons/brands/hana-u-logo.png", None),
    "hana u": ("brand", "assets/icons/brands/hana-u-logo.png", None),
    "unit alloys": ("brand", "assets/icons/brands/unit-alloys.png", None),
    "ongoing directive": ("gearset", "assets/icons/gearsets/ongoing-directive.png", None),
    "ortiz reficere": ("gearset", "assets/icons/gearsets/ortiz-reficere.png", None),
    "tipping scales": ("gearset", "assets/icons/gearsets/tipping-scales.png", None),
    "strikers battlegear": ("gearset", "assets/icons/gearsets/strikers-battlegear.png", None),
    "striker": ("gearset", "assets/icons/gearsets/strikers-battlegear.png", None),
    "foundry bulwark": ("gearset", "assets/icons/gearsets/foundry-bulwark.png", None),
    "future initiative": ("gearset", "assets/icons/gearsets/future-initiative.png", None),
    "refactor": ("gearset", "assets/icons/gearsets/refactor.png", None),
    "core strength": ("gearset", "assets/icons/gearsets/core-strength.png", None),
    "mask": ("slot", "assets/icons/slots/mask.png", None),
    "masks": ("slot", "assets/icons/slots/mask.png", None),
    "holster": ("slot", "assets/icons/slots/holster.png", None),
    "holsters": ("slot", "assets/icons/slots/holster.png", None),
    "kneepad": ("slot", "assets/icons/slots/kneepads.png", None),
    "kneepads": ("slot", "assets/icons/slots/kneepads.png", None),
    "assault rifle": ("weapon", "assets/icons/weapons/assault-rifle.png", None),
    "assault rifles": ("weapon", "assets/icons/weapons/assault-rifle.png", None),
    "pistol": ("weapon", "assets/icons/weapons/pistol.png", None),
    "pistols": ("weapon", "assets/icons/weapons/pistol.png", None),
}


def normalise(name):
    text = name.lower().replace("&", " and ")
    text = re.sub(r"[^a-z0-9]+", " ", text)
    return re.sub(r"\s+", " ", text).strip()


def classify(name):
    key = normalise(name)
    if key in KNOWN:
        return KNOWN[key]
    print("warning: no logo for %r; using generic icon" % name, file=sys.stderr)
    return ("unknown", GENERIC, None)


def entry(name, priority=False):
    kind, icon, tone = classify(name)
    row = {"loot": name, "kind": kind, "icon": icon}
    if priority:
        row["priority"] = True
    if tone:
        row["tone"] = tone
    return row


def fetch():
    req = urllib.request.Request(URL, headers={"User-Agent": UA, "Accept": "text/html"})
    with urllib.request.urlopen(req, timeout=30) as res:
        return res.read().decode("utf-8", "replace")


def parse(html):
    date_match = re.search(
        r"Loot date</span>\s*<strong><time datetime=\"(\d{4}-\d{2}-\d{2})\"",
        html,
    )
    week = re.search(
        r"Rotation week</span>\s*<strong><time datetime=\"(\d{4}-\d{2}-\d{2})\">.*?"
        r"<time datetime=\"(\d{4}-\d{2}-\d{2})\">",
        html,
        re.S,
    )
    table = re.search(
        r'aria-label="Escalation target loot and history"(.*?)</table>',
        html,
        re.S,
    )
    missions = []
    if table:
        for row in re.findall(r"<tr class=\"([^\"]*)\">(.*?)</tr>", table.group(1), re.S):
            cls, body = row
            mission = re.search(r'data-label="Mission".*?<span>([^<]+)</span>', body, re.S)
            loot = re.search(r'data-loot="([^"]+)"', body)
            if not mission or not loot:
                continue
            priority = "priority-row" in cls or "priority-mark" in body
            missions.append((mission.group(1).strip(), loot.group(1).strip(), priority))

    caches = []
    for card in re.findall(
        r'aria-label="(Prototype (?:Gear|Weapon) Cache)"(.*?)</article>',
        html,
        re.S,
    ):
        label, body = card
        loot = re.search(r'class="tl-loot">.*?<span>([^<]+)</span>', body, re.S)
        if loot:
            caches.append((label.strip(), loot.group(1).strip()))

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
    for mission, loot, priority in parsed["missions"]:
        row = entry(loot, priority)
        row = {"mission": mission, **row}
        escalations.append(row)
    caches = []
    for label, loot in parsed["caches"]:
        row = entry(loot, False)
        caches.append({"cache": label, **row})
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
        html = fetch()
    except Exception as err:
        print("fetch failed: %s" % err, file=sys.stderr)
        return 1

    parsed = parse(html)
    if not parsed["date"] or len(parsed["missions"]) != 5 or len(parsed["caches"]) != 2:
        print(
            "not writing: date=%r missions=%d caches=%d"
            % (parsed["date"], len(parsed["missions"]), len(parsed["caches"])),
            file=sys.stderr,
        )
        return 0

    existing = load_existing()
    if existing.get("lootDate") == parsed["date"]:
        print("Loot date unchanged (%s); not writing." % parsed["date"])
        return 0

    payload = build(parsed, existing)
    LOOT_PATH.write_text(json.dumps(payload, indent=2) + "\n")
    print("Wrote %s for %s" % (LOOT_PATH, parsed["date"]))
    return 0


if __name__ == "__main__":
    sys.exit(main())
