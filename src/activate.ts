// One shared "pull + serve a model" implementation, used by:
//   - `dyno switch --activate` / `dyno switch <id>` (cli.ts)
//   - the dashboard API's POST /api/switch/activate (api.ts)
//   - the new guided setup wizard, both CLI and UI (setup.ts)
// Kept in one place so the three surfaces can never silently drift apart.

import { loadCatalog, MODELS_DIR } from "./catalog.js";
import { DEFAULT_CONTEXT, rankFits } from "./fit.js";
import { rankForSwitch, type SwitchCandidate } from "./switch.js";
import { fetchLeaderboard, type LeaderboardEntry } from "./leaderboard.js";
import { loadAllReports } from "./reports.js";
import { pullModel, pullRuntime } from "./pull.js";
import { isOllamaRunning, listOllamaModels, ollamaModelToCatalogEntry, pullOllamaModel } from "./ollama.js";
import { scanHardware } from "./scan.js";
import { startServer, startOllamaServer, stopServer, type ServeState } from "./serve.js";
import type { HardwareReport } from "./types.js";

export type ActivateStep =
  | "ranking"
  | "downloading runtime"
  | "downloading model"
  | "starting server"
  | "done";

export interface ActivateResult {
  state: ServeState;
  candidate: SwitchCandidate;
}

async function safeLeaderboard(): Promise<LeaderboardEntry[]> {
  try {
    return await fetchLeaderboard();
  } catch {
    return [];
  }
}

/** Rank the full catalog (+ any locally-pulled Ollama models) for THIS machine. */
export async function rankCandidates(
  hw: HardwareReport,
  context: number = DEFAULT_CONTEXT
): Promise<SwitchCandidate[]> {
  const models = loadCatalog();
  if (await isOllamaRunning()) {
    const tags = await listOllamaModels();
    for (const t of tags) {
      try {
        models.push(await ollamaModelToCatalogEntry(t.name));
      } catch {
        // Incomplete /api/show geometry — skipped rather than shown with
        // invented numbers (see ollama.ts showOllamaModel).
      }
    }
  }
  const reports = loadAllReports();
  const leaderboard = await safeLeaderboard();
  return rankForSwitch(models, hw, reports, leaderboard, context);
}

/**
 * Pull (if needed) and serve a specific candidate. Handles both backends:
 * an `ollama:<tag>` id routes to the Ollama daemon; anything else uses the
 * managed llama-server. Reports progress via onStep for callers that want
 * to show it (CLI prints inline; the API server exposes it via /api/status).
 */
export async function activateCandidate(
  candidate: SwitchCandidate,
  hw: HardwareReport,
  onStep?: (step: ActivateStep) => void
): Promise<ActivateResult> {
  const modelId = candidate.fit.model.id;
  onStep?.("downloading runtime");
  if (modelId.startsWith("ollama:")) {
    const tag = modelId.slice("ollama:".length);
    await pullOllamaModel(tag);
    onStep?.("starting server");
    stopServer();
    const state = await startOllamaServer(tag, candidate.fit.evaluatedContext);
    onStep?.("done");
    return { state, candidate };
  }
  await pullRuntime();
  onStep?.("downloading model");
  await pullModel(candidate.fit.model, candidate.fit.quant);
  onStep?.("starting server");
  stopServer();
  const state = await startServer(candidate.fit, hw);
  onStep?.("done");
  return { state, candidate };
}

/** Convenience: rank, pick (top or by id), and activate in one call. */
export async function activateBestOrById(
  idOrPrefix: string | null,
  context: number = DEFAULT_CONTEXT,
  onStep?: (step: ActivateStep) => void
): Promise<ActivateResult> {
  const hw = scanHardware(MODELS_DIR);
  onStep?.("ranking");
  const ranked = await rankCandidates(hw, context);
  const pick = idOrPrefix
    ? ranked.find((c) => c.fit.model.id === idOrPrefix || c.fit.model.id.startsWith(idOrPrefix))
    : ranked.find((c) => c.activatable);
  if (!pick) throw new Error(idOrPrefix ? `no ranked candidate matching "${idOrPrefix}"` : "no candidate fits this machine");
  if (!pick.activatable) throw new Error(`${pick.fit.model.id} does not fit this machine`);
  return activateCandidate(pick, hw, onStep);
}
