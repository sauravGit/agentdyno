// Wire coding agents to the local server. This is the differentiator:
// each connector applies guardrails derived from researched failure modes
// (context ceilings, tool-count limits, template correctness).

import { activeBaseUrl, readState, requestModelFor } from "./serve.js";
import type { CatalogModel } from "./types.js";

function requireRunning() {
  const s = readState();
  if (!s) throw new Error("no server running; run mb serve first");
  return s;
}

export function connectClaude(model: CatalogModel): string {
  const s = requireRunning();
  const baseUrl = activeBaseUrl(s);
  const requestModel = requestModelFor(s);
  const engineNote =
    s.backend === "ollama"
      ? "Ollama speaks the Anthropic Messages API natively (>= v0.14)"
      : "llama-server speaks the Anthropic Messages API natively";
  return `# Claude Code -> local ${model.displayName} (${engineNote})
export ANTHROPIC_BASE_URL="${baseUrl}"
export ANTHROPIC_AUTH_TOKEN="magix-box-local"
export ANTHROPIC_MODEL="${requestModel}"
export ANTHROPIC_SMALL_FAST_MODEL="${requestModel}"
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
  const baseUrl = activeBaseUrl(s);
  const requestModel = requestModelFor(s);
  return `# OpenCode -> local ${model.displayName}
# Add to ~/.config/opencode/opencode.json under "provider":
{
  "provider": {
    "magix-box": {
      "npm": "@ai-sdk/openai-compatible",
      "name": "magix-box (local)",
      "options": { "baseURL": "${baseUrl}/v1" },
      "models": {
        "${requestModel}": { "name": "${model.displayName}", "limit": { "context": ${s.context}, "output": 8192 } }
      }
    }
  }
}
# then: opencode -m magix-box/${requestModel}`;
}

export function connectAider(model: CatalogModel): string {
  const s = requireRunning();
  const baseUrl = activeBaseUrl(s);
  const requestModel = requestModelFor(s);
  return `# Aider -> local ${model.displayName}
export OPENAI_API_BASE="${baseUrl}/v1"
export OPENAI_API_KEY="magix-box-local"
aider --model openai/${requestModel} \\
  --map-tokens 1024
# Guardrail: server context is ${s.context} tokens (no silent 2k truncation:
# magix-box sets the real context on the server, not the client).`;
}
