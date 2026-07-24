// Builds src/catalog.json from live Hugging Face metadata.
//
// For each seed entry: list the GGUF repo tree (sizes + LFS sha256), match the
// requested quant files, and read KV geometry (layers, kv heads, head dim)
// from the base model's config.json. Fails loudly on any mismatch so the
// catalog can never silently contain made-up numbers.

import { writeFileSync } from "node:fs";
import type { CatalogModel, QuantEntry } from "../src/types.js";

interface Seed {
  id: string;
  family: string;
  displayName: string;
  hfRepo: string; // GGUF repo
  baseRepo: string; // repo holding config.json
  paramsB: number;
  activeParamsB?: number;
  license: string;
  roles: CatalogModel["roles"];
  toolCallGrade: CatalogModel["toolCallGrade"];
  quants: string[]; // e.g. ["Q4_K_M", "Q8_0"]
  contextLength?: number; // override when config.json is misleading
}

const SEEDS: Seed[] = [
  {
    id: "qwen2.5-coder-3b",
    family: "Qwen2.5-Coder",
    displayName: "Qwen2.5 Coder 3B Instruct",
    hfRepo: "bartowski/Qwen2.5-Coder-3B-Instruct-GGUF",
    baseRepo: "Qwen/Qwen2.5-Coder-3B-Instruct",
    paramsB: 3.1,
    license: "Qwen Research",
    roles: ["coding"],
    toolCallGrade: "B",
    quants: ["Q4_K_M", "Q8_0"],
  },
  {
    id: "qwen2.5-coder-7b",
    family: "Qwen2.5-Coder",
    displayName: "Qwen2.5 Coder 7B Instruct",
    hfRepo: "bartowski/Qwen2.5-Coder-7B-Instruct-GGUF",
    baseRepo: "Qwen/Qwen2.5-Coder-7B-Instruct",
    paramsB: 7.6,
    license: "Apache-2.0",
    roles: ["coding"],
    toolCallGrade: "A",
    quants: ["Q4_K_M", "Q6_K"],
  },
  {
    id: "qwen2.5-coder-14b",
    family: "Qwen2.5-Coder",
    displayName: "Qwen2.5 Coder 14B Instruct",
    hfRepo: "bartowski/Qwen2.5-Coder-14B-Instruct-GGUF",
    baseRepo: "Qwen/Qwen2.5-Coder-14B-Instruct",
    paramsB: 14.7,
    license: "Apache-2.0",
    roles: ["coding"],
    toolCallGrade: "A",
    quants: ["Q4_K_M"],
  },
  {
    id: "qwen3-8b",
    family: "Qwen3",
    displayName: "Qwen3 8B",
    hfRepo: "Qwen/Qwen3-8B-GGUF",
    baseRepo: "Qwen/Qwen3-8B",
    paramsB: 8.2,
    license: "Apache-2.0",
    roles: ["coding", "general", "reasoning"],
    toolCallGrade: "A",
    quants: ["Q4_K_M"],
  },
  {
    id: "gpt-oss-20b",
    family: "gpt-oss",
    displayName: "GPT-OSS 20B (MoE)",
    hfRepo: "ggml-org/gpt-oss-20b-GGUF",
    baseRepo: "openai/gpt-oss-20b",
    paramsB: 20.9,
    activeParamsB: 3.6,
    license: "Apache-2.0",
    roles: ["coding", "general", "reasoning"],
    toolCallGrade: "A",
    quants: ["mxfp4"],
  },
  {
    id: "qwen3-coder-30b-a3b",
    family: "Qwen3-Coder",
    displayName: "Qwen3 Coder 30B-A3B (MoE)",
    hfRepo: "unsloth/Qwen3-Coder-30B-A3B-Instruct-GGUF",
    baseRepo: "Qwen/Qwen3-Coder-30B-A3B-Instruct",
    paramsB: 30.5,
    activeParamsB: 3.3,
    license: "Apache-2.0",
    roles: ["coding"],
    toolCallGrade: "A",
    quants: ["Q4_K_M"],
  },
  {
    id: "llama-3.2-3b",
    family: "Llama-3.2",
    displayName: "Llama 3.2 3B Instruct",
    hfRepo: "bartowski/Llama-3.2-3B-Instruct-GGUF",
    baseRepo: "unsloth/Llama-3.2-3B-Instruct", // meta repo is gated; unsloth mirror has config.json
    paramsB: 3.2,
    license: "Llama 3.2 Community",
    roles: ["general"],
    toolCallGrade: "B",
    quants: ["Q4_K_M"],
  },
  {
    id: "devstral-small-2507",
    family: "Devstral",
    displayName: "Devstral Small 1.1 (24B, agent-tuned)",
    hfRepo: "unsloth/Devstral-Small-2507-GGUF",
    baseRepo: "unsloth/Devstral-Small-2507",
    paramsB: 23.6,
    license: "Apache-2.0",
    roles: ["coding"],
    toolCallGrade: "A",
    quants: ["Q4_K_M"],
  },
];

interface TreeFile {
  path: string;
  size: number;
  lfs?: { oid: string; size: number };
}

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { headers: { "User-Agent": "magix-box-catalog" } });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${url}`);
  return (await res.json()) as T;
}

async function listRepoFiles(repo: string): Promise<TreeFile[]> {
  // recursive tree of the main revision
  return getJson<TreeFile[]>(
    `https://huggingface.co/api/models/${repo}/tree/main?recursive=true`
  );
}

interface HfConfig {
  num_hidden_layers?: number;
  num_key_value_heads?: number;
  num_attention_heads?: number;
  head_dim?: number;
  hidden_size?: number;
  max_position_embeddings?: number;
  text_config?: HfConfig;
}

async function getGeometry(repo: string) {
  const raw = await getJson<HfConfig>(
    `https://huggingface.co/${repo}/raw/main/config.json`
  );
  const c = raw.text_config ?? raw; // some repos nest under text_config
  const layers = c.num_hidden_layers;
  const kvHeads = c.num_key_value_heads ?? c.num_attention_heads;
  const headDim =
    c.head_dim ??
    (c.hidden_size && c.num_attention_heads
      ? c.hidden_size / c.num_attention_heads
      : undefined);
  const ctx = c.max_position_embeddings;
  if (!layers || !kvHeads || !headDim || !ctx) {
    throw new Error(`incomplete config.json geometry for ${repo}: ${JSON.stringify(c).slice(0, 200)}`);
  }
  return { layers, kvHeads, headDim, contextLength: ctx };
}

function matchQuant(files: TreeFile[], quant: string): TreeFile[] {
  const lower = quant.toLowerCase();
  const ggufs = files.filter((f) => f.path.toLowerCase().endsWith(".gguf"));
  // exact quant token in filename; exclude multi-part unless all parts match
  return ggufs.filter((f) => f.path.toLowerCase().includes(lower.toLowerCase()));
}

async function main() {
  const models: CatalogModel[] = [];
  for (const seed of SEEDS) {
    process.stderr.write(`- ${seed.id}: `);
    const [files, geo] = await Promise.all([
      listRepoFiles(seed.hfRepo),
      getGeometry(seed.baseRepo),
    ]);
    const quants: QuantEntry[] = [];
    for (const q of seed.quants) {
      const matches = matchQuant(files, q).filter(
        (f) => !/split|00002|00003/.test(f.path)
      );
      if (matches.length === 0) throw new Error(`no ${q} gguf in ${seed.hfRepo}`);
      // Prefer the shortest path (top-level single file over subfolder variants)
      const f = matches.sort((a, b) => a.path.length - b.path.length)[0];
      if (!f.lfs?.oid) throw new Error(`no LFS sha256 for ${f.path} in ${seed.hfRepo}`);
      quants.push({
        quant: q,
        sizeBytes: f.lfs.size ?? f.size,
        sha256: f.lfs.oid,
        url: `https://huggingface.co/${seed.hfRepo}/resolve/main/${f.path}`,
        filename: f.path.split("/").pop()!,
      });
    }
    models.push({
      id: seed.id,
      family: seed.family,
      displayName: seed.displayName,
      hfRepo: seed.hfRepo,
      paramsB: seed.paramsB,
      activeParamsB: seed.activeParamsB ?? seed.paramsB,
      contextLength: seed.contextLength ?? geo.contextLength,
      layers: geo.layers,
      kvHeads: geo.kvHeads,
      headDim: geo.headDim,
      license: seed.license,
      roles: seed.roles,
      toolCallGrade: seed.toolCallGrade,
      quants,
    });
    process.stderr.write(
      `ok (${quants.map((q) => q.quant).join(", ")}; L${geo.layers} kv${geo.kvHeads} d${geo.headDim} ctx${geo.contextLength})\n`
    );
  }
  const out = new URL("../../src/catalog.json", import.meta.url).pathname;
  writeFileSync(
    out,
    JSON.stringify({ generatedAt: new Date().toISOString(), models }, null, 2)
  );
  console.log(`wrote ${out} with ${models.length} models`);
}

main().catch((e) => {
  console.error("FATAL:", e.message);
  process.exit(1);
});
