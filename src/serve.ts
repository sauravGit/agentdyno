// Managed llama-server lifecycle: correct flags from fit math, health-polled,
// PID-file tracked.

import { spawn, execFileSync } from "node:child_process";
import { existsSync, openSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { HOME, LOGS_DIR, MODELS_DIR, PORT, ensureDirs } from "./catalog.js";
import { serverBinPath } from "./pull.js";
import { OLLAMA_BASE_URL, isOllamaRunning, listOllamaModels } from "./ollama.js";
import type { CatalogModel, HardwareReport, QuantFit } from "./types.js";

const PID_FILE = join(HOME, "server.pid");
export const BASE_URL = `http://127.0.0.1:${PORT}`;

export type Backend = "llama-server" | "ollama";

export interface ServeState {
  pid: number; // 0 for ollama (we don't own that process)
  modelId: string;
  context: number;
  port: number;
  backend: Backend;
}

/** The endpoint to actually talk to for the CURRENT server, whichever backend it is. */
export function activeBaseUrl(state: ServeState): string {
  return state.backend === "ollama" ? OLLAMA_BASE_URL : `http://127.0.0.1:${state.port}`;
}

/** llama-server ignores the request "model" field; Ollama routes on it. */
export function requestModelFor(state: ServeState): string {
  return state.backend === "ollama" ? state.modelId.replace(/^ollama:/, "") : "local";
}

export function readState(): ServeState | null {
  if (!existsSync(PID_FILE)) return null;
  try {
    const s = JSON.parse(readFileSync(PID_FILE, "utf8")) as ServeState;
    if (!s.backend) s.backend = "llama-server"; // pre-D-018 pid files
    if (s.backend === "llama-server") process.kill(s.pid, 0); // liveness probe; ollama's own daemon is not ours to probe this way
    return s;
  } catch {
    unlinkSync(PID_FILE);
    return null;
  }
}

export function stopServer(): boolean {
  const s = readState();
  if (!s) return false;
  if (s.backend === "llama-server") {
    try {
      process.kill(s.pid, "SIGTERM");
    } catch {}
  }
  // Ollama's own daemon is independent of us (other tools may use it) — we
  // only forget our own "active model" bookkeeping, never kill it.
  unlinkSync(PID_FILE);
  return true;
}

export async function health(timeoutMs = 500): Promise<boolean> {
  const s = readState();
  if (!s) return false;
  if (s.backend === "ollama") return isOllamaRunning();
  try {
    const res = await fetch(`${activeBaseUrl(s)}/health`, {
      signal: AbortSignal.timeout(timeoutMs),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/** Launch llama-server for the fitted pick and wait until healthy. */
export async function startServer(
  fit: QuantFit,
  hw: HardwareReport,
  opts: { context?: number } = {}
): Promise<ServeState> {
  ensureDirs();
  const existing = readState();
  if (existing) {
    throw new Error(
      `server already running (pid ${existing.pid}, model ${existing.modelId}); use mb serve --stop first`
    );
  }
  const modelPath = join(MODELS_DIR, fit.quant.filename);
  if (!existsSync(modelPath)) {
    throw new Error(`model not downloaded: run mb pull ${fit.model.id}`);
  }
  const serverBin = serverBinPath();
  if (!existsSync(serverBin)) throw new Error("runtime missing: run mb pull --runtime");

  // Context: requested, else the fitted comfortable max (floor 4096, capped by window).
  const context = Math.min(
    fit.model.contextLength,
    Math.max(4096, opts.context ?? fit.maxComfortableContext)
  );

  const args = [
    "-m", modelPath,
    "--host", "127.0.0.1",
    "--port", String(PORT),
    "-c", String(context),
    "--jinja", // model-native chat template => working tool calls
  ];
  if (hw.accel === "cpu" || fit.mode === "cpu-only") {
    args.push("-ngl", "0");
  } else if (fit.mode === "partial-offload" && fit.gpuLayers !== null) {
    args.push("-ngl", String(fit.gpuLayers));
  } else {
    args.push("-ngl", "999"); // fully offload
  }

  const log = join(LOGS_DIR, "llama-server.log");
  const fd = openSync(log, "a");
  const child = spawn(serverBin, args, {
    detached: true,
    stdio: ["ignore", fd, fd],
  });
  child.unref();

  const state: ServeState = {
    pid: child.pid!,
    modelId: fit.model.id,
    context,
    port: PORT,
    backend: "llama-server",
  };
  writeFileSync(PID_FILE, JSON.stringify(state));

  // Health poll: model load can take a while on first touch.
  const deadline = Date.now() + 120_000;
  while (Date.now() < deadline) {
    if (await health()) return state;
    try {
      process.kill(child.pid!, 0);
    } catch {
      unlinkSync(PID_FILE);
      throw new Error(`llama-server exited during startup; see ${log}`);
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  stopServer();
  throw new Error(`server did not become healthy within 120s; see ${log}`);
}

/**
 * "Activate" a model already pulled into Ollama. Unlike llama-server, we
 * spawn nothing — Ollama's own daemon serves the model on demand — we just
 * record it as the active pick so doctor/connect/switch know what to target.
 */
export async function startOllamaServer(modelTag: string, context: number): Promise<ServeState> {
  ensureDirs();
  const existing = readState();
  if (existing) {
    throw new Error(
      `server already running (pid ${existing.pid}, model ${existing.modelId}); use mb serve --stop first`
    );
  }
  if (!(await isOllamaRunning())) {
    throw new Error("ollama daemon not reachable at " + OLLAMA_BASE_URL + " — is `ollama serve` running?");
  }
  const tags = await listOllamaModels();
  if (!tags.some((t) => t.name === modelTag || t.model === modelTag)) {
    throw new Error(`${modelTag} not pulled into ollama yet — run: ollama pull ${modelTag}`);
  }
  const state: ServeState = {
    pid: 0,
    modelId: `ollama:${modelTag}`,
    context,
    port: 11434,
    backend: "ollama",
  };
  writeFileSync(PID_FILE, JSON.stringify(state));
  return state;
}
