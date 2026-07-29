// Wire coding agents to the local server. This is the differentiator:
// each connector applies guardrails derived from researched failure modes
// (context ceilings, tool-count limits, template correctness).
//
// Supported targets: Goose (Block) and Cline — the two agents this project
// battle-tests and auto-installs. Claude Code, OpenCode, and Aider were all
// dropped per explicit scope changes; Goose and Cline are the sole
// first-class citizens now, matching their own VS Code plugins too.

import { activeBaseUrl, readState, requestModelFor } from "./serve.js";
import type { ServeState } from "./serve.js";
import type { CatalogModel } from "./types.js";

function requireRunning() {
  const s = readState();
  if (!s) throw new Error("no server running; run dyno serve first");
  return s;
}

/**
 * The model identifier to put in agent configs and API request bodies.
 * - Ollama ROUTES on this field, so it must be the exact pulled tag
 *   (requestModelFor already returns that).
 * - llama-server IGNORES this field entirely, but printing the internal
 *   sentinel "local" (used only in probes.ts's own request bodies) into a
 *   user-facing config is confusing — use the real catalog id instead so
 *   what the user sees matches what they ran `dyno pull`/`dyno serve` with.
 */
function publicModelId(model: CatalogModel, state: ServeState): string {
  return state.backend === "ollama" ? requestModelFor(state) : model.id;
}

// The `With(model, state)` variants below take state explicitly, so tests
// can exercise the real formatting logic without touching ~/.magix-box on
// disk. The public connectX(model) functions (used by cli.ts/api.ts) are
// thin wrappers that read the live server state and delegate.

/**
 * Goose (github.com/block/goose): fully scriptable via environment variables
 * for its "openai" provider — verified against goose-docs.ai and the Docker
 * blog's own Goose examples 2026-07-28. No interactive `goose configure`
 * step needed.
 *
 * BATTLE-TESTED LIVE on 2026-07-28 (not just read about): a bare
 * block/goose issue (#3979) reports connection errors against llama-server,
 * but that did NOT reproduce here — `goose run` connected to our managed
 * llama-server without issue on both a grade-F and a grade-B model. What DID
 * reproduce exactly matches this project's own thesis: against the grade-F
 * model (Qwen2.5-Coder-3B) Goose's "write" tool call came back as JSON-in-
 * markdown TEXT and no file was created; against the grade-B model
 * (Qwen3-8B) the same task produced a real tool call and the file was
 * written correctly. Goose's reliability tracks the `doctor` grade, not a
 * Goose-specific bug — so the guidance below leans on that grade rather
 * than repeating the stale, unreproduced GitHub issue.
 */
export function connectGooseWith(model: CatalogModel, s: ServeState): string {
  const baseUrl = activeBaseUrl(s);
  const requestModel = publicModelId(model, s);
  return `# Goose -> local ${model.displayName}
export GOOSE_PROVIDER="openai"
export GOOSE_MODEL="${requestModel}"
export OPENAI_HOST="${baseUrl}"
export OPENAI_BASE_PATH="v1/chat/completions"
export OPENAI_API_KEY="magix-box-local"
goose run --model ${requestModel}
# or: goose session

# Guardrail: server context is ${s.context} tokens; long sessions will compact early.
# local ${model.paramsB}B-class models are weaker than frontier models. Goose's
# reliability tracks your \`dyno doctor\` grade directly — battle-tested: a
# grade-F model here returned the tool call as text (no file written); a
# grade-B model executed it correctly. Run doctor before trusting this.`;
}

/**
 * Cline (github.com/cline/cline, npm package "cline", VS Code extension
 * saoudrizwan.claude-dev): confirmed CLI flags are -P/--provider, -m/--model,
 * -k/--key (verified against docs.cline.bot/cli/cli-reference 2026-07-28).
 * IMPORTANT VERIFIED GAP: there is no documented CLI flag for a custom base
 * URL, and the providers.json schema Cline stores config in is not published.
 * Rather than guess at an undocumented file format, the reliable path is
 * Cline's own Settings UI (base URL + key + model are confirmed fields
 * there). The CLI flags below are offered best-effort; if `-P
 * openai-compatible` doesn't pick up the local server, use the UI steps.
 */
export function connectClineWith(model: CatalogModel, s: ServeState): string {
  const baseUrl = activeBaseUrl(s);
  const requestModel = publicModelId(model, s);
  return `# Cline -> local ${model.displayName}
#
# Reliable path (VS Code extension, confirmed settings fields):
#   1. Open the Cline panel in VS Code (installed automatically if you used
#      the AgentDyno VS Code extension's setup).
#   2. Settings (gear icon) -> API Provider: "OpenAI Compatible"
#   3. Base URL: ${baseUrl}/v1
#      API Key:  magix-box-local
#      Model ID: ${requestModel}
#
# Best-effort CLI (no documented --base-url flag as of writing; set the Base
# URL once via the Settings UI above first, then this reuses that config):
cline -P openai-compatible -m ${requestModel} -k magix-box-local

# Guardrail: server context is ${s.context} tokens; local ${model.paramsB}B-class
# models are weaker than frontier models — expect simpler, slower edits.`;
}

export function connectGoose(model: CatalogModel): string {
  return connectGooseWith(model, requireRunning());
}

export function connectCline(model: CatalogModel): string {
  return connectClineWith(model, requireRunning());
}

// --- Machine-readable launch descriptors -----------------------------------
// The human-readable strings above are for reading/copying. These are for the
// setup wizard, which needs to actually SPAWN the agent rather than print
// instructions about it — so env vars and args are returned as data, not
// embedded in comment-annotated shell text.

export type AgentTarget = "goose" | "cline";

export interface LaunchSpec {
  bin: string;
  args: string[];
  env: Record<string, string>;
  /** True when the launch is missing a step docs don't let us automate
   *  (Cline's base URL) — callers should surface this rather than promise
   *  a fully-automatic connection. */
  manualStepNote: string | null;
}

export function launchSpecFor(target: AgentTarget, model: CatalogModel, s: ServeState): LaunchSpec {
  const baseUrl = activeBaseUrl(s);
  const requestModel = publicModelId(model, s);
  if (target === "goose") {
    return {
      bin: "goose",
      args: ["run", "--model", requestModel],
      env: {
        GOOSE_PROVIDER: "openai",
        GOOSE_MODEL: requestModel,
        OPENAI_HOST: baseUrl,
        OPENAI_BASE_PATH: "v1/chat/completions",
        OPENAI_API_KEY: "magix-box-local",
      },
      // Battle-tested 2026-07-28: connectivity to llama-server works fine;
      // Goose's reliability tracks the model's `doctor` grade, not a
      // Goose-specific quirk (see connectGooseWith's doc comment for the
      // live test). No standing caveat needed here.
      manualStepNote: null,
    };
  }
  return {
    bin: "cline",
    args: ["-P", "openai-compatible", "-m", requestModel, "-k", "magix-box-local"],
    env: {},
    manualStepNote:
      `Cline has no documented CLI flag for a custom base URL. Before this works, open the Cline ` +
      `panel in VS Code once -> Settings -> API Provider: OpenAI Compatible -> Base URL: ${baseUrl}/v1.`,
  };
}

// --- Remote connect (LAN mode) ----------------------------------------------
// A second machine on the same network has no LOCAL server state to read —
// it must fetch the host machine's live status over HTTP (through the
// authenticated API server, see lan.ts/api.ts). This mirrors the local
// connectXWith functions above but points at the remote's proxy endpoint and
// uses the real pairing token as the auth key instead of the local "magix-box-local"
// placeholder (which only ever meant something to our own loopback server).

export interface RemoteStatus {
  modelId: string;
  context: number;
  displayName: string;
  paramsB: number;
}

/** Fetches the remote host's live server state through its authenticated API. */
export async function fetchRemoteStatus(remoteBaseUrl: string, token: string): Promise<RemoteStatus> {
  const res = await fetch(`${remoteBaseUrl}/api/status`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.status === 401) throw new Error("pairing token rejected by the remote server");
  if (!res.ok) throw new Error(`remote status check failed: ${res.status}`);
  const data = (await res.json()) as { server: { modelId: string; context: number } | null };
  if (!data.server) throw new Error("the remote server has no model active — ask them to run `dyno serve`");
  // The remote's display name/paramsB aren't critical to a working config;
  // fall back to the raw model id rather than fail the whole connect step
  // if that richer metadata isn't reachable.
  return { modelId: data.server.modelId, context: data.server.context, displayName: data.server.modelId, paramsB: NaN };
}

export function connectGooseRemote(remote: RemoteStatus, remoteBaseUrl: string, token: string): string {
  return `# Goose -> REMOTE ${remote.displayName} (on another machine, via AgentDyno LAN mode)
export GOOSE_PROVIDER="openai"
export GOOSE_MODEL="${remote.modelId}"
export OPENAI_HOST="${remoteBaseUrl}"
export OPENAI_BASE_PATH="v1/chat/completions"
export OPENAI_API_KEY="${token}"
goose run --model ${remote.modelId}
# Guardrail: remote server context is ${remote.context} tokens.`;
}

export function connectClineRemote(remote: RemoteStatus, remoteBaseUrl: string, token: string): string {
  return `# Cline -> REMOTE ${remote.displayName} (on another machine, via AgentDyno LAN mode)
#   Settings (gear icon) -> API Provider: "OpenAI Compatible"
#   Base URL: ${remoteBaseUrl}/v1
#   API Key:  ${token}
#   Model ID: ${remote.modelId}
cline -P openai-compatible -m ${remote.modelId} -k ${token}`;
}
