// Shade Hub: import a Build Station (buildstation.app) TD2 build.
// Function name: buildstation-import
// Deploy with verify_jwt = true. The gateway checks the JWT, and this
// function still requires profiles.is_admin before it fetches the page.
// The browser maps each item name onto data/td2/index.json and stores that
// catalog id. Asset URLs in the normalized payload are not rendered.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const PAGES_ORIGIN = "https://denomics83.github.io";
const ASSET_BASE = "https://storage.googleapis.com/assets.buildstation.app";
const WEAPON_FOLDER: Record<string, string> = {
  "Assault Rifle": "ar",
  Rifle: "rifle",
  Shotgun: "shotgun",
  "Marksman Rifle": "mmr",
  LMG: "lmg",
  SMG: "smg",
  Pistol: "sidearm",
};
const GEAR_SLOTS = ["mask", "backpack", "chest", "gloves", "holster", "kneepads"] as const;

function corsHeaders(origin: string | null): HeadersInit {
  const allow = origin === PAGES_ORIGIN ? origin : PAGES_ORIGIN;
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    Vary: "Origin",
  };
}

function json(body: unknown, status: number, origin: string | null): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
  });
}

function asset(path: string): string {
  return ASSET_BASE + (path.charAt(0) === "/" ? path : "/" + path);
}

function brandSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function rarityOf(quality: string, type: string): string {
  const value = (quality || type || "").toLowerCase();
  if (value === "e" || value.indexOf("exotic") >= 0) return "exotic";
  if (value === "n" || value.indexOf("named") >= 0) return "named";
  if (value === "s" || value.indexOf("gear") >= 0) return "gear-set";
  if (value.indexOf("default") >= 0) return "";
  return "high-end";
}

function textValue(value: unknown): string {
  if (value == null) return "";
  return String(value).trim();
}

function statName(value: unknown): string {
  if (!value || typeof value !== "object") return "";
  const row = value as Record<string, unknown>;
  return textValue(row.Stat || row.label || row.Name || row.Talent);
}

function isFilledStat(value: unknown): boolean {
  const name = statName(value);
  return !!name && name !== "0";
}

function attr(name: string, value: unknown, max?: unknown): { name: string; value: string; max: string } | null {
  const label = textValue(name);
  const amount = textValue(value);
  if (!label || amount === "" || amount === "0") return null;
  return { name: label, value: amount, max: textValue(max) };
}

function talentOf(custom: Record<string, unknown>, item: Record<string, unknown>): { name: string; text: string; icon: string } {
  const customTalent = custom.Talent;
  if (customTalent && typeof customTalent === "object") {
    const row = customTalent as Record<string, unknown>;
    const name = textValue(row.Talent || row.Name);
    if (name) {
      const iconFile = textValue(row.Icon);
      const folder = iconFile.indexOf("weapon-talent") === 0 ? "talents/weapons/" : "talents/gear/";
      return {
        name,
        text: textValue(row.Desc),
        icon: iconFile ? asset("/td2/icons/" + folder + iconFile) : "",
      };
    }
  }
  const itemTalent = item.Talent;
  if (typeof itemTalent === "string" && itemTalent.trim() && itemTalent.trim() !== "A") {
    return { name: itemTalent.trim(), text: "", icon: "" };
  }
  return { name: "", text: "", icon: "" };
}

function modsOf(custom: Record<string, unknown>): { name: string; stat: string; value: string }[] {
  const mods = [];
  Object.keys(custom).forEach(function (key) {
    if (key.indexOf("Mod") !== 0 || key.indexOf("Slot") < 0) return;
    const row = custom[key];
    if (!row || typeof row !== "object") return;
    const mod = row as Record<string, unknown>;
    const name = textValue(mod.Name);
    if (!name) return;
    mods.push({
      name,
      stat: textValue(mod.pos || mod.Stat),
      value: textValue(mod.valPos),
    });
  });
  return mods;
}

function weaponIcon(item: Record<string, unknown>): string {
  const file = textValue(item.Icon);
  const folder = WEAPON_FOLDER[textValue(item["Weapon Type"])] || "";
  if (file && folder) return asset("/td2/icons/weapons/" + folder + "/" + file);
  if (file && file.indexOf("Default") >= 0) return asset("/td2/icons/weapons/sidearm/" + file);
  return file ? asset("/td2/icons/weapons/" + file) : "";
}

function gearIcon(slot: string, item: Record<string, unknown>): string {
  const file = textValue(item.Icon);
  if (!file) return asset("/td2/icons/gear/" + slot + "/" + slot.charAt(0).toUpperCase() + slot.slice(1) + "Default.png");
  return asset("/td2/icons/gear/" + slot + "/" + file);
}

function brandIcon(name: string): string {
  if (!name || name.toLowerCase() === "exotic") return asset("/td2/icons/brands/exotic.png");
  return asset("/td2/icons/brands/" + brandSlug(name) + ".png");
}

function normalizeSlotWeapon(slot: Record<string, unknown> | undefined) {
  const item = (slot && slot.item && typeof slot.item === "object" ? slot.item : {}) as Record<string, unknown>;
  const custom = (slot && slot.custom && typeof slot.custom === "object" ? slot.custom : {}) as Record<string, unknown>;
  const name = textValue(item.Name);
  if (!name || name === "Default Sidearm") {
    return { name: "", type: "", rarity: "", talent: "", talentText: "", talentIcon: "", attributes: [], mods: [], icon: "", image: "" };
  }
  const talent = talentOf(custom, item);
  const attributes = [
    attr(statName(custom["Core 1"]) || textValue(item["Core 1"]), custom["Core 1 Value"], (custom["Core 1"] as Record<string, unknown> | undefined)?.Max),
    attr(statName(custom["Core 2"]) || textValue(item["Core 2"]), custom["Core 2 Value"], (custom["Core 2"] as Record<string, unknown> | undefined)?.Max),
    attr(statName(custom["Attribute 1"]) || textValue(item["Attribute 1"]), custom["Attribute 1 Value"], (custom["Attribute 1"] as Record<string, unknown> | undefined)?.Max),
  ].filter(Boolean);
  const mods = modsOf(custom);
  const icon = weaponIcon(item);
  return {
    name,
    type: textValue(item["Weapon Type"]),
    rarity: rarityOf(textValue(item.Quality), ""),
    talent: talent.name,
    talentText: talent.text,
    talentIcon: talent.icon,
    attributes,
    mods,
    icon,
    image: icon,
  };
}

function normalizeGear(slotName: string, slot: Record<string, unknown> | undefined) {
  const item = (slot && slot.item && typeof slot.item === "object" ? slot.item : {}) as Record<string, unknown>;
  const custom = (slot && slot.custom && typeof slot.custom === "object" ? slot.custom : {}) as Record<string, unknown>;
  const name = textValue(item["Item Name"] || item.Name);
  if (!name) {
    return { name: "", brand: "", rarity: "", core: "", coreValue: "", attributes: [], mod: "", talent: "", talentText: "", talentIcon: "", icon: "", image: "", brandIcon: "" };
  }
  const talent = talentOf(custom, item);
  const core = statName(custom["Core 1"]) || textValue(item.Core);
  const attributes = [1, 2, 3].map(function (index) {
    return attr(
      statName(custom["Attribute " + index]) || textValue(item["Attribute " + index]),
      custom["Attribute " + index + " Value"],
      (custom["Attribute " + index] as Record<string, unknown> | undefined)?.Max,
    );
  }).filter(Boolean);
  const mods = modsOf(custom);
  const icon = gearIcon(slotName, item);
  const brand = textValue(item.Brand);
  return {
    name,
    brand,
    rarity: rarityOf(textValue(item.Quality), textValue(item.Type)),
    core,
    coreValue: textValue(custom["Core 1 Value"]),
    attributes,
    mod: mods.map(function (mod) { return mod.name + (mod.stat ? " · " + mod.stat + (mod.value ? " " + mod.value : "") : ""); }).join(", "),
    talent: talent.name,
    talentText: talent.text,
    talentIcon: talent.icon,
    icon,
    image: icon,
    brandIcon: brandIcon(brand),
  };
}

function normalizeSkill(slot: Record<string, unknown> | undefined) {
  const item = (slot && slot.item && typeof slot.item === "object" ? slot.item : {}) as Record<string, unknown>;
  const name = textValue(item.Name || item["Item Name"]);
  const file = textValue(item.Icon);
  const icon = file ? asset("/td2/icons/skills/" + file) : "";
  return { name, variant: textValue(item.Variant), icon, image: icon };
}

function normalizeSpec(slot: Record<string, unknown> | undefined) {
  const item = (slot && slot.item && typeof slot.item === "object" ? slot.item : {}) as Record<string, unknown>;
  const name = textValue(item.Name);
  const file = textValue(item.Icon);
  const icon = file ? asset("/td2/icons/spec/" + file) : "";
  return { name, icon, image: icon };
}

function normalizeWatch(watch: Record<string, unknown> | undefined) {
  if (!watch) return { name: "", icon: "", image: "", rarity: "", attributes: [] };
  const groups = ["offense", "defense", "utility", "handling"];
  const attributes: { name: string; value: string }[] = [];
  groups.forEach(function (group) {
    const row = watch[group];
    if (!row || typeof row !== "object") return;
    Object.keys(row as object).forEach(function (key) {
      const amount = Number((row as Record<string, unknown>)[key]);
      if (!amount) return;
      const label = key.replace(/([A-Z])/g, " $1").replace(/^./, function (ch) { return ch.toUpperCase(); });
      attributes.push({ name: label.trim(), value: (amount <= 1 ? Math.round(amount * 100) : amount) + "%" });
    });
  });
  return {
    name: "SHD Watch",
    icon: asset("/td2/icons/Watch.png"),
    image: asset("/td2/icons/Watch.png"),
    rarity: "high-end",
    attributes,
  };
}

export function normalizeBuild(raw: Record<string, unknown>) {
  const weapons = {
    primary: normalizeSlotWeapon(raw.primary as Record<string, unknown>),
    secondary: normalizeSlotWeapon(raw.secondary as Record<string, unknown>),
    sidearm: normalizeSlotWeapon(raw.sidearm as Record<string, unknown>),
  };
  const gear: Record<string, unknown> = {};
  GEAR_SLOTS.forEach(function (slot) {
    gear[slot] = normalizeGear(slot, raw[slot] as Record<string, unknown>);
  });
  return {
    specialization: normalizeSpec(raw.specialization as Record<string, unknown>),
    signature: {
      name: textValue((raw.specialization as Record<string, unknown> | undefined)?.slot) || "Signature",
      icon: "",
      image: "",
    },
    grenade: normalizeWatch(raw.watch as Record<string, unknown>),
    ...weapons,
    ...gear,
    skill1: normalizeSkill(raw.skill1 as Record<string, unknown>),
    skill2: normalizeSkill(raw.skill2 as Record<string, unknown>),
  };
}

function decodeJsString(literal: string): string {
  return JSON.parse('"' + literal + '"');
}

function flightBlob(html: string): string {
  const marker = "self.__next_f.push(";
  let cursor = 0;
  const chunks: string[] = [];
  while (cursor < html.length) {
    const start = html.indexOf(marker, cursor);
    if (start < 0) break;
    let index = start + marker.length;
    let depth = 0;
    let inString = false;
    let quote = "";
    let escaped = false;
    let end = index;
    for (; end < html.length; end++) {
      const ch = html[end];
      if (inString) {
        if (escaped) escaped = false;
        else if (ch === "\\") escaped = true;
        else if (ch === quote) inString = false;
        continue;
      }
      if (ch === '"' || ch === "'") {
        inString = true;
        quote = ch;
      } else if (ch === "(") depth += 1;
      else if (ch === ")") {
        if (depth === 0) break;
        depth -= 1;
      }
    }
    const raw = html.slice(index, end);
    let stringAt = 0;
    while (stringAt < raw.length) {
      if (raw[stringAt] !== '"') {
        stringAt += 1;
        continue;
      }
      let walk = stringAt + 1;
      let lit = "";
      let esc = false;
      for (; walk < raw.length; walk++) {
        const ch = raw[walk];
        if (esc) {
          lit += "\\" + ch;
          esc = false;
        } else if (ch === "\\") esc = true;
        else if (ch === '"') break;
        else lit += ch;
      }
      if (lit.length > 20) {
        try {
          chunks.push(decodeJsString(lit));
        } catch (_err) {
          chunks.push(lit);
        }
      }
      stringAt = walk + 1;
    }
    cursor = end + 1;
  }
  return chunks.join("");
}

function extractBuild(blob: string): Record<string, unknown> {
  const token = '"dbBuild":';
  const at = blob.indexOf(token);
  if (at < 0) throw new Error("Build Station page did not include a build.");
  const start = blob.indexOf("{", at);
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let index = start; index < blob.length; index++) {
    const ch = blob[index];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === "{") depth += 1;
    else if (ch === "}") {
      depth -= 1;
      if (depth === 0) return JSON.parse(blob.slice(start, index + 1));
    }
  }
  throw new Error("Build Station build object was truncated.");
}

function pageTitle(html: string, id: string): string {
  const match = html.match(/<title>([^<]+)<\/title>/i);
  if (!match) return id;
  const title = match[1].split("|")[0].trim();
  return title || id;
}

function acceptedUrl(input: { url?: string; id?: string }): { url: string; id: string } {
  const rawUrl = textValue(input.url);
  const rawId = textValue(input.id);
  if (rawUrl) {
    let parsed: URL;
    try {
      parsed = new URL(rawUrl);
    } catch (_err) {
      throw new Error("That is not a Build Station link.");
    }
    if (parsed.protocol !== "https:" || !/(^|\.)buildstation\.app$/i.test(parsed.hostname)) {
      throw new Error("Only buildstation.app links can be imported.");
    }
    const match = parsed.pathname.match(/\/td2\/builder\/(?:game\/)?([A-Za-z0-9]+)\/?$/);
    if (!match) throw new Error("Use a Build Station TD2 builder link.");
    return { url: parsed.toString(), id: match[1] };
  }
  if (!/^[A-Za-z0-9]+$/.test(rawId)) throw new Error("Build Station id is missing.");
  return { url: "https://buildstation.app/td2/builder/game/" + rawId, id: rawId };
}

Deno.serve(async function (req) {
  const origin = req.headers.get("origin");
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders(origin) });
  if (req.method !== "POST") return json({ error: "POST a Build Station url or id." }, 405, origin);
  const auth = req.headers.get("Authorization") || "";
  if (!auth.toLowerCase().startsWith("bearer ")) return json({ error: "Sign in as an admin first." }, 401, origin);
  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const anon = Deno.env.get("SUPABASE_ANON_KEY") || "";
  if (!supabaseUrl || !anon) return json({ error: "Supabase env is not configured." }, 500, origin);
  const sb = createClient(supabaseUrl, anon, { global: { headers: { Authorization: auth } } });
  const userRes = await sb.auth.getUser();
  const user = userRes.data.user;
  if (!user) return json({ error: "Sign in as an admin first." }, 401, origin);
  const profile = await sb.from("profiles").select("is_admin").eq("id", user.id).maybeSingle();
  if (profile.error || !profile.data || !profile.data.is_admin) {
    return json({ error: "Only an admin can import builds." }, 403, origin);
  }
  let body: { url?: string; id?: string } = {};
  try {
    body = await req.json();
  } catch (_err) {
    return json({ error: "Send JSON with a url or id." }, 400, origin);
  }
  try {
    const target = acceptedUrl(body);
    const page = await fetch(target.url, { headers: { "User-Agent": "ShadeHubBuildImport" } });
    if (!page.ok) return json({ error: "Build Station returned " + page.status + "." }, 502, origin);
    const html = await page.text();
    const raw = extractBuild(flightBlob(html));
    return json({
      source_id: target.id,
      source_url: target.url,
      name: pageTitle(html, target.id),
      raw,
      normalized: normalizeBuild(raw),
    }, 200, origin);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Import failed.";
    return json({ error: message }, 400, origin);
  }
});
