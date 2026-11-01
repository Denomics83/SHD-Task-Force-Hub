#!/usr/bin/env python3
"""Build data/td2 from ProtoTrack indexes and the community data tables.

ProtoTrack HTML is read from /tmp/pt and /tmp/pt-sets.html.
Community CSVs are read from /tmp/div2hub (github.com/div2hub/game-data, CC BY 4.0).
Icons are saved under assets/icons. Nothing is hotlinked.
"""

import csv
import json
import re
import unicodedata
import urllib.request
from html import unescape
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
PT = Path("/tmp/pt")
HUB = Path("/tmp/div2hub")
SETS_HTML = Path("/tmp/pt-sets.html")

BRAND_ICON = {
    "5.11 tactical": "assets/icons/brands/511-tactical.png",
    "airaldi holdings": "assets/icons/brands/airaldi.png",
    "alps summit armament": "assets/icons/brands/alps.png",
    "alps summit armaments": "assets/icons/brands/alps.png",
    "badger tuff": "assets/icons/brands/badger-tuff.png",
    "belstone armory": "assets/icons/brands/belstone.png",
    "brazos de arcabuz": "assets/icons/brands/brazos.png",
    "ceska vyroba s.r.o.": "assets/icons/brands/ceska.png",
    "ceska vyroba s.r.o": "assets/icons/brands/ceska.png",
    "china light industries": "assets/icons/brands/china-light.png",
    "china light industries corporation": "assets/icons/brands/china-light.png",
    "douglas & harding": "assets/icons/brands/douglas-harding.png",
    "electrique": "assets/icons/brands/electrique.png",
    "empress international": "assets/icons/brands/empress.png",
    "fenris group ab": "assets/icons/brands/fenris.png",
    "gila guard": "assets/icons/brands/gila.png",
    "grupo sombra s.a.": "assets/icons/brands/grupo.png",
    "habsburg guard": "assets/icons/brands/habsburg.png",
    "hana-u corporation": "assets/icons/brands/hana-u.png",
    "lengmo": "assets/icons/brands/lengmo.png",
    "murakami industries": "assets/icons/brands/murakami.png",
    "overlord armaments": "assets/icons/brands/overlord.png",
    "palisade steelworks": "assets/icons/brands/palisade.png",
    "petrov defense group": "assets/icons/brands/petrov.png",
    "providence defense": "assets/icons/brands/providence.png",
    "richter & kaiser gmbh": "assets/icons/brands/richter-kaiser.png",
    "royal works": "assets/icons/brands/royal-works.png",
    "sokolov concern": "assets/icons/brands/sokolov.png",
    "unit alloys": "assets/icons/brands/unit-alloys.png",
    "uzina getica": "assets/icons/brands/uzina-getica.png",
    "walker, harris & co.": "assets/icons/brands/walker-harris.png",
    "yaahl gear": "assets/icons/brands/yaahl.png",
    "wyvern wear": "assets/icons/brands/wyvern.png",
    "zwiadowka sp. z o.o.": "assets/icons/brands/zwiadowka.png",
    "zwiadowka sp.z o.o.": "assets/icons/brands/zwiadowka.png",
}

GEARSET_ICON = {
    "aces & eights": "assets/icons/gearsets/aces-and-eights.png",
    "aegis": "assets/icons/gearsets/aegis.png",
    "breaking point": "assets/icons/gearsets/breaking-point.png",
    "cavalier": "assets/icons/gearsets/cavalier.png",
    "concentrated company": "assets/icons/gearsets/concentrated-company.png",
    "core strength": "assets/icons/gearsets/core-strength.png",
    "eclipse protocol": "assets/icons/gearsets/eclipse-protocol.png",
    "foundry bulwark": "assets/icons/gearsets/foundry-bulwark.png",
    "future initiative": "assets/icons/gearsets/future-initiative.png",
    "hard wired": "assets/icons/gearsets/hard-wired.png",
    "heartbreaker": "assets/icons/gearsets/heartbreaker.png",
    "hotshot": "assets/icons/gearsets/hotshot.png",
    "hunter's fury": "assets/icons/gearsets/hunters-fury.png",
    "measured assembly": "assets/icons/gearsets/measured-assembly.png",
    "negotiator's dilemma": "assets/icons/gearsets/negotiators-dilemma.png",
    "ongoing directive": "assets/icons/gearsets/ongoing-directive.png",
    "ortiz: exuro": "assets/icons/gearsets/ortiz-exuro.png",
    "ortiz: reficere": "assets/icons/gearsets/ortiz-reficere.png",
    "refactor": "assets/icons/gearsets/refactor.png",
    "rigger": "assets/icons/gearsets/rigger.png",
    "striker's battlegear": "assets/icons/gearsets/strikers-battlegear.png",
    "system corruption": "assets/icons/gearsets/system-corruption.png",
    "tip of the spear": "assets/icons/gearsets/tip-of-the-spear.png",
    "tipping scales": "assets/icons/gearsets/tipping-scales.png",
    "true patriot": "assets/icons/gearsets/true-patriot.png",
    "umbra initiative": "assets/icons/gearsets/umbra-initiative.png",
}

WEAPON_ICON = {
    "AR": "assets/icons/weapons/assault-rifle.png",
    "Rifle": "assets/icons/weapons/rifle.png",
    "SMG": "assets/icons/weapons/smg.png",
    "LMG": "assets/icons/weapons/lmg.png",
    "MMR": "assets/icons/weapons/mmr.png",
    "Shotgun": "assets/icons/weapons/shotgun.png",
    "Pistol": "assets/icons/weapons/pistol.png",
}

SLOT_ICON = {
    "mask": "assets/icons/caches/mask.png",
    "chest": "assets/icons/caches/chest.png",
    "backpack": "assets/icons/caches/backpack.png",
    "gloves": "assets/icons/caches/gloves.png",
    "holster": "assets/icons/caches/holster.png",
    "kneepads": "assets/icons/caches/kneepads.png",
}

TYPE_BY_FILE = {
    "assault_rifles": "AR",
    "rifles": "Rifle",
    "smgs": "SMG",
    "lmgs": "LMG",
    "mmrs": "MMR",
    "shotguns": "Shotgun",
    "pistols": "Pistol",
}

TYPE_BY_LABEL = {
    "assault rifle": "AR",
    "rifle": "Rifle",
    "smg": "SMG",
    "lmg": "LMG",
    "marksman rifle": "MMR",
    "shotgun": "Shotgun",
    "pistol": "Pistol",
    "sidearm": "Pistol",
}

GEAR_FILES = {
    "mask": "masks",
    "chest": "chests",
    "backpack": "backpacks",
    "gloves": "gloves",
    "holster": "holsters",
    "kneepads": "knees",
}

# User-verified Measured Assembly text. ProtoTrack matches the numbers and misspells "Receive".
MEASURED = {
    "talentText": (
        "Receive +1 Skill Tier for each ally Agent that is within range of your Hive or Smart Cover. "
        "While at Skill Tier 6, having at least one ally Agent in the range of your Hive or Smart Cover for 4s will grant Overcharge for 15s. "
        "Cooldown: 40s. Mortars and enemy Skills that enter the range of your Hive or Smart Cover will be destroyed. Cooldown 10s. "
        "The cooldown is 20% faster for each ally Agent within the range of your Hive or Smart Cover."
    ),
    "chestText": "Decrease the Overcharge cooldown from 40s to 25s.",
    "backpackText": "Decrease the cooldown for destroying Mortars or enemy Skills from 10s to 1s.",
}

SOURCE = (
    "ProtoTrack indexes (sets, named gear, named weapons, exotics, gear talents, weapon talents, prototype stats) "
    "checked 2026-11-01, cross-checked against the Division 2 Community Data Hub CSVs "
    "(https://github.com/div2hub/game-data, CC BY 4.0), which ProtoTrack cites for base weapon stats and attribute caps. "
    "shd.gg was behind Cloudflare and was not fetched. Numbers are stored only where one of those sources states them."
)


def slug(name):
    text = unicodedata.normalize("NFKD", unescape(str(name or "")))
    text = "".join(char for char in text if not unicodedata.combining(char)).lower()
    text = text.replace("&", " and ")
    text = text.replace("'", "").replace("’", "")
    text = re.sub(r"[^a-z0-9]+", "-", text).strip("-")
    return text or "item"


def norm(name):
    text = unescape(str(name or "")).lower().replace("ł", "l")
    text = unicodedata.normalize("NFKD", text)
    text = "".join(char for char in text if not unicodedata.combining(char))
    text = text.replace("&", " and ")
    text = re.sub(r"perfectly", "perfect", text)
    text = re.sub(r"[^a-z0-9]+", "", text)
    return text


def display_key(name):
    text = unescape(str(name or "")).lower().replace("ł", "l")
    text = text.replace("&", " and ")
    text = re.sub(r"\s+", " ", text).strip(" .")
    return text


def copy_text(fragment):
    fragment = re.sub(r"(?i)<br\s*/?>", "\n", fragment)
    fragment = re.sub(r"(?i)</p>", "\n", fragment)
    fragment = re.sub(r"<[^>]+>", " ", fragment)
    fragment = unescape(fragment)
    lines = []
    for line in fragment.splitlines():
        line = re.sub(r"\s+", " ", line).strip()
        line = re.sub(r"^PvE\s+", "", line)
        if line.lower() == "pve":
            continue
        if line:
            lines.append(line)
    return "\n".join(lines)


def numbers(text):
    cleaned = re.sub(r"Y\d+S[\d.]*", " ", str(text or ""), flags=re.I)
    values = []
    for token in re.findall(r"\d+(?:\.\d+)?", cleaned):
        values.append(round(float(token), 3))
    return tuple(sorted(values))


def plusify(text):
    parts = [part.strip() for part in str(text or "").split("/") if part.strip()]
    out = []
    for part in parts:
        if re.match(r"^\d", part) and not part.startswith("+"):
            part = "+" + part
        out.append(part)
    return " · ".join(out)


def templates(html):
    found = {}
    for match in re.finditer(r'<template data-(?:reference-details|set-details)="([^"]+)">([\s\S]*?)</template>', html):
        found[match.group(1)] = match.group(2)
    return found


def section(body, panel):
    match = re.search(
        rf'<section[^>]*data-reference-panel="{panel}"[^>]*>([\s\S]*?)</section>',
        body,
    )
    return match.group(1) if match else ""


def heading_copy(box):
    title = re.search(r"<h3>(.*?)</h3>", box, re.S)
    copy = re.search(r'class="detail-copy">(.*?)</div>', box, re.S)
    return (
        copy_text(title.group(1)) if title else "",
        copy_text(copy.group(1)) if copy else "",
    )


def load_csv(path):
    with path.open(newline="", encoding="utf-8") as handle:
        return list(csv.DictReader(handle))


def write_json(path, doc):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(doc, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def fetch(url, dest):
    dest.parent.mkdir(parents=True, exist_ok=True)
    if dest.exists() and dest.stat().st_size > 0:
        return True
    try:
        urllib.request.urlretrieve(url.split("?")[0], dest)
    except Exception:
        return False
    if dest.suffix.lower() == ".png":
        try:
            image = Image.open(dest).convert("RGBA")
            image.thumbnail((160, 160), Image.Resampling.LANCZOS)
            image.save(dest, "PNG", optimize=True)
        except Exception:
            pass
    return dest.exists() and dest.stat().st_size > 0


def local_from_asset(url, folder):
    path = url.split("?")[0]
    name = path.rsplit("/", 1)[-1]
    if not name:
        return None
    dest = ROOT / "assets" / "icons" / folder / name
    if fetch("https://prototrack.gg" + path, dest):
        return f"assets/icons/{folder}/{name}"
    return None


def parse_sets(html):
    brands = []
    gearsets = []
    parts = re.split(r'<a class="set-card"', html)[1:]
    temps = templates(html)
    for part in parts:
        end = part.find("</a>")
        card = part[:end]
        kind = (re.search(r'data-kind="([^"]+)"', card) or [None, ""])[1]
        sid = (re.search(r'data-set-id="([^"]+)"', card) or [None, ""])[1]
        name = unescape((re.search(r"<h2>([^<]+)</h2>", card) or [None, ""])[1])
        core = unescape((re.search(r'data-core="([^"]*)"', card) or [None, ""])[1])
        image = ""
        for src in re.findall(r'src="([^"]+)"', card):
            if "/brandsets/" in src or ("/gearsets/" in src and "_" not in src.rsplit("/", 1)[-1]):
                image = src
                break
        body = temps.get(sid, "")
        bonuses = {}
        bonus_head = body.split("PvP differences")[0]
        for row in re.finditer(r'aria-label="(\d+) pieces?">\d+</span><span>([^<]+)</span>', bonus_head):
            bonuses[row.group(1)] = unescape(row.group(2)).strip()
        if not core:
            core_match = re.search(r'class="set-core"[^>]*data-core="([^"]+)"', body)
            core = unescape(core_match.group(1)) if core_match else ""
        record = {
            "id": sid,
            "name": name,
            "core": core,
            "image": image,
            "bonuses": bonuses,
        }
        if kind == "brand":
            brands.append(record)
        elif kind == "gearset":
            pieces = {}
            for label, title, text in re.findall(
                r'class="detail-label">([^<]*[Tt]alent)</span>[\s\S]*?<h3>([\s\S]*?)</h3>[\s\S]*?class="detail-copy">([\s\S]*?)(?:<div class="reference-pvp"|</div>)',
                body,
            ):
                pieces[unescape(label).strip().lower()] = (copy_text(title), copy_text(text))
            four = pieces.get("4-piece talent")
            chest = pieces.get("chest talent")
            back = pieces.get("backpack talent")
            pvp = re.search(r"PvP differences([\s\S]*?)</div>\s*</div>", body)
            record.update({
                "talent": four[0] if four else bonuses.get("4", "").replace("Talent:", "").strip(),
                "talentText": four[1] if four else "",
                "chestTalent": chest[0] if chest else "",
                "chestText": chest[1] if chest else "",
                "backpackTalent": back[0] if back else "",
                "backpackText": back[1] if back else "",
                "pvp": copy_text(pvp.group(1)) if pvp else "",
            })
            gearsets.append(record)
    return brands, gearsets


def parse_reference_cards(path):
    html = path.read_text(encoding="utf-8", errors="replace")
    temps = templates(html)
    cards = []
    parts = re.split(r'<a class="set-card reference-card"', html)[1:]
    for part in parts:
        end = part.find("</a>")
        card = part[:end]
        rid = (re.search(r'data-reference-id="([^"]+)"', card) or [None, ""])[1]
        name = unescape((re.search(r"<h2>([^<]+)</h2>", card) or [None, ""])[1])
        slot = (re.search(r'data-slot="([^"]*)"', card) or [None, ""])[1]
        core = unescape((re.search(r'data-core="([^"]*)"', card) or [None, ""])[1])
        images = re.findall(r'src="([^"]+)"', card)
        cards.append({
            "id": rid,
            "name": name,
            "slot": slot,
            "core": core,
            "images": images,
            "body": temps.get(rid, ""),
        })
    return cards


def talent_boxes(body):
    out = []
    for box in re.findall(r'class="reference-box">(.*?)</div>\s*(?:</div>)?', body, re.S):
        label = re.search(r'class="detail-label">([^<]+)', box)
        title, text = heading_copy(box)
        if title or text:
            out.append({
                "label": unescape(label.group(1)).strip() if label else "",
                "name": title,
                "text": text,
                "image": (re.search(r'src="([^"]+)"', box) or [None, ""])[1],
            })
    # heading_copy stops early when boxes nest. Parse talent headings directly.
    direct = []
    for match in re.finditer(
        r'class="wiki-echo-talent-heading">\s*<img[^>]+src="([^"]+)"[^>]*>\s*<h3>([\s\S]*?)</h3>[\s\S]*?class="detail-copy">([\s\S]*?)(?:<div class="reference-pvp"|</div>)',
        body,
    ):
        direct.append({
            "label": "",
            "name": copy_text(match.group(2)),
            "text": copy_text(match.group(3)),
            "image": match.group(1),
        })
    return direct


def base_stats(body):
    stats = {}
    for label, key in (
        ("Base damage", "baseDamage"),
        ("Base RPM", "baseRpm"),
        ("Base magazine", "baseMag"),
        ("Reload", "reload"),
    ):
        match = re.search(rf'class="detail-label">{label}</span><strong>([^<]+)</strong>', body)
        if match:
            stats[key] = unescape(match.group(1)).strip()
    variant = re.search(r'class="detail-label">Base variant</span><span>([^<]+)</span>', body)
    if variant:
        stats["base"] = unescape(variant.group(1)).strip()
    weapon_type = re.search(r'Weapon type</span><strong[^>]*>([^<]+)</strong>', body)
    if weapon_type:
        stats["typeLabel"] = unescape(weapon_type.group(1)).strip()
    return stats


def weapon_fixed(body):
    attrs = []
    for raw in re.findall(r'class="reference-gold"[^>]*>([^<]+)</li>', body):
        text = unescape(raw).strip()
        match = re.match(r"([+-]?\d[\d.,]*%?)\s+(.+)", text)
        if match:
            attrs.append({"name": match.group(2).strip(), "value": match.group(1)})
        elif text:
            attrs.append({"name": text, "value": text})
    return attrs


def fixed_attributes(body):
    attrs = []
    for box in re.finditer(r"<h3>([^<]+)</h3>\s*<div class=\"reference-values\">([\s\S]*?)</div>", body):
        name = unescape(box.group(1)).strip()
        if name in ("Listed source", "Attributes", "Exotic Mods"):
            continue
        values = dict(
            (unescape(label).strip(), unescape(value).strip())
            for label, value in re.findall(r"<small>([^<]+)</small><strong>([^<]+)</strong>", box.group(2))
        )
        if values:
            attrs.append({
                "name": name,
                "value": values.get("Standard", ""),
                "prototype": values.get("Prototype", ""),
            })
    return attrs


def main():
    disagreements = []
    unverified = []
    missing_icons = []

    set_html = SETS_HTML.read_text(encoding="utf-8", errors="replace")
    pt_brands, pt_sets = parse_sets(set_html)
    stats = {row["id"]: row["name"] for row in load_csv(HUB / "stats.csv")}
    hub_brands = {norm(row["name"]): row for row in load_csv(HUB / "gear__brand_sets.csv")}
    hub_sets = {norm(row["name"]): row for row in load_csv(HUB / "gear__gear_sets.csv")}
    attributes = {row["id"]: row for row in load_csv(HUB / "attributes.csv")}
    gear_talents = {norm(row["name"]): row for row in load_csv(HUB / "gear__gear_talents.csv")}
    weapon_talents = {norm(row["name"]): row for row in load_csv(HUB / "weapons__weapon_talents.csv")}

    def stat_line(cell):
        if not cell or cell == "N/A":
            return ""
        parts = []
        for piece in cell.split("|"):
            match = re.match(r"stat:([^:]+):(.+)", piece.strip())
            if not match:
                continue
            label = stats.get(match.group(1), match.group(1))
            parts.append(plusify(f"{match.group(2)} {label}"))
        return " · ".join(parts)

    def core_name(stat_id):
        return {
            "armor": "Armor",
            "weapon-damage": "Weapon Damage",
            "skill-tier": "Skill Tier",
        }.get(stat_id, stat_id)

    # Brands
    brands = []
    seen_brand = set()
    for row in pt_brands:
        key = norm(row["name"])
        seen_brand.add(key)
        hub = hub_brands.get(key)
        if not hub:
            for candidate, data in hub_brands.items():
                if candidate in key or key in candidate:
                    hub = data
                    break
        icon = BRAND_ICON.get(display_key(row["name"]))
        if not icon and row["image"]:
            icon = local_from_asset(row["image"], "brands")
        if not icon:
            missing_icons.append(f"brand {row['name']}")
        item = {
            "id": "brand-" + slug(row["name"]),
            "name": row["name"],
            "core": row["core"] or (core_name(hub["default_core_stat_id"]) if hub else None),
            "bonus1": plusify(row["bonuses"].get("1", "")),
            "bonus2": plusify(row["bonuses"].get("2", "")),
            "bonus3": plusify(row["bonuses"].get("3", "")),
            "talentSlots": ["chest", "backpack"],
            "icon": icon,
            "aliases": [],
        }
        if hub:
            hub_core = core_name(hub["default_core_stat_id"])
            if item["core"] and hub_core and item["core"] != hub_core:
                disagreements.append(f"{row['name']} core: ProtoTrack {item['core']}, community table {hub_core}")
            for label, piece in (("1", "1pc_bonus"), ("2", "2pc_bonus"), ("3", "3pc_bonus")):
                hub_text = stat_line(hub[piece])
                pt_text = item["bonus" + label]
                if hub_text and pt_text and numbers(hub_text) != numbers(pt_text):
                    disagreements.append(f"{row['name']} {label}pc: ProtoTrack {pt_text}; community table {hub_text}")
        else:
            unverified.append(f"{row['name']} brand bonuses are on ProtoTrack and not in the community brand table")
        brands.append(item)

    if norm("Improvised") not in seen_brand and norm("Improvised") in hub_brands:
        brands.append({
            "id": "brand-improvised",
            "name": "Improvised",
            "core": "Armor",
            "bonus1": None,
            "bonus2": None,
            "bonus3": None,
            "talentSlots": ["chest", "backpack"],
            "icon": None,
            "aliases": ["Improvised Gear"],
            "unverified": ["Not on the ProtoTrack set index. The community brand table lists no 1/2/3-piece bonuses."],
        })
        missing_icons.append("brand Improvised")
        unverified.append("Improvised brand is in the community table and not on the ProtoTrack set index")

    # Gear sets
    gearsets = []
    for row in pt_sets:
        hub = hub_sets.get(norm(row["name"]))
        icon = GEARSET_ICON.get(display_key(row["name"]))
        if not icon and row["image"]:
            icon = local_from_asset(row["image"], "gearsets")
        if not icon:
            missing_icons.append(f"gear set {row['name']}")
        talent_text = row["talentText"]
        chest_text = row["chestText"]
        back_text = row["backpackText"]
        if row["name"] == "Measured Assembly":
            talent_text = MEASURED["talentText"]
            chest_text = MEASURED["chestText"]
            back_text = MEASURED["backpackText"]
        item = {
            "id": "gearset-" + slug(row["name"]),
            "name": row["name"],
            "core": row["core"],
            "bonus2": plusify(row["bonuses"].get("2", "")),
            "bonus3": plusify(row["bonuses"].get("3", "")),
            "talent": row["talent"],
            "talentText": talent_text,
            "chestTalent": row["chestTalent"],
            "chestText": chest_text,
            "backpackTalent": row["backpackTalent"],
            "backpackText": back_text,
            "pvp": row["pvp"],
            "rarity": "gear-set",
            "icon": icon,
        }
        if hub:
            hub_core = core_name(hub["default_core_stat_id"])
            if item["core"] in ("Mixed",) or (hub_core and item["core"] and item["core"] != hub_core):
                if item["core"] != hub_core:
                    disagreements.append(f"{row['name']} core: ProtoTrack {item['core']}, community table {hub_core}")
            for label, piece in (("2", "2pc_bonus"), ("3", "3pc_bonus")):
                hub_text = stat_line(hub[piece])
                pt_text = item["bonus" + label]
                if hub_text and pt_text and numbers(hub_text) != numbers(pt_text):
                    disagreements.append(f"{row['name']} {label}pc: ProtoTrack {pt_text}; community table {hub_text}")
        gearsets.append(item)

    # Talents from ProtoTrack pages, filled out from the community tables.
    pt_gear_talents = {}
    for card in parse_reference_cards(PT / "gear-talents.html"):
        boxes = talent_boxes(card["body"])
        for box in boxes:
            if box["name"]:
                pt_gear_talents[norm(box["name"])] = box
                if box["image"]:
                    local_from_asset(box["image"], "talents/gear")
    pt_weapon_talents = {}
    for card in parse_reference_cards(PT / "weapon-talents.html"):
        boxes = talent_boxes(card["body"])
        types = re.findall(r'class="reference-types"[\s\S]*?</div>', card["body"])
        requirement = ""
        if types:
            requirement = ", ".join(re.findall(r">([A-Z]{2,4})<", types[0]))
        for box in boxes:
            if box["name"]:
                box["requirement"] = requirement
                pt_weapon_talents[norm(box["name"])] = box
                if box["image"]:
                    local_from_asset(box["image"], "talents/weapons")

    def talent_icon(name, kind):
        box = (pt_gear_talents if kind == "gear" else pt_weapon_talents).get(norm(name), {})
        image = box.get("image") or ""
        if not image:
            return None
        folder = "talents/gear" if kind == "gear" else "talents/weapons"
        return local_from_asset(image, folder)

    chest_names = []
    backpack_names = []
    other_gear = []
    gear_details = []
    slot_by_norm = {}
    for row in load_csv(HUB / "gear__gear_talents.csv"):
        key = norm(row["name"])
        slot = row["compatibility"]
        if slot in ("chest", "backpack"):
            slot_by_norm[key] = slot
    for row in load_csv(HUB / "gear__gear_talents.csv"):
        key = norm(row["name"])
        base = norm(re.sub(r"^perfect", "", row["name"], flags=re.I))
        slot = row["compatibility"]
        if slot == "N/A" and row["name"].lower().startswith("perfect") and base in slot_by_norm:
            slot = slot_by_norm[base]
        pt = pt_gear_talents.get(key)
        text = pt["text"] if pt and pt.get("text") else row["description"]
        if pt and row["description"] and numbers(pt["text"]) != numbers(row["description"]):
            disagreements.append(
                f"Gear talent {row['name']}: ProtoTrack numbers {numbers(pt['text'])}, community table {numbers(row['description'])}"
            )
        if not pt and slot in ("chest", "backpack"):
            unverified.append(f"Gear talent {row['name']} is in the community table and not on the ProtoTrack gear-talent index")
        detail = {
            "id": "talent-" + slug(row["name"]),
            "name": row["name"],
            "slot": slot if slot in ("chest", "backpack") else "special",
            "text": text,
            "icon": talent_icon(row["name"], "gear"),
        }
        if not detail["icon"]:
            detail["icon"] = SLOT_ICON["chest"] if detail["slot"] == "chest" else SLOT_ICON["backpack"] if detail["slot"] == "backpack" else "assets/icons/loot/generic.svg"
            missing_icons.append(f"gear talent {row['name']} uses a slot mark; ProtoTrack has no talent svg")
        gear_details.append(detail)
        if detail["slot"] == "chest":
            chest_names.append(row["name"])
        elif detail["slot"] == "backpack":
            backpack_names.append(row["name"])
        else:
            other_gear.append(row["name"])

    weapon_names = []
    weapon_details = []
    for row in load_csv(HUB / "weapons__weapon_talents.csv"):
        key = norm(row["name"])
        pt = pt_weapon_talents.get(key)
        text = pt["text"] if pt and pt.get("text") else row["description"]
        if pt and row["description"] and numbers(pt["text"]) != numbers(row["description"]):
            disagreements.append(
                f"Weapon talent {row['name']}: ProtoTrack numbers {numbers(pt['text'])}, community table {numbers(row['description'])}"
            )
        if not pt and row["compatibility"] != "N/A":
            unverified.append(f"Weapon talent {row['name']} is in the community table and not on the ProtoTrack weapon-talent index")
        detail = {
            "id": "talent-" + slug(row["name"]),
            "name": row["name"],
            "slot": "weapon",
            "text": text,
            "requirement": row["compatibility"] if row["compatibility"] != "N/A" else (pt.get("requirement") if pt else None),
            "icon": talent_icon(row["name"], "weapon"),
        }
        if not detail["icon"]:
            detail["icon"] = WEAPON_ICON["AR"]
            missing_icons.append(f"weapon talent {row['name']} uses the rifle mark; ProtoTrack has no talent svg")
        weapon_details.append(detail)
        weapon_names.append(row["name"])

    # Named gear
    hub_named = {}
    for slot, filename in GEAR_FILES.items():
        for row in load_csv(HUB / f"gear__{filename}.csv"):
            if row["is_named"] != "TRUE":
                continue
            hub_named.setdefault(norm(row["name"]), []).append((slot, row))
    named_gear = []
    seen_named_slots = set()
    for card in parse_reference_cards(PT / "named-gear.html"):
        slot = card["slot"] or ""
        if slot == "knees":
            slot = "kneepads"
        boxes = talent_boxes(card["body"])
        perfect = next((box for box in boxes if box["name"].lower().startswith("perfect")), None)
        if not perfect and boxes:
            perfect = boxes[-1]
        if perfect and perfect["name"].lower().startswith("perfectly "):
            perfect["name"] = "Perfect " + perfect["name"].split(" ", 1)[1]
        attrs = fixed_attributes(card["body"])
        brand = ""
        brand_match = re.search(r'class="reference-context">[\s\S]*?<span>([^<]+)</span>', card["body"])
        if not brand_match:
            brand_match = re.search(r'href="division2-sets.php\?set=[^"]+">Open ([^<]+) →', card["body"])
        if brand_match:
            brand = unescape(brand_match.group(1)).replace("Open ", "").strip()
        icon = None
        for image in card["images"]:
            if "/gear_talents/" in image:
                icon = local_from_asset(image, "talents/gear")
                break
        if not icon:
            icon = BRAND_ICON.get(display_key(brand)) or SLOT_ICON.get(slot)
        item = {
            "id": "named-gear-" + slug(card["name"]) + "-" + slot,
            "name": card["name"],
            "slot": slot,
            "brand": brand or None,
            "base": brand or None,
            "kind": "gear",
            "core": card["core"] or None,
            "perfectTalent": perfect["name"] if perfect else None,
            "perfectText": perfect["text"] if perfect else None,
            "fixedAttributes": attrs or None,
            "icon": icon,
        }
        named_gear.append(item)
        seen_named_slots.add((norm(card["name"]), slot))
        if not icon:
            missing_icons.append(f"named gear {card['name']}")

    for key, rows in hub_named.items():
        for slot, row in rows:
            if (key, slot) in seen_named_slots:
                continue
            talent = row["talent_slot"][6:] if row["talent_slot"].startswith("fixed:") else None
            talent_row = gear_talents.get(norm(talent or ""))
            attrs = []
            for field in ("core_1", "minor_1", "minor_2", "minor_3"):
                cell = row[field]
                if cell.startswith("fixed:"):
                    attr = attributes.get(cell.split(":", 1)[1])
                    if attr:
                        attrs.append({
                            "name": stats.get(attr["stat_id"], attr["stat_id"]),
                            "value": attr["range_max"],
                            "prototype": attr["proto_max"],
                        })
            brand = row["brand_set"] if row["brand_set"] != "N/A" else None
            named_gear.append({
                "id": "named-gear-" + slug(row["name"]) + "-" + slot,
                "name": row["name"],
                "slot": slot,
                "brand": brand,
                "base": brand,
                "kind": "gear",
                "core": None,
                "perfectTalent": talent,
                "perfectText": talent_row["description"] if talent_row else None,
                "fixedAttributes": attrs or None,
                "icon": BRAND_ICON.get(display_key(brand or "")) or SLOT_ICON.get(slot),
                "unverified": [f"{row['name']} ({slot}) is in the community table and not on the ProtoTrack named-gear index"],
            })
            unverified.append(f"Named gear {row['name']} ({slot}) is not on the ProtoTrack named-gear index")

    # Weapons
    weapons = []
    hub_weapons = {}
    for filename, weapon_type in TYPE_BY_FILE.items():
        for row in load_csv(HUB / f"weapons__{filename}.csv"):
            row = dict(row)
            row["name"] = {"Sleipner": "Sleipnir", "Cuelebre": "Cuélebre"}.get(row["name"], row["name"])
            hub_weapons.setdefault(norm(row["name"]), row)
            talent = row["talent_slot"][6:] if row["talent_slot"].startswith("fixed:") else ""
            rarity = "exotic" if row["is_exotic"] == "TRUE" else "named" if row["is_named"] == "TRUE" else "high-end"
            weapons.append({
                "id": "weapon-" + slug(row["name"]),
                "name": row["name"],
                "type": weapon_type,
                "slot": "sidearm" if row["slot_type"] == "sidearm" else "primary",
                "family": row["family"] if row["family"] != "N/A" else None,
                "rarity": rarity,
                "baseDamage": row["base_damage"],
                "baseRpm": row["base_rpm"],
                "baseMag": row["base_mag_size"],
                "reload": row["base_reload_time"],
                "optimalRange": row["optimal_range"],
                "headshot": row["hsd"],
                "talent": talent,
                "icon": WEAPON_ICON[weapon_type],
            })

    named_weapons = []
    seen_named_weapons = set()
    for card in parse_reference_cards(PT / "named-weapons.html"):
        stats_block = base_stats(card["body"])
        weapon_type = TYPE_BY_LABEL.get((stats_block.get("typeLabel") or "").lower(), "")
        boxes = talent_boxes(card["body"])
        perfect = next((box for box in boxes if box["name"]), None)
        if perfect and perfect["name"].lower().startswith("perfectly "):
            perfect["name"] = "Perfect " + perfect["name"].split(" ", 1)[1]
        hub = hub_weapons.get(norm(card["name"])) or hub_weapons.get({"sleipnir": "sleipner"}.get(norm(card["name"]), ""))
        if not weapon_type and hub:
            weapon_type = next((item["type"] for item in weapons if norm(item["name"]) == norm(card["name"])), "")
        icon = None
        for image in card["images"]:
            if "/weapon_talents/" in image:
                icon = local_from_asset(image, "talents/weapons")
                break
        if not icon:
            icon = WEAPON_ICON.get(weapon_type)
        item = {
            "id": "named-weapon-" + slug(card["name"]),
            "name": card["name"],
            "kind": "weapon",
            "type": weapon_type or None,
            "base": stats_block.get("base") or (hub["family"] if hub else None),
            "perfectTalent": perfect["name"] if perfect else (hub["talent_slot"][6:] if hub and hub["talent_slot"].startswith("fixed:") else None),
            "perfectText": perfect["text"] if perfect else None,
            "fixedAttributes": weapon_fixed(card["body"]) or None,
            "baseDamage": stats_block.get("baseDamage") or (hub["base_damage"] if hub else None),
            "baseRpm": stats_block.get("baseRpm") or (hub["base_rpm"] if hub else None),
            "baseMag": stats_block.get("baseMag") or (hub["base_mag_size"] if hub else None),
            "reload": stats_block.get("reload") or (hub["base_reload_time"] if hub else None),
            "icon": icon,
        }
        if not hub:
            item["unverified"] = [f"{card['name']} is on ProtoTrack and not in the community weapon tables"]
            unverified.append(f"Named weapon {card['name']} is not in the community weapon tables")
            weapons.append({
                "id": item["id"],
                "name": card["name"],
                "type": weapon_type or "",
                "slot": "primary",
                "family": item["base"],
                "rarity": "named",
                "baseDamage": item["baseDamage"],
                "baseRpm": item["baseRpm"],
                "baseMag": item["baseMag"],
                "reload": item["reload"],
                "optimalRange": None,
                "headshot": None,
                "talent": item["perfectTalent"] or "",
                "icon": icon,
                "unverified": item["unverified"],
            })
        elif stats_block.get("baseDamage") and hub["base_damage"]:
            left = stats_block["baseDamage"].replace(",", "")
            if left != hub["base_damage"]:
                disagreements.append(f"{card['name']} base damage: ProtoTrack {stats_block['baseDamage']}, community table {hub['base_damage']}")
        named_weapons.append(item)
        seen_named_weapons.add(norm(card["name"]))
        if item["perfectTalent"] and not item["perfectText"]:
            talent_row = weapon_talents.get(norm(item["perfectTalent"]))
            if talent_row:
                item["perfectText"] = talent_row["description"]
        if not icon:
            missing_icons.append(f"named weapon {card['name']}")

    for item in weapons:
        alias_of_seen = {"sleipner": "sleipnir"}
        if item["rarity"] == "named" and norm(item["name"]) not in seen_named_weapons and alias_of_seen.get(norm(item["name"])) not in seen_named_weapons:
            talent_row = weapon_talents.get(norm(item["talent"]))
            named_weapons.append({
                "id": "named-weapon-" + slug(item["name"]),
                "name": item["name"],
                "kind": "weapon",
                "type": item["type"],
                "base": item["family"],
                "perfectTalent": item["talent"] or None,
                "perfectText": talent_row["description"] if talent_row else None,
                "fixedAttributes": None,
                "baseDamage": item["baseDamage"],
                "baseRpm": item["baseRpm"],
                "baseMag": item["baseMag"],
                "reload": item["reload"],
                "icon": item["icon"],
                "unverified": [f"{item['name']} is in the community weapon tables and not on the ProtoTrack named-weapon index"],
            })
            unverified.append(f"Named weapon {item['name']} is not on the ProtoTrack named-weapon index")

    # Exotics
    exotic_gear = []
    exotic_weapons = []
    for card in parse_reference_cards(PT / "exotic.html"):
        boxes = talent_boxes(card["body"])
        talent = next((box for box in boxes if box["name"]), None)
        stats_block = base_stats(card["body"])
        mods = [
            unescape(item).strip()
            for item in re.findall(r"<h3>Exotic Mods</h3>[\s\S]*?<ul>([\s\S]*?)</ul>", card["body"])
        ]
        mod_items = []
        if mods:
            mod_items = [unescape(item).strip() for item in re.findall(r"<li>([^<]+)</li>", mods[0])]
        icon = None
        for image in card["images"]:
            if "/exotic-talents/" in image or "/gear_talents/" in image or "/weapon_talents/" in image:
                folder = "talents/exotic" if "/exotic-talents/" in image else "talents/gear"
                if "/weapon_talents/" in image:
                    folder = "talents/weapons"
                icon = local_from_asset(image, folder)
                break
        if card["id"].startswith("exotic-weapon"):
            weapon_type = TYPE_BY_LABEL.get((stats_block.get("typeLabel") or card["core"] or "").lower(), "")
            if not icon:
                icon = WEAPON_ICON.get(weapon_type)
            exotic_weapons.append({
                "id": "exotic-weapon-" + slug(card["name"]),
                "name": card["name"],
                "kind": "weapon",
                "type": weapon_type or None,
                "slot": "sidearm" if weapon_type == "Pistol" else "primary",
                "base": stats_block.get("base"),
                "talent": talent["name"] if talent else None,
                "talentText": talent["text"] if talent else None,
                "mods": mod_items,
                "baseDamage": next((item["baseDamage"] for item in weapons if norm(item["name"]) == norm(card["name"])), None),
                "baseRpm": next((item["baseRpm"] for item in weapons if norm(item["name"]) == norm(card["name"])), None),
                "baseMag": next((item["baseMag"] for item in weapons if norm(item["name"]) == norm(card["name"])), None),
                "icon": icon,
            })
        else:
            slot = card["slot"] or ""
            if slot == "knees":
                slot = "kneepads"
            if not icon:
                icon = SLOT_ICON.get(slot)
            exotic_gear.append({
                "id": "exotic-gear-" + slug(card["name"]),
                "name": card["name"],
                "slot": slot or None,
                "kind": "gear",
                "talent": talent["name"] if talent else None,
                "talentText": talent["text"] if talent else None,
                "icon": icon,
            })
        if not icon:
            missing_icons.append(f"exotic {card['name']}")

    # Skills, specializations, grenades, attributes, mods
    families = {}
    for row in load_csv(HUB / "skills__skills.csv"):
        families.setdefault(row["skill"], []).append(row["name"])
    skills = []
    for family, variants in families.items():
        for variant in variants:
            skills.append({
                "id": "skill-" + slug(variant),
                "name": variant,
                "family": family,
                "variants": variants,
                "icon": "assets/icons/loot/generic.svg",
            })

    spec_grenades = {
        "sharpshooter": "Flashbang Grenade",
        "demolitionist": "Fragmentation Grenade",
        "survivalist": "Incendiary Grenade",
        "gunner": "Riot Foam Grenade",
        "technician": "EMP Grenade",
        "firewall": "Cluster Grenade",
    }
    specializations = {
        "source": SOURCE,
        "items": ["Sharpshooter", "Demolitionist", "Survivalist", "Gunner", "Technician", "Firewall"],
        "details": [],
    }
    for name in specializations["items"]:
        filename = HUB / f"specializations__{name.lower()}.csv"
        sidearm = None
        for row in load_csv(filename):
            if row["type"] == "item" and "pistol" in row["description"].lower():
                sidearm = row["name"]
        icon = f"assets/icons/specializations/{name.lower()}.png"
        if not (ROOT / icon).exists():
            icon = None
            missing_icons.append(f"specialization {name}")
        specializations["details"].append({
            "id": "spec-" + slug(name),
            "name": name,
            "grenade": spec_grenades[name.lower()],
            "sidearm": sidearm,
            "icon": icon,
        })
    unverified.append("Signature weapons are not named in the community specialization tables, so they are omitted")

    grenades = {
        "source": SOURCE,
        "items": [
            {"id": "grenade-" + slug(spec_grenades[name.lower()]), "name": spec_grenades[name.lower()], "specialization": name}
            for name in specializations["items"]
        ],
    }

    def number(value):
        if value in (None, "", "N/A"):
            return None
        raw = str(value).replace("%", "").replace(",", "")
        try:
            return float(raw) if "." in raw else int(raw)
        except ValueError:
            return value

    cores = []
    minors = []
    for row in load_csv(HUB / "attributes.csv"):
        if "gear-core" not in row["compatibility"]:
            continue
        cores.append({
            "id": row["id"],
            "name": stats.get(row["stat_id"], row["stat_id"]),
            "max": number(row["range_max"]),
            "protoMax": number(row["proto_max"]),
            "unit": "%" if str(row["range_max"]).endswith("%") else "",
        })
    seen_minor = set()
    for row in load_csv(HUB / "attributes.csv"):
        if "gear-minor" not in row["compatibility"] and "weapon-minor" not in row["compatibility"]:
            continue
        label = stats.get(row["stat_id"], row["stat_id"])
        if label in seen_minor:
            continue
        seen_minor.add(label)
        minors.append({
            "id": row["id"],
            "name": label,
            "max": number(row["range_max"]),
            "protoMax": number(row["proto_max"]),
            "unit": "%" if str(row["range_max"]).endswith("%") else "",
            "group": "gear" if "gear-minor" in row["compatibility"] else "weapon",
        })
    mod_caps = []
    mod_names = []
    for row in load_csv(HUB / "gear__gear_mods.csv"):
        label = stats.get(row["stat_id"], row["stat_id"])
        mod_names.append(label)
        mod_caps.append({
            "id": row["id"],
            "name": label,
            "max": number(row["range_max"]),
            "unit": "%" if str(row["range_max"]).endswith("%") else "",
        })

    # Index and icons.json
    index = []

    def add_index(item, kind, aliases=None):
        index.append({
            "id": item.get("id"),
            "name": item.get("name"),
            "kind": kind,
            "slot": item.get("slot") or item.get("type") or "",
            "icon": item.get("icon") or "",
            "aliases": aliases or item.get("aliases") or [],
        })

    for item in brands:
        add_index(item, "brand")
    for item in gearsets:
        add_index(item, "gearset")
    for item in named_gear:
        add_index(item, "named-gear")
    for item in named_weapons:
        add_index(item, "named-weapon")
    for item in exotic_gear:
        add_index(item, "exotic-gear")
    for item in exotic_weapons:
        add_index(item, "exotic-weapon")
    for item in weapons:
        add_index(item, "weapon")
    for item in gear_details:
        add_index(item, "gear-talent")
    for item in weapon_details:
        add_index(item, "weapon-talent")
    for item in skills:
        add_index(item, "skill", item["variants"])
    for item in specializations["details"]:
        add_index(item, "specialization")

    icons_path = ROOT / "data" / "icons.json"
    icons_doc = json.loads(icons_path.read_text(encoding="utf-8"))
    have = {entry.get("slug") for entry in icons_doc.get("icons", [])}
    for entry in index:
        if not entry["icon"] or not entry["id"]:
            continue
        if entry["id"] in have:
            continue
        icons_doc["icons"].append({
            "slug": entry["id"],
            "name": entry["name"],
            "kind": entry["kind"],
            "file": entry["icon"],
            "proto": "",
            "aliases": entry["aliases"],
            "source": "local catalog",
        })
        have.add(entry["id"])

    gaps = {
        "checked": "2026-11-01",
        "source": SOURCE,
        "disagreements": sorted(set(disagreements)),
        "unverified": sorted(set(unverified)),
        "missingIcons": sorted(set(missing_icons)),
        "notes": [
            "Unique per-item weapon and gear renders are not published on ProtoTrack. Items use a saved brand, talent, type, or slot mark.",
            "Measured Assembly talent text uses the wording verified against the Ubisoft Crossroads notes. ProtoTrack's page matches the numbers and misspells Receive.",
            "Improvised is a crafted brand with no set bonuses. ProtoTrack's set index does not list it.",
            "Bulldog is a Royal Works backpack on ProtoTrack. The community table also lists a Royal Works holster with the same name and Perfect Composure.",
            "Named-weapon spelling differs for Culebre/Cuelebre and Sleipnir/Sleipner. ProtoTrack spelling is the catalog name when that page lists the weapon.",
        ],
    }

    write_json(ROOT / "data" / "td2" / "brands.json", {"source": SOURCE, "items": brands})
    write_json(ROOT / "data" / "td2" / "gearsets.json", {"source": SOURCE, "items": gearsets})
    write_json(ROOT / "data" / "td2" / "named.json", {"source": SOURCE, "gear": named_gear, "weapons": named_weapons})
    write_json(ROOT / "data" / "td2" / "exotics.json", {
        "source": SOURCE,
        "items": exotic_gear + [
            {**item, "slot": item.get("type") or item.get("slot")}
            for item in exotic_weapons
        ],
    })
    write_json(ROOT / "data" / "td2" / "talents.json", {
        "source": SOURCE,
        "weapon": weapon_names,
        "chest": chest_names,
        "backpack": backpack_names,
        "special": other_gear,
        "details": gear_details + weapon_details,
    })
    write_json(ROOT / "data" / "td2" / "weapons.json", {
        "source": SOURCE,
        "types": ["AR", "SMG", "LMG", "Rifle", "MMR", "Shotgun", "Pistol"],
        "items": weapons,
    })
    write_json(ROOT / "data" / "td2" / "skills.json", {"source": SOURCE, "items": skills})
    write_json(ROOT / "data" / "td2" / "specializations.json", specializations)
    write_json(ROOT / "data" / "td2" / "grenades.json", grenades)
    write_json(ROOT / "data" / "td2" / "attributes.json", {
        "source": SOURCE,
        "cores": cores,
        "minors": minors,
        "mods": mod_names,
        "modCaps": mod_caps,
    })
    write_json(ROOT / "data" / "td2" / "index.json", {"source": SOURCE, "items": index})
    write_json(ROOT / "data" / "td2" / "gaps.json", gaps)
    write_json(icons_path, icons_doc)
    print(json.dumps({
        "brands": len(brands),
        "gearsets": len(gearsets),
        "namedGear": len(named_gear),
        "namedWeapons": len(named_weapons),
        "exoticGear": len(exotic_gear),
        "exoticWeapons": len(exotic_weapons),
        "gearTalents": len(gear_details),
        "weaponTalents": len(weapon_details),
        "weapons": len(weapons),
        "skills": len(skills),
        "disagreements": len(gaps["disagreements"]),
        "unverified": len(gaps["unverified"]),
        "missingIcons": len(gaps["missingIcons"]),
    }, indent=2))


if __name__ == "__main__":
    main()
