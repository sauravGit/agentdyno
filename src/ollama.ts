// Ollama as an alternative backend to our managed llama-server.
//
// Verified live against a real Ollama 0.x daemon (see BUILD_LOG.md D-018):
// /api/tags and /api/show shapes, geometry key names, the OpenAI-compatible
// /v1/chat/completions endpoint (reused as-is by probes.ts — Ollama puts a
// failed tool call in `content` rather than `tool_calls`, which our existing
// firstToolCall() already treats as "no call", so zero probe changes needed),
// and the native Anthropic-compatible /v1/messages endpoint used by Claude Code.
//
// We do NOT scrape ollama.com/search (no public JSON API for the library
// exists) — Ollama's own registry resolves a model tag on `pull`, which is
// all a backend needs. Real per-model KV geometry comes from the daemon's
// own /api/show at pull time, not a hand-maintained mapping.

import type { CatalogModel, QuantEntry } from "./types.js";

export const OLLAMA_BASE_URL = "http://127.0.0.1:11434";
const HEALTH_TIMEOUT_MS = 800;

export async function isOllamaRunning(): Promise<boolean> {
  try {
    const res = await fetch(`${OLLAMA_BASE_URL}/api/tags`, {
      signal: AbortSignal.timeout(HEALTH_TIMEOUT_MS),
    });
    return res.ok;
  } catch {
    return false;
  }
}

interface TagsEntry {
  name: string;
  model: string;
  size: number;
  digest: string;
  details: {
    family: string;
    families?: string[];
    parameter_size: string; // e.g. "3.1B"
    quantization_level: string; // e.g. "Q4_K_M"
    context_length?: number;
    embedding_length?: number;
  };
  capabilities?: string[]; // e.g. ["completion", "tools", "insert"]
}

export async function listOllamaModels(): Promise<TagsEntry[]> {
  const res = await fetch(`${OLLAMA_BASE_URL}/api/tags`);
  if (!res.ok) throw new Error(`ollama /api/tags failed: ${res.status}`);
  const data = (await res.json()) as { models: TagsEntry[] };
  return data.models;
}

interface ShowResponse {
  details: TagsEntry["details"];
  model_info: Record<string, number | string | number[] | undefined>;
}

export interface OllamaGeometry {
  family: string;
  layers: number;
  kvHeads: number;
  headDim: number;
  contextLength: number;
  paramsB: number;
  quant: string;
  toolCapable: boolean;
}

function num(v: unknown): number | undefined {
  return typeof v === "number" ? v : undefined;
}

/**
 * Pull real KV geometry from a locally-pulled Ollama model via /api/show.
 * Fails loudly (no invented numbers) if the expected keys are missing —
 * architecture prefixes vary (qwen2, llama, gptoss, ...) and we only trust
 * what the daemon actually reports for that family.
 */
export async function showOllamaModel(nameOrTag: string): Promise<OllamaGeometry> {
  const res = await fetch(`${OLLAMA_BASE_URL}/api/show`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: nameOrTag }),
  });
  if (!res.ok) throw new Error(`ollama /api/show failed for ${nameOrTag}: ${res.status}`);
  const data = (await res.json()) as ShowResponse;
  const family = data.details.family;
  const mi = data.model_info;

  const layers = num(mi[`${family}.block_count`]);
  const headCount = num(mi[`${family}.attention.head_count`]);
  const kvHeads = num(mi[`${family}.attention.head_count_kv`]) ?? headCount;
  const embeddingLength = num(mi[`${family}.embedding_length`]);
  const headDim =
    num(mi[`${family}.rope.dimension_count`]) ??
    (embeddingLength && headCount ? embeddingLength / headCount : undefined);
  const contextLength = num(mi[`${family}.context_length`]) ?? data.details.context_length;
  const paramsB = Number(String(data.details.parameter_size).replace(/[^\d.]/g, ""));

  if (!layers || !kvHeads || !headDim || !contextLength || !paramsB) {
    throw new Error(
      `incomplete geometry for ${nameOrTag} (family "${family}"): ` +
        `layers=${layers} kvHeads=${kvHeads} headDim=${headDim} ctx=${contextLength} paramsB=${paramsB}`
    );
  }

  return {
    family,
    layers,
    kvHeads,
    headDim,
    contextLength,
    paramsB,
    quant: data.details.quantization_level,
    toolCapable: true, // caller cross-checks against /api/tags capabilities
  };
}

/** Build a CatalogModel-shaped entry from a live Ollama pull, for fit.ts reuse. */
export async function ollamaModelToCatalogEntry(tag: string): Promise<CatalogModel> {
  const [tags, geo] = await Promise.all([listOllamaModels(), showOllamaModel(tag)]);
  const entry = tags.find((t) => t.name === tag || t.model === tag);
  if (!entry) throw new Error(`${tag} not found in ollama /api/tags — pull it first`);
  const toolCapable = entry.capabilities?.includes("tools") ?? false;
  const quant: QuantEntry = {
    quant: geo.quant,
    sizeBytes: entry.size,
    sha256: entry.digest,
    url: `ollama://${tag}`, // resolved via `ollama pull`, not a direct download URL
    filename: tag,
  };
  return {
    id: `ollama:${tag}`,
    family: geo.family,
    displayName: `${tag} (ollama)`,
    hfRepo: "",
    paramsB: geo.paramsB,
    activeParamsB: geo.paramsB,
    contextLength: geo.contextLength,
    layers: geo.layers,
    kvHeads: geo.kvHeads,
    headDim: geo.headDim,
    license: "see `ollama show` — varies by model",
    roles: ["coding"],
    // Ollama reporting "tools" capability is a claim, not our proof; catalog
    // grade stays a conservative "B?" until `dyno doctor` actually verifies it,
    // same as every other unverified prior in the catalog.
    toolCallGrade: toolCapable ? "B" : "C",
    quants: [quant],
  };
}

/** Pull a model via Ollama's real streaming API, mirroring pull.ts's progress UX. */
export async function pullOllamaModel(tag: string): Promise<void> {
  const res = await fetch(`${OLLAMA_BASE_URL}/api/pull`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: tag, stream: true }),
  });
  if (!res.ok || !res.body) throw new Error(`ollama pull failed: ${res.status}`);
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  let lastPrint = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    let nl: number;
    while ((nl = buf.indexOf("\n")) >= 0) {
      const line = buf.slice(0, nl);
      buf = buf.slice(nl + 1);
      if (!line.trim()) continue;
      const evt = JSON.parse(line) as { status: string; total?: number; completed?: number };
      if (evt.status === "success") {
        process.stderr.write("\n");
        return;
      }
      const now = Date.now();
      if (now - lastPrint > 500) {
        lastPrint = now;
        const pct = evt.total ? ((evt.completed ?? 0) / evt.total * 100).toFixed(1) + "%" : "";
        process.stderr.write(`\r  ${evt.status} ${pct}   `);
      }
    }
  }
}
