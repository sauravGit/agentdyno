// Wire coding agents to the local server. This is the differentiator:
// each connector applies guardrails derived from researched failure modes
// (context ceilings, tool-count limits, template correctness).

import { BASE_URL, readState } from "./serve.js";
import type { CatalogModel } from "./types.js";

function requireRunning() {
  const s = readState();
  if (!s) throw new Error("no server running; run mb serve first");
  return s;
}

export function connectClaude(model: CatalogModel): string {
  const s = requireRunning();
  return `# Claude Code -> local ${model.displayName} (llama-server speaks the Anthropic Messages API natively)
export ANTHROPIC_BASE_URL="${BASE_URL}"
export ANTHROPIC_AUTH_TOKEN="magix-box-local"
export ANTHROPIC_MODEL="${model.id}"
export ANTHROPIC_SMALL_FAST_MODEL="${model.id}"
# then run: claude

# Guardrails (from magix-box fit math for THIS machine):
#  - server context is ${s.context} tokens; long agent sessions will compact early
#  - local ${model.paramsB}B-class models are weaker than frontier models; expect
#    slower, simpler edits. Keep MCP servers/tools minimal (small models degrade
#    past ~5 tools).
# NOTE: Anthropic has not publicly stated whether pointing Claude Code at
# non-Anthropic backends is permitted (github.com/anthropics/claude-code/issues/5577).
# Fully-open alternatives with first-class support here: mb connect opencode | aider`;
}

export function connectOpencode(model: CatalogModel): string {
  const s = requireRunning();
  return `# OpenCode -> local ${model.displayName}
# Add to ~/.config/opencode/opencode.json under "provider":
{
  "provider": {
    "magix-box": {
      "npm": "@ai-sdk/openai-compatible",
      "name": "magix-box (local)",
      "options": { "baseURL": "${BASE_URL}/v1" },
      "models": {
        "${model.id}": { "name": "${model.displayName}", "limit": { "context": ${s.context}, "output": 8192 } }
      }
    }
  }
}
# then: opencode -m magix-box/${model.id}`;
}

export function connectAider(model: CatalogModel): string {
  const s = requireRunning();
  return `# Aider -> local ${model.displayName}
export OPENAI_API_BASE="${BASE_URL}/v1"
export OPENAI_API_KEY="magix-box-local"
aider --model openai/${model.id} \\
  --map-tokens 1024
# Guardrail: server context is ${s.context} tokens (no silent 2k truncation:
# magix-box sets the real context on the server, not the client).`;
}
