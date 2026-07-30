// Honest memory-fit math.
//
//   need(C) = weights + kv(C) + overhead
//   kv(C)   = 2 (K and V) * layers * kvHeads * headDim * bytesPerElem * C
//
// KV geometry comes from each model's real config.json (catalog), so models
// with grouped-query attention are correctly rewarded with small caches.
// fp16 KV by default (llama-server default); overhead is a flat allowance for
// compute buffers + runtime.

import type {
  CatalogModel,
  FitMode,
  HardwareReport,
  QuantEntry,
  QuantFit,
} from "./types.js";

export const DEFAULT_CONTEXT = 16_384; // agents need context; 8K is too thin
const KV_BYTES_PER_ELEM = 2; // fp16
const OVERHEAD_BYTES = 1.2 * 1024 ** 3; // compute buffers + runtime allowance
const COMFORT_HEADROOM = 0.85; // "comfortable" = need <= 85% of budget

export function kvBytesPerToken(m: CatalogModel): number {
  return 2 * m.layers * m.kvHeads * m.headDim * KV_BYTES_PER_ELEM;
}

export function needBytes(m: CatalogModel, q: QuantEntry, context: number): number {
  return q.sizeBytes + kvBytesPerToken(m) * context + OVERHEAD_BYTES;
}

/** Largest context (capped at model window) with need <= comfort threshold. */
export function maxComfortableContext(
  m: CatalogModel,
  q: QuantEntry,
  budgetBytes: number
): number {
  const room = budgetBytes * COMFORT_HEADROOM - q.sizeBytes - OVERHEAD_BYTES;
  if (room <= 0) return 0;
  return Math.min(m.contextLength, Math.floor(room / kvBytesPerToken(m)));
}

export function fitQuant(
  m: CatalogModel,
  q: QuantEntry,
  hw: HardwareReport,
  context: number = DEFAULT_CONTEXT
): QuantFit {
  const need = needBytes(m, q, Math.min(context, m.contextLength));
  const gpu = hw.gpuBudgetBytes;
  const ram = hw.ramBudgetBytes;

  let mode: FitMode;
  let gpuLayers: number | null = null;

  if (gpu > 0 && need <= gpu * COMFORT_HEADROOM) {
    mode = "comfortable";
  } else if (gpu > 0 && need <= gpu) {
    mode = "tight";
  } else if (gpu > 0 && need <= gpu + ram && q.sizeBytes > gpu) {
    mode = "partial-offload";
    // Layers that fit on GPU after reserving KV + overhead there.
    const kvAndOverhead = kvBytesPerToken(m) * context + OVERHEAD_BYTES;
    const weightRoom = Math.max(0, gpu - kvAndOverhead);
    gpuLayers = Math.max(
      0,
      Math.min(m.layers, Math.floor((weightRoom / q.sizeBytes) * m.layers))
    );
  } else if (gpu > 0 && need <= gpu + ram) {
    // Weights fit on GPU but KV pushes it over: still a partial situation.
    mode = "partial-offload";
    gpuLayers = m.layers;
  } else if (need <= ram) {
    mode = "cpu-only";
  } else {
    mode = "wont-fit";
  }

  // CPU-only machines: no GPU modes possible.
  if (gpu === 0) {
    mode = need <= ram ? "cpu-only" : "wont-fit";
  }

  // The budget maxComfortableContext checks room against must match what the
  // mode above actually determined is available: partial-offload and
  // cpu-only both spill weights into system RAM, so checking against the
  // GPU-only budget alone was making room go negative for any model whose
  // weights already exceed GPU memory (the exact condition that put it in
  // partial-offload in the first place) — maxComfortableContext silently
  // returned 0 for every real, working gpu+cpu-split fit. Found via a live
  // `dyno fit` run showing max-ctx: 0 for GPT-OSS-20B/Devstral/Qwen-14B, all
  // models this project has actually served successfully.
  const budget = mode === "cpu-only" ? ram : mode === "partial-offload" ? gpu + ram : gpu;
  return {
    model: m,
    quant: q,
    mode,
    needBytes: need,
    maxComfortableContext: maxComfortableContext(m, q, budget),
    gpuLayers,
    evaluatedContext: Math.min(context, m.contextLength),
  };
}

const MODE_RANK: Record<FitMode, number> = {
  comfortable: 0,
  tight: 1,
  "partial-offload": 2,
  "cpu-only": 3,
  "wont-fit": 4,
};

/** All fits for a catalog, best first: by mode, then tool grade, then size. */
export function rankFits(
  models: CatalogModel[],
  hw: HardwareReport,
  context: number = DEFAULT_CONTEXT
): QuantFit[] {
  const fits: QuantFit[] = [];
  for (const m of models) for (const q of m.quants) fits.push(fitQuant(m, q, hw, context));
  return fits.sort((a, b) => {
    const mr = MODE_RANK[a.mode] - MODE_RANK[b.mode];
    if (mr !== 0) return mr;
    const tg = a.model.toolCallGrade.localeCompare(b.model.toolCallGrade);
    if (tg !== 0) return tg;
    return b.quant.sizeBytes - a.quant.sizeBytes; // bigger = more capable
  });
}
