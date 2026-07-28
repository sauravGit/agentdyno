// Regression test for a real bug caught while writing TESTING.md: connect.ts
// was reusing serve.ts's requestModelFor() (which returns the internal
// sentinel "local" for the llama-server backend, correct for API request
// bodies) as the USER-FACING model name too, so `dyno connect claude` printed
// ANTHROPIC_MODEL="local" instead of the real model id. Fixed by introducing
// publicModelId(): llama-server backend shows the catalog id, ollama backend
// still shows the real pulled tag (since Ollama actually routes on it).
import { test } from "node:test";
import assert from "node:assert";
import { connectClaudeWith, connectOpencodeWith, connectAiderWith } from "../dist/src/connect.js";

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

  const opencode = connectOpencodeWith(model(), llamaState);
  assert.match(opencode, /"qwen2\.5-coder-3b":/);
  assert.match(opencode, /opencode -m magix-box\/qwen2\.5-coder-3b/);

  const aider = connectAiderWith(model(), llamaState);
  assert.match(aider, /--model openai\/qwen2\.5-coder-3b/);
});

test("ollama backend: connect configs use the exact pulled tag (routing depends on it)", () => {
  const claude = connectClaudeWith(model({ id: "ollama:qwen2.5-coder:3b" }), ollamaState);
  assert.match(claude, /ANTHROPIC_MODEL="qwen2\.5-coder:3b"/);
  assert.match(claude, /ANTHROPIC_BASE_URL="http:\/\/127\.0\.0\.1:11434"/);
  assert.match(claude, /Ollama speaks the Anthropic Messages API natively/);
});

test("guardrail text and context are still present in every target", () => {
  for (const fn of [connectClaudeWith, connectOpencodeWith, connectAiderWith]) {
    const out = fn(model(), llamaState);
    assert.match(out, /32768/); // server context surfaced somewhere
  }
});
