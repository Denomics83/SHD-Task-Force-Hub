# Shade Task Force Hub

Mobile-first static clan site for *Tom Clancy's The Division 2*.

**Path:** `/workspace/division-builds/clan-hub/`

## Bottom navigation (5 tabs)

| Tab | Page | Notes |
|-----|------|--------|
| **Updates** | `index.html` | Home — news, patch, DXP, and season announcements |
| **Events** | `events.html` | Full-bleed season and raid cards (swipe) |
| **Loot** | `loot.html` | Targeted loot from `data/loot.json` |
| **Builds** | `builds.html` | Inventory-style loadout cards |
| **Resources** | `resources.html` | Maps, Hunter Guides, Creators, Manhunts |

**Season is not a bottom tab.** Open it from the season card on Updates or Events → `season.html` (sub-tabs: Manhunts · Maps · Modifiers).

## Preview locally

```bash
cd /workspace/division-builds/clan-hub
python3 -m http.server 8080
```

Open `http://localhost:8080/` (fetch of `data/*.json` needs a server, not `file://`).

## Data (admin JSON)

| File | Purpose |
|------|---------|
| `data/news.json` | Event / announcement feed |
| `data/loot.json` | Escalations, Proto caches, and Dark Zone rows |
| `data/escalations.json` | Weekly escalations strip |
| `data/season.json` | Season detail panels |
| `data/raids.json` | Seed raid schedule |

## Builds

Six Y8S3 Red Horizon seeds in `builds-data.js`. Categories: Solo Hybrid, Solo Damage, Team Tank, Skill Support, DPS Support, Healer, Hardcore.

**Inventory card layout (CSS/JS):** left key-stats column; top 3 weapons; middle 2×3 gear with set icons + core bars + attribute chips + mod line; bottom 2 skills + specialization. Tap a gear tile for a detail modal (Escape / backdrop closes).

### Gear object fields (`builds-data.js`)

| Field | Type | Notes |
|-------|------|--------|
| `slot` | string | Mask / Chest / Backpack / Gloves / Holster / Kneepads |
| `name` | string | Piece or brand name |
| `rarity` | string | `gearset` · `exotic` · `named` · `brand` · `highend` |
| `icon` / `letter` | string | Brand/set icon path, or 1–2 letter fallback |
| `cores` | `["r"\|"b"\|"y"]` | Weapon Damage / Armor / Skill |
| `talent` | string\|null | Chest/backpack talent when present |
| `attrs` | string[] | Priority secondaries only (e.g. `CHC`, `CHD`, `Armor Regen`) — no invented % rolls |
| `mods` | string[] | Recommended gear mods; **empty** when the piece has no mod slot (Gloves, Holster) or exotic without mods |

Attribute and mod labels are short game abbreviations. Priorities follow Overgear-style Y8S3 outlines — not exact loot rolls.

## Hosting

Any static host (GitHub Pages / Netlify / Cloudflare Pages). No build step. Do not commit secrets; raid RSVPs are client-only until a backend exists.

## Branding

Replace `assets/clan-mark.svg` when you have a final Shade Task Force logo. Site strings already use **Shade Task Force Hub**.
