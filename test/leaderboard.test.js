// Locks the honest-matching rule: a model only gets an external score when
// the SAME family and a CLOSE parameter count both appear on the leaderboard.
import { test } from "node:test";
import assert from "node:assert";
import { parseLeaderboard, matchExternalScore } from "../dist/src/leaderboard.js";

const YAML = `
- model: Qwen2.5-Coder-32B-Instruct
  pass_rate_2: 61.3
  edit_format: diff
- model: Qwen3 32B
  pass_rate_2: 40.0
  edit_format: diff
- model: gpt-oss-120b (high)
  pass_rate_2: 44.4
  edit_format: diff
- model: claude-opus-4-20250514 (no think)
  pass_rate_2: 70.7
  edit_format: diff
- model: some unparseable entry with no size
  pass_rate_2: 12.3
  edit_format: diff
`;

const model = (over = {}) => ({
  id: "x", family: "Qwen2.5-Coder", displayName: "x", hfRepo: "x/y",
  paramsB: 7, activeParamsB: 7, contextLength: 32768, layers: 1, kvHeads: 1,
  headDim: 1, license: "MIT", roles: ["coding"], toolCallGrade: "A", quants: [],
  ...over,
});

test("parses well-formed entries and skips unparseable model names", () => {
  const entries = parseLeaderboard(YAML);
  // "claude-opus-4-20250514 (no think)" has no parseable size AND no known
  // family alias; "some unparseable entry" has no size either. Both dropped.
  assert.equal(entries.length, 3);
  assert.ok(entries.every((e) => e.paramsB > 0));
});

test("no false match: 7B catalog model does not inherit a 32B sibling's score", () => {
  const entries = parseLeaderboard(YAML);
  const m = matchExternalScore(model({ family: "Qwen2.5-Coder", activeParamsB: 7 }), entries);
  assert.equal(m.matched, false);
  assert.match(m.reason, /32B/);
});

test("real match: close param count within the same family is used", () => {
  const entries = parseLeaderboard(YAML);
  const m = matchExternalScore(model({ family: "Qwen2.5-Coder", activeParamsB: 28 }), entries);
  assert.equal(m.matched, true);
  assert.equal(m.entry.rawName, "Qwen2.5-Coder-32B-Instruct");
});

test("qwen3 does not match qwen3-coder family (alias collision guard)", () => {
  const entries = parseLeaderboard(YAML);
  const m = matchExternalScore(model({ family: "Qwen3-Coder", activeParamsB: 30 }), entries);
  assert.equal(m.matched, false);
});

test("family with zero leaderboard presence reports honestly", () => {
  const entries = parseLeaderboard(YAML);
  const m = matchExternalScore(model({ family: "Devstral", activeParamsB: 24 }), entries);
  assert.equal(m.matched, false);
  assert.match(m.reason, /no "Devstral" entries/);
});
