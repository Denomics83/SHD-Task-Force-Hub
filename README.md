# Shade Task Force Hub

Mobile-first static clan site for *Tom Clancy's The Division 2*.

**Path:** `/workspace/division-builds/clan-hub/`

## Bottom navigation (5 tabs)

| Tab | Page | Notes |
|-----|------|--------|
| **Updates** | `index.html` | Home — announcement, maintenance, and patch cards |
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
| `data/season.json` | Season detail, including the `theme` paragraph |
| `data/raids.json` | Seed raid schedule |
| `data/event-types.json` | Reusable event types. The schedule dropdown reads this file |
| `data/events.json` | Scheduled event instances (UTC) |
| `data/manhunt.json` | Season manhunt weeks |
| `data/journey.json` | Journey missions per season |
| `data/global-modifiers.json` | Unused by the season page. Modifiers come from `data/modifiers.json` |

## How to add events

There is no server. `admin.html` commits JSON to `main` with a GitHub token that stays in this browser.

1. GitHub → **Settings → Developer settings → Personal access tokens → Fine-grained tokens → Generate new token**.
2. Repository access: only `Denomics83/SHD-Task-Force-Hub`.
3. Permissions: **Contents: Read and write**.
4. Open `admin.html`. The Resources **Events** tile goes straight to the event editor (`admin.html#events`). There is also an Admin link on the Events page.
5. Paste the token and log in. It is stored in `localStorage` on this device and is never committed.
6. **Event type:** choose New type, or an existing type, and edit every field. Save. The type appears in the schedule dropdown immediately. Delete warns when scheduled events still use that type. Seed types are placeholders (`add details`) for you to replace.
7. **Schedule an event:** pick a saved type, set start and end in Melbourne time, and save. Times are stored as UTC. Tap a live card on Events for the one-pager: start, end, countdown, and that type’s specifics (description, rewards, modifiers, tasks).
8. **Season theme:** one paragraph under the season tabs. The line stays hidden while it is empty or still `Add the season theme here`.
9. **Configure manhunt / Configure journey:** tap a week or mission, tap a task, type, then save. Journey is keyed by season in `data/journey.json`. Manhunt weeks default to 13, with 3 tasks each.
10. **Map image:** pick a season, event type, or scheduled event, upload jpg/png/webp (resized to 1600px wide), and save. Uploading again replaces it. Remove map clears it. A season with no image shows the OpenStreetMap altar plot. An event with no image hides Map.

Saves land on `main`. GitHub Pages usually updates within a minute. Log out to drop the token from this browser.

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
