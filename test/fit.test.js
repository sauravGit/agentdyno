// Unit tests for the fit engine — the honest-math core.
import { test } from "node:test";
import assert from "node:assert";
import {
  DEFAULT_CONTEXT,
  fitQuant,
  kvBytesPerToken,
  maxComfortableContext,
  needBytes,
  rankFits,
} from "../dist/src/fit.js";

const GIB = 1024 ** 3;

const model = (over = {}) => ({
  id: "test-7b",
  family: "Test",
  displayName: "Test 7B",
  hfRepo: "x/y",
  paramsB: 7,
  activeParamsB: 7,
  contextLength: 32768,
  layers: 28,
  kvHeads: 4,
  headDim: 128,
  license: "MIT",
  roles: ["coding"],
  toolCallGrade: "A",
  quants: [],
  ...over,
});

const quant = (sizeGb) => ({
  quant: "Q4_K_M",
  sizeBytes: Math.round(sizeGb * GIB),
  sha256: "0".repeat(64),
  url: "https://example.com/x.gguf",
  filename: "x.gguf",
});

const hw = (gpuGb, ramGb = 16) => ({
  os: "darwin",
  arch: "arm64",
  cpuBrand: "Test",
  cores: 8,
  ramBytes: ramGb * GIB,
  gpuBudgetBytes: Math.round(gpuGb * GIB),
  ramBudgetBytes: Math.round((ramGb / 2) * GIB),
  accel: gpuGb > 0 ? "metal" : "cpu",
  gpuName: null,
  diskFreeBytes: 100 * GIB,
  notes: [],
});

test("kv bytes per token uses real GQA geometry", () => {
  // 2 (K+V) * 28 layers * 4 kv heads * 128 dim * 2 bytes = 57344
  assert.equal(kvBytesPerToken(model()), 57344);
});

test("need grows linearly with context", () => {
  const m = model();
  const q = quant(4);
  const n8k = needBytes(m, q, 8192);
  const n16k = needBytes(m, q, 16384);
  assert.equal(n16k - n8k, kvBytesPerToken(m) * 8192);
});

test("comfortable when well under budget", () => {
  const f = fitQuant(model(), quant(4), hw(10.4)); // 16GB Apple Silicon-ish
  assert.equal(f.mode, "comfortable");
});

test("wont-fit when exceeding gpu and ram", () => {
  const f = fitQuant(model(), quant(30), hw(10.4, 16));
  assert.equal(f.mode, "wont-fit");
});

test("cpu-only machine never reports gpu modes", () => {
  const f = fitQuant(model(), quant(4), hw(0, 32));
  assert.equal(f.mode, "cpu-only");
});

test("partial-offload reports a sane layer split", () => {
  const f = fitQuant(model(), quant(12), hw(10.4, 16));
  assert.equal(f.mode, "partial-offload");
  assert.ok(f.gpuLayers !== null && f.gpuLayers >= 0 && f.gpuLayers < 28);
});

test("partial-offload's maxComfortableContext checks room against gpu+ram, not gpu alone (regression: was silently 0 for every real gpu+cpu-split fit)", () => {
  // Weights (12 GiB) already exceed the GPU budget alone (10.4 GiB) — that's
  // exactly why this is partial-offload. Checking room against gpu-only
  // budget makes it go negative unconditionally; the model DOES fit once
  // gpu+ram are combined, and should get a real, positive context, not 0.
  const f = fitQuant(model(), quant(12), hw(10.4, 16));
  assert.equal(f.mode, "partial-offload");
  assert.ok(f.maxComfortableContext > 0, `expected a positive max context, got ${f.maxComfortableContext}`);
});

test("maxComfortableContext caps at model window", () => {
  const m = model({ contextLength: 8192 });
  assert.equal(maxComfortableContext(m, quant(1), 64 * GIB), 8192);
});

test("maxComfortableContext is 0 when weights alone bust the budget", () => {
  assert.equal(maxComfortableContext(model(), quant(20), 10 * GIB), 0);
});

test("ranking puts comfortable grade-A first", () => {
  const big = model({ id: "big", quants: [quant(12)] });
  const good = model({ id: "good", quants: [quant(4)] });
  const bad = model({ id: "bad", toolCallGrade: "C", quants: [quant(4.5)] });
  const fits = rankFits([big, bad, good], hw(10.4));
  assert.equal(fits[0].model.id, "good"); // comfortable + grade A beats C
  assert.equal(fits[0].mode, "comfortable");
});

test("default context is agent-sized", () => {
  assert.ok(DEFAULT_CONTEXT >= 16384);
});
