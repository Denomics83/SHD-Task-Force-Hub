#!/usr/bin/env python3
"""Report Division 2 catalog counts and missing fields.

Exit 0 when every record has an id and a name. Missing optional fields
are printed so they can be filled from a source. They do not fail the run.
"""

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TD2 = ROOT / "data" / "td2"


def load(name):
    return json.loads((TD2 / name).read_text(encoding="utf-8"))


def icon_ok(path):
    if not path:
        return False
    return (ROOT / path).is_file()


def main():
    brands = load("brands.json")["items"]
    gearsets = load("gearsets.json")["items"]
    named = load("named.json")
    exotics = load("exotics.json")["items"]
    talents = load("talents.json")
    weapons = load("weapons.json")["items"]
    skills = load("skills.json")["items"]
    specs = load("specializations.json")
    attributes = load("attributes.json")
    index = load("index.json")["items"]
    gaps = load("gaps.json")

    exotic_gear = [row for row in exotics if row.get("kind") == "gear"]
    exotic_weapons = [row for row in exotics if row.get("kind") == "weapon"]
    gear_talents = [row for row in talents["details"] if row.get("slot") != "weapon"]
    weapon_talents = [row for row in talents["details"] if row.get("slot") == "weapon"]

    counts = {
        "brands": len(brands),
        "gear sets": len(gearsets),
        "named gear": len(named["gear"]),
        "named weapons": len(named["weapons"]),
        "exotic gear": len(exotic_gear),
        "exotic weapons": len(exotic_weapons),
        "gear talents": len(gear_talents),
        "weapon talents": len(weapon_talents),
        "weapons": len(weapons),
        "skills": len(skills),
        "skill families": len({row.get("family") for row in skills}),
        "specializations": len(specs["items"]),
        "attribute caps": len(attributes["cores"]) + len(attributes["minors"]),
        "mod caps": len(attributes.get("modCaps") or []),
    }

    missing = []
    seen = {}

    def check(row, kind, fields):
        ident = row.get("id") or row.get("name") or "?"
        if not row.get("id") or not row.get("name"):
            missing.append(f"{kind} {ident}: missing id or name")
        if row.get("id"):
            seen.setdefault(row["id"], []).append(kind)
        for field in fields:
            value = row.get(field)
            if value in (None, "", []):
                missing.append(f"{kind} {row.get('name')}: missing {field}")
        icon = row.get("icon")
        if icon and not icon_ok(icon):
            missing.append(f"{kind} {row.get('name')}: icon file missing {icon}")

    for row in brands:
        fields = ["bonus1", "bonus2", "bonus3", "core"] if row["name"] != "Improvised" else []
        check(row, "brand", fields)
    for row in gearsets:
        check(row, "gear set", ["core", "bonus2", "bonus3", "talent", "talentText"])
    for row in named["gear"]:
        check(row, "named gear", ["slot"])
        if not row.get("perfectTalent") and not row.get("fixedAttributes"):
            missing.append(f"named gear {row.get('name')}: missing perfect talent and fixed attribute")
    for row in named["weapons"]:
        check(row, "named weapon", ["type"])
        if not row.get("perfectTalent") and not row.get("fixedAttributes"):
            missing.append(f"named weapon {row.get('name')}: missing perfect talent and fixed attribute")
    for row in exotic_gear:
        check(row, "exotic gear", ["slot", "talent", "talentText"])
    for row in exotic_weapons:
        check(row, "exotic weapon", ["talent", "talentText"])
    for row in talents["details"]:
        check(row, "talent", ["text"])
    for row in weapons:
        check(row, "weapon", ["type", "rarity", "baseDamage", "baseRpm", "baseMag"])
    for row in skills:
        check(row, "skill", ["family", "variants"])

    duplicate_ids = [ident for ident, kinds in seen.items() if len(kinds) > 1]
    index_ids = {row.get("id") for row in index}
    missing_from_index = [ident for ident in seen if ident not in index_ids]

    print("Catalog counts")
    for label, count in counts.items():
        print(f"  {label}: {count}")
    print(f"Missing fields: {len(missing)}")
    for line in missing:
        print(f"  - {line}")
    print(f"Duplicate ids: {len(duplicate_ids)}")
    for ident in duplicate_ids:
        print(f"  - {ident}")
    print(f"Ids missing from index.json: {len(missing_from_index)}")
    print(f"Disagreements: {len(gaps.get('disagreements') or [])}")
    for line in gaps.get("disagreements") or []:
        print(f"  - {line}")
    print(f"Unverified: {len(gaps.get('unverified') or [])}")
    for line in gaps.get("unverified") or []:
        print(f"  - {line}")
    fallback_icons = [line for line in (gaps.get("missingIcons") or []) if "uses a" in line or "no " in line]
    print(f"Icons without a unique ProtoTrack file: {len(gaps.get('missingIcons') or [])}")
    if any(not row.get("id") or not row.get("name") for group in (
        brands, gearsets, named["gear"], named["weapons"], exotics, talents["details"], weapons, skills
    ) for row in group):
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
