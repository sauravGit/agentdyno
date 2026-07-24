// Managed llama-server lifecycle: correct flags from fit math, health-polled,
// PID-file tracked.

import { spawn, execFileSync } from "node:child_process";
import { existsSync, openSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { HOME, LOGS_DIR, MODELS_DIR, PORT, ensureDirs } from "./catalog.js";
import { serverBinPath } from "./pull.js";
import type { CatalogModel, HardwareReport, QuantFit } from "./types.js";

const PID_FILE = join(HOME, "server.pid");
export const BASE_URL = `http://127.0.0.1:${PORT}`;

export interface ServeState {
  pid: number;
  modelId: string;
  context: number;
  port: number;
}

export function readState(): ServeState | null {
  if (!existsSync(PID_FILE)) return null;
  try {
    const s = JSON.parse(readFileSync(PID_FILE, "utf8")) as ServeState;
    process.kill(s.pid, 0); // liveness probe
    return s;
  } catch {
    unlinkSync(PID_FILE);
    return null;
  }
}

export function stopServer(): boolean {
  const s = readState();
  if (!s) return false;
  try {
    process.kill(s.pid, "SIGTERM");
  } catch {}
  unlinkSync(PID_FILE);
  return true;
}

export async function health(timeoutMs = 500): Promise<boolean> {
  try {
    const res = await fetch(`${BASE_URL}/health`, {
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
