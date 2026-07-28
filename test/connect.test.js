// Regression test for a real bug caught while writing TESTING.md: connect.ts
// was reusing serve.ts's requestModelFor() (which returns the internal
// sentinel "local" for the llama-server backend, correct for API request
// bodies) as the USER-FACING model name too, so `dyno connect claude` printed
// ANTHROPIC_MODEL="local" instead of the real model id. Fixed by introducing
// publicModelId(): llama-server backend shows the catalog id, ollama backend
// still shows the real pulled tag (since Ollama actually routes on it).
import { test } from "node:test";
import assert from "node:assert";
import { connectClaudeWith, connectGooseWith, connectClineWith, launchSpecFor } from "../dist/src/connect.js";

const model = (over = {}) => ({
  id: "qwen2.5-coder-3b", family: "Qwen2.5-Coder", displayName: "Qwen2.5 Coder 3B Instruct",
  hfRepo: "x/y", paramsB: 3.1, activeParamsB: 3.1, contextLength: 32768, layers: 36,
  kvHeads: 2, headDim: 128, license: "MIT", roles: ["coding"], toolCallGrade: "B", quants: [],
  ...over,
});

const llamaState = { pid: 123, modelId: "qwen2.5-coder-3b", context: 32768, port: 8402, backend: "llama-server" };
const ollamaState = { pid: 0, modelId: "ollama:qwen2.5-coder:3b", context: 16384, port: 11434, backend: "ollama" };

test("llama-server backend: connect configs show the real catalog id, not the internal 'local' sentinel", () => {
  const claude = connectClaudeWith(model(), llamaState);
  assert.match(claude, /ANTHROPIC_MODEL="qwen2\.5-coder-3b"/);
  assert.doesNotMatch(claude, /ANTHROPIC_MODEL="local"/);

  const goose = connectGooseWith(model(), llamaState);
  assert.match(goose, /GOOSE_MODEL="qwen2\.5-coder-3b"/);
  assert.match(goose, /OPENAI_HOST="http:\/\/127\.0\.0\.1:8402"/);

  const cline = connectClineWith(model(), llamaState);
  assert.match(cline, /Model ID: qwen2\.5-coder-3b/);
  assert.match(cline, /cline -P openai-compatible -m qwen2\.5-coder-3b/);
});

test("ollama backend: connect configs use the exact pulled tag (routing depends on it)", () => {
  const claude = connectClaudeWith(model({ id: "ollama:qwen2.5-coder:3b" }), ollamaState);
  assert.match(claude, /ANTHROPIC_MODEL="qwen2\.5-coder:3b"/);
  assert.match(claude, /ANTHROPIC_BASE_URL="http:\/\/127\.0\.0\.1:11434"/);
  assert.match(claude, /Ollama speaks the Anthropic Messages API natively/);
});

test("guardrail text and context are still present in every target", () => {
  for (const fn of [connectClaudeWith, connectGooseWith, connectClineWith]) {
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

test("claude launch spec has no manual step needed", () => {
  const spec = launchSpecFor("claude", model(), llamaState);
  assert.equal(spec.manualStepNote, null);
  assert.equal(spec.bin, "claude");
});
