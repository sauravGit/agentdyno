// Regression test for a real bug caught while writing TESTING.md: connect.ts
// was reusing serve.ts's requestModelFor() (which returns the internal
// sentinel "local" for the llama-server backend, correct for API request
// bodies) as the USER-FACING model name too, so connect configs printed
// e.g. GOOSE_MODEL="local" instead of the real model id. Fixed by introducing
// publicModelId(): llama-server backend shows the catalog id, ollama backend
// still shows the real pulled tag (since Ollama actually routes on it).
//
// Goose and Cline are the sole supported targets — Claude Code, OpenCode, and
// Aider were all dropped per explicit scope changes.
//
// Base URLs point at AgentDyno's stable gateway (127.0.0.1:API_PORT), not the
// raw backend port, for BOTH backends — the whole point being that Goose/Cline
// are configured once and never need touching again across `dyno switch`,
// even switching backends entirely (see api.ts's /v1/* proxy, which rewrites
// the request body's "model" field server-side to whatever's actually active,
// regardless of what the client sent).
import { test } from "node:test";
import assert from "node:assert";
import { connectGooseWith, connectClineWith, launchSpecFor } from "../dist/src/connect.js";

const model = (over = {}) => ({
  id: "qwen2.5-coder-3b", family: "Qwen2.5-Coder", displayName: "Qwen2.5 Coder 3B Instruct",
  hfRepo: "x/y", paramsB: 3.1, activeParamsB: 3.1, contextLength: 32768, layers: 36,
  kvHeads: 2, headDim: 128, license: "MIT", roles: ["coding"], toolCallGrade: "B", quants: [],
  ...over,
});

const llamaState = { pid: 123, modelId: "qwen2.5-coder-3b", context: 32768, port: 8402, backend: "llama-server" };
const ollamaState = { pid: 0, modelId: "ollama:qwen2.5-coder:3b", context: 16384, port: 11434, backend: "ollama" };

test("llama-server backend: connect configs show the real catalog id, not the internal 'local' sentinel", () => {
  const goose = connectGooseWith(model(), llamaState);
  assert.match(goose, /GOOSE_MODEL="qwen2\.5-coder-3b"/);
  assert.match(goose, /OPENAI_HOST="http:\/\/127\.0\.0\.1:8403"/); // stable gateway, not the raw 8402 backend port
  assert.doesNotMatch(goose, /GOOSE_MODEL="local"/);

  const cline = connectClineWith(model(), llamaState);
  assert.match(cline, /Model ID: qwen2\.5-coder-3b/);
  assert.match(cline, /Base URL: http:\/\/127\.0\.0\.1:8403\/v1/);
  assert.match(cline, /cline -P openai-compatible -m qwen2\.5-coder-3b/);
});

test("ollama backend: goose connect config uses the exact pulled tag (routing depends on it), still via the stable gateway", () => {
  const goose = connectGooseWith(model({ id: "ollama:qwen2.5-coder:3b" }), ollamaState);
  assert.match(goose, /GOOSE_MODEL="qwen2\.5-coder:3b"/);
  assert.match(goose, /OPENAI_HOST="http:\/\/127\.0\.0\.1:8403"/); // gateway, not the raw 11434 Ollama port
});

test("both backends use the SAME gateway base URL (the point: switching backends never touches Cline/Goose config)", () => {
  const llamaGoose = connectGooseWith(model(), llamaState);
  const ollamaGoose = connectGooseWith(model({ id: "ollama:qwen2.5-coder:3b" }), ollamaState);
  const urlOf = (s) => s.match(/OPENAI_HOST="([^"]+)"/)[1];
  assert.equal(urlOf(llamaGoose), urlOf(ollamaGoose));
});

test("guardrail text and context are still present in every target", () => {
  for (const fn of [connectGooseWith, connectClineWith]) {
    const out = fn(model(), llamaState);
    assert.match(out, /32768/); // server context surfaced somewhere
  }
});

test("goose launch spec has no standing manual-step warning (battle-tested: connectivity works on both backends)", () => {
  const llamaSpec = launchSpecFor("goose", model(), llamaState);
  assert.equal(llamaSpec.manualStepNote, null);
  const ollamaSpec = launchSpecFor("goose", model({ id: "ollama:qwen2.5-coder:3b" }), ollamaState);
  assert.equal(ollamaSpec.manualStepNote, null);
});

test("goose connect text cites the live battle test, not the stale unreproduced GitHub issue", () => {
  const out = connectGooseWith(model(), llamaState);
  assert.match(out, /battle-tested/);
  assert.doesNotMatch(out, /3979/);
});

test("cline launch spec always flags the undocumented base-URL gap", () => {
  const spec = launchSpecFor("cline", model(), llamaState);
  assert.match(spec.manualStepNote, /base URL/);
  assert.deepEqual(spec.args, ["-P", "openai-compatible", "-m", "qwen2.5-coder-3b", "-k", "magix-box-local"]);
});
