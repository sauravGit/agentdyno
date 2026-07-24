// Locks the agentic-readiness rubric so it can't silently regress.
import { test } from "node:test";
import assert from "node:assert";
import { gradeFromProbes } from "../dist/src/probes.js";

const P = (P1, P2, P3, P4, P5) =>
  [["P1", P1], ["P2", P2], ["P3", P3], ["P4", P4], ["P5", P5]].map(([id, pass]) => ({ id, pass }));

test("F when the agent loop is broken (P1 fails) regardless of quality probes", () => {
  assert.equal(gradeFromProbes(P(false, true, true, true, true), 40), "F");
  assert.equal(gradeFromProbes(P(true, false, true, true, true), 40), "F");
  assert.equal(gradeFromProbes(P(true, true, false, true, true), 40), "F");
});

test("A only when loop + both quality probes pass AND speed is usable", () => {
  assert.equal(gradeFromProbes(P(true, true, true, true, true), 20), "A");
  assert.equal(gradeFromProbes(P(true, true, true, true, true), 10), "B"); // too slow -> B
});

test("B when loop passes and exactly one quality probe passes", () => {
  assert.equal(gradeFromProbes(P(true, true, true, true, false), 40), "B");
  assert.equal(gradeFromProbes(P(true, true, true, false, true), 40), "B");
});

test("C when loop passes but both quality probes fail", () => {
  assert.equal(gradeFromProbes(P(true, true, true, false, false), 40), "C");
});

test("Qwen2.5-Coder-7B observed profile (P1 fail) -> F", () => {
  assert.equal(gradeFromProbes(P(false, false, false, false, false), 16), "F");
});

test("Qwen3-8B observed profile (loop pass, P4 fail, P5 pass) -> B", () => {
  assert.equal(gradeFromProbes(P(true, true, true, false, true), 17.4), "B");
});
