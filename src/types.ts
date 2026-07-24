// Core shared types for magix-box.

export type Accel = "metal" | "cuda" | "cpu";

export interface HardwareReport {
  os: "darwin" | "linux" | "win32";
  arch: "arm64" | "x64";
  cpuBrand: string;
  cores: number;
  ramBytes: number;
  /** GPU memory budget in bytes usable for model weights + KV (0 = CPU only). */
  gpuBudgetBytes: number;
  /** Portion of system RAM we allow for CPU inference. */
  ramBudgetBytes: number;
  accel: Accel;
  gpuName: string | null;
  diskFreeBytes: number;
  notes: string[];
}

export interface QuantEntry {
  /** e.g. "Q4_K_M" */
  quant: string;
  /** Exact GGUF file size in bytes (from Hugging Face LFS metadata). */
  sizeBytes: number;
  /** SHA-256 of the GGUF file (from Hugging Face LFS metadata). */
  sha256: string;
  /** Download URL (resolved HF URL). */
  url: string;
  filename: string;
}

export interface CatalogModel {
  id: string;
  family: string;
  displayName: string;
  hfRepo: string;
  paramsB: number;
  /** Active params for MoE models; equals paramsB for dense. */
  activeParamsB: number;
  contextLength: number;
  /** KV geometry from the model's config.json — drives honest KV-cache math. */
  layers: number;
  kvHeads: number;
  headDim: number;
  license: string;
  roles: ("coding" | "general" | "reasoning")[];
  /** A = native tool-call template known-good in llama.cpp; B = works with
   *  --jinja generic; C = unreliable, chat only. */
  toolCallGrade: "A" | "B" | "C";
  quants: QuantEntry[];
}

export type FitMode =
  | "comfortable"
  | "tight"
  | "partial-offload"
  | "cpu-only"
  | "wont-fit";

export interface QuantFit {
  model: CatalogModel;
  quant: QuantEntry;
  mode: FitMode;
  /** Total memory needed at the evaluated context, bytes. */
  needBytes: number;
  /** Largest context (tokens, capped by model window) staying on-budget. */
  maxComfortableContext: number;
  /** GPU layers to offload (only meaningful for partial-offload). */
  gpuLayers: number | null;
  evaluatedContext: number;
}
