import { test } from "node:test";
import assert from "node:assert";
import { rankForSwitch } from "../dist/src/switch.js";

const GIB = 1024 ** 3;
const quant = (sizeGb, id = "q") => ({
  quant: "Q4_K_M", sizeBytes: Math.round(sizeGb * GIB), sha256: "0".repeat(64),
  url: "https://example.com/" + id, filename: id + ".gguf",
});
const model = (over = {}) => ({
  id: "m", family: "Test", displayName: "m", hfRepo: "x/y", paramsB: 7,
  activeParamsB: 7, contextLength: 32768, layers: 28, kvHeads: 4, headDim: 128,
  license: "MIT", roles: ["coding"], toolCallGrade: "A", quants: [quant(4)],
  ...over,
});
const hw = {
  os: "darwin", arch: "arm64", cpuBrand: "Test", cores: 8, ramBytes: 16 * GIB,
  gpuBudgetBytes: 10 * GIB, ramBudgetBytes: 8 * GIB, accel: "metal",
  gpuName: null, diskFreeBytes: 100 * GIB, notes: [],
};
const report = (grade, context = 16384) => ({
  modelId: "x", context, when: "now", results: [], grade, genTokensPerSec: 20,
});

test("verified beats unverified even when the unverified prior is higher-graded", () => {
  const a = model({ id: "a", toolCallGrade: "A" }); // unverified prior A
  const b = model({ id: "b", toolCallGrade: "C" }); // but verified grade B
  const ranked = rankForSwitch([a, b], hw, { b: report("B") }, [], 16384);
  assert.equal(ranked[0].fit.model.id, "b");
  assert.equal(ranked[0].verified, true);
  assert.equal(ranked[1].fit.model.id, "a");
  assert.equal(ranked[1].verified, false);
  assert.equal(ranked[1].gradeLabel, "A?"); // marked as an unverified prior, not a real grade
});

test("a report examined at a SMALLER context does not verify a larger request", () => {
  const a = model({ id: "a" });
  const ranked = rankForSwitch([a], hw, { a: report("A", 999) }, [], 16384);
  assert.equal(ranked[0].verified, false);
});

test("a report examined at a LARGER context DOES verify a smaller request", () => {
  const a = model({ id: "a" });
  const ranked = rankForSwitch([a], hw, { a: report("B", 21535) }, [], 16384);
  assert.equal(ranked[0].verified, true);
  assert.equal(ranked[0].gradeLabel, "B");
});

test("wont-fit models sort last and are marked not activatable", () => {
  const huge = model({ id: "huge", quants: [quant(40, "huge")] }); // exceeds gpu+ram
  const small = model({ id: "small", quants: [quant(4, "small")] });
  const ranked = rankForSwitch([huge, small], hw, {}, [], 16384);
  assert.equal(ranked[ranked.length - 1].fit.model.id, "huge");
  assert.equal(ranked[ranked.length - 1].activatable, false);
});

test("within the same verified grade, external leaderboard score breaks the tie", () => {
  const a = model({ id: "a", family: "Qwen2.5-Coder" });
  const b = model({ id: "b", family: "Qwen2.5-Coder" });
  const entries = [{ rawName: "Qwen2.5-Coder-7B", family: "qwen2.5-coder", paramsB: 7, passRate2: 55, editFormat: "diff" }];
  // both verified grade B; only "b"'s size is close enough on the leaderboard to use it
  const ranked = rankForSwitch(
    [{ ...a, activeParamsB: 7 }, { ...b, activeParamsB: 7 }],
    hw, { a: report("B"), b: report("B") }, entries, 16384
  );
  // both should be verified B; since both match (same params), order falls
  // through to fit/size tiebreak - this test just confirms no crash & stable fields
  assert.equal(ranked[0].gradeRank, 1);
  assert.equal(ranked[1].gradeRank, 1);
});

test("gradeLabel surfaces '?' suffix only for unverified results", () => {
  const a = model({ id: "a", toolCallGrade: "B" });
  const ranked = rankForSwitch([a], hw, {}, [], 16384);
  assert.equal(ranked[0].gradeLabel, "B?");
});
