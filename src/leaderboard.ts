// External benchmark signal, sourced from Aider's polyglot coding leaderboard
// (github.com/Aider-AI/aider, aider/website/_data/polyglot_leaderboard.yml).
// Verified 2026-07-27: 69 entries, real pass-rate data on a multi-language
// coding benchmark. Coverage skews toward large API-hosted models; most
// laptop-sized quantized models (3B-14B) are NOT on it. We do not fake a
// match: a model only gets an external score when the SAME family AND a
// close parameter count appear on the leaderboard. Otherwise it is reported
// as "no external data" rather than borrowing a bigger sibling's score.

import { readFileSync, writeFileSync, existsSync, statSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import * as yaml from "js-yaml";
import { HOME } from "./catalog.js";
import type { CatalogModel } from "./types.js";

const SOURCE_URL =
  "https://raw.githubusercontent.com/Aider-AI/aider/main/aider/website/_data/polyglot_leaderboard.yml";
const CACHE_PATH = join(HOME, "cache", "aider_polyglot.yml");
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24h: this leaderboard updates infrequently

interface RawEntry {
  model?: string;
  pass_rate_2?: number | string;
  edit_format?: string;
  percent_cases_well_formed?: number | string;
}

export interface LeaderboardEntry {
  rawName: string;
  family: string; // normalized family token we matched on
  paramsB: number; // parsed from the raw name, e.g. "32B" -> 32
  passRate2: number; // 0-100, aider's stricter pass rate (2 attempts allowed)
  editFormat: string;
}

export interface ExternalScore {
  matched: true;
  entry: LeaderboardEntry;
  note: string;
}
export interface NoExternalScore {
  matched: false;
  reason: string;
}
export type ExternalMatch = ExternalScore | NoExternalScore;

/** Family keywords we know how to recognize in free-text leaderboard names. */
const FAMILY_ALIASES: Record<string, string[]> = {
  "qwen2.5-coder": ["qwen2.5-coder", "qwen2.5 coder"],
  qwen3: ["qwen3"], // catches "Qwen3 32B" but NOT "Qwen3-Coder" (checked below)
  "qwen3-coder": ["qwen3-coder", "qwen3 coder"],
  "gpt-oss": ["gpt-oss"],
  "llama-3.2": ["llama-3.2", "llama 3.2"],
  devstral: ["devstral"],
};

function normalize(s: string): string {
  return s.toLowerCase().replace(/[\s_]+/g, "-");
}

function parseParamsB(name: string): number | null {
  const m = name.match(/(\d+(?:\.\d+)?)\s*b\b/i);
  return m ? Number(m[1]) : null;
}

function detectFamily(name: string): string | null {
  const n = normalize(name);
  // longest-alias-first so "qwen3-coder" is checked before the "qwen3" alias
  const order = Object.entries(FAMILY_ALIASES).sort(
    (a, b) => Math.max(...b[1].map((s) => s.length)) - Math.max(...a[1].map((s) => s.length))
  );
  for (const [family, aliases] of order) {
    if (aliases.some((a) => n.includes(normalize(a)))) return family;
  }
  return null;
}

export function parseLeaderboard(yamlText: string): LeaderboardEntry[] {
  const raw = yaml.load(yamlText) as RawEntry[];
  if (!Array.isArray(raw)) throw new Error("unexpected leaderboard shape: not a list");
  const out: LeaderboardEntry[] = [];
  for (const r of raw) {
    if (!r.model || r.pass_rate_2 === undefined) continue;
    const family = detectFamily(r.model);
    const paramsB = parseParamsB(r.model);
    if (!family || paramsB === null) continue; // no fabricated entries for unparseable names
    out.push({
      rawName: r.model,
      family,
      paramsB,
      passRate2: Number(r.pass_rate_2),
      editFormat: String(r.edit_format ?? ""),
    });
  }
  return out;
}

function loadCached(): string | null {
  if (!existsSync(CACHE_PATH)) return null;
  if (Date.now() - statSync(CACHE_PATH).mtimeMs > CACHE_TTL_MS) return null;
  return readFileSync(CACHE_PATH, "utf8");
}

export async function fetchLeaderboard(opts: { force?: boolean } = {}): Promise<LeaderboardEntry[]> {
  let text = opts.force ? null : loadCached();
  if (!text) {
    const res = await fetch(SOURCE_URL, { headers: { "User-Agent": "agentdyno" } });
    if (!res.ok) throw new Error(`leaderboard fetch failed: ${res.status} ${res.statusText}`);
    text = await res.text();
    mkdirSync(join(HOME, "cache"), { recursive: true });
    writeFileSync(CACHE_PATH, text);
  }
  return parseLeaderboard(text);
}

/**
 * Find an honest external score for a catalog model: same family AND
 * parameter count within +/-25% (a 7B model does not inherit a 32B sibling's
 * score). Among valid matches, prefer the closest parameter count.
 */
export function matchExternalScore(model: CatalogModel, entries: LeaderboardEntry[]): ExternalMatch {
  const family = normalize(model.family);
  const candidates = entries.filter((e) => normalize(e.family) === family);
  if (candidates.length === 0) {
    return { matched: false, reason: `no "${model.family}" entries on the leaderboard` };
  }
  const close = candidates.filter(
    (e) => Math.abs(e.paramsB - model.activeParamsB) / model.activeParamsB <= 0.25
  );
  if (close.length === 0) {
    const sizes = candidates.map((c) => `${c.paramsB}B`).join(", ");
    return {
      matched: false,
      reason: `leaderboard only has ${model.family} at ${sizes} (yours is ${model.activeParamsB}B) — not close enough to borrow a score`,
    };
  }
  close.sort(
    (a, b) =>
      Math.abs(a.paramsB - model.activeParamsB) - Math.abs(b.paramsB - model.activeParamsB)
  );
  const entry = close[0];
  return {
    matched: true,
    entry,
    note: `${entry.rawName} scored ${entry.passRate2}% on Aider's polyglot coding benchmark (${entry.editFormat} format)`,
  };
}
