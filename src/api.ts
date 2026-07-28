// Local HTTP API + static dashboard server. Loopback-only by construction —
// this is a control plane for the managed llama-server, not a public service.
// No framework: node:http is enough for a handful of JSON routes plus static
// files, and keeps the zero-runtime-framework posture from the CLI (D-007).

import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { readFileSync, existsSync, statSync } from "node:fs";
import { extname, join, normalize } from "node:path";
import { MODELS_DIR, loadCatalog, resolveModel, ensureDirs } from "./catalog.js";
import { DEFAULT_CONTEXT } from "./fit.js";
import { scanHardware } from "./scan.js";
import { activeBaseUrl, readState, requestModelFor, stopServer, health, BASE_URL } from "./serve.js";
import { isOllamaRunning } from "./ollama.js";
import { runExam, type ExamReport } from "./probes.js";
import type { SwitchCandidate } from "./switch.js";
import { connectClaude, connectGoose, connectCline, launchSpecFor, type AgentTarget } from "./connect.js";
import { loadAllReports, loadReport, saveReport } from "./reports.js";
import { rankCandidates, activateCandidate } from "./activate.js";
import { installVscodeExtension, launchInNewTerminal } from "./agentops.js";

export const API_PORT = 8403;

interface Activation {
  inProgress: boolean;
  modelId?: string;
  step?: string;
  error?: string;
  finishedAt?: string;
}
interface DoctorRun {
  inProgress: boolean;
  modelId?: string;
  error?: string;
  result?: ExamReport;
}
interface VscodeInstall {
  inProgress: boolean;
  log: string[];
  error?: string;
  done?: boolean;
}

let activation: Activation = { inProgress: false };
let doctorRun: DoctorRun = { inProgress: false };
let vscodeInstall: VscodeInstall = { inProgress: false, log: [] };

function json(res: ServerResponse, status: number, body: unknown) {
  const buf = Buffer.from(JSON.stringify(body));
  res.writeHead(status, { "Content-Type": "application/json", "Content-Length": buf.length });
  res.end(buf);
}

function serializeCandidate(c: SwitchCandidate) {
  const isOllama = c.fit.model.id.startsWith("ollama:");
  return {
    modelId: c.fit.model.id,
    displayName: c.fit.model.displayName,
    family: c.fit.model.family,
    paramsB: c.fit.model.paramsB,
    quant: c.fit.quant.quant,
    sizeBytes: c.fit.quant.sizeBytes,
    // Ollama entries are only ever added to the switch list from a live
    // `ollama list` in the first place (see /api/switch above) — if it's in
    // the list, it's already pulled.
    downloaded: isOllama ? true : existsSync(join(MODELS_DIR, c.fit.quant.filename)),
    mode: c.fit.mode,
    maxComfortableContext: c.fit.maxComfortableContext,
    verified: c.verified,
    gradeLabel: c.gradeLabel,
    external: c.external.matched
      ? { passRate2: c.external.entry.passRate2, source: c.external.entry.rawName, note: c.external.note }
      : { note: c.external.reason },
    activatable: c.activatable,
  };
}

async function readBody(req: IncomingMessage): Promise<any> {
  const chunks: Buffer[] = [];
  for await (const c of req) chunks.push(c as Buffer);
  if (chunks.length === 0) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    return {};
  }
}

function runActivation(modelId: string, context?: number) {
  activation = { inProgress: true, modelId, step: "resolving" };
  (async () => {
    const hw = scanHardware(MODELS_DIR);
    const ranked = await rankCandidates(hw, context ?? DEFAULT_CONTEXT);
    const pick = ranked.find((c) => c.fit.model.id === modelId);
    if (!pick || !pick.activatable) throw new Error(`${modelId} does not fit this machine`);
    await activateCandidate(pick, hw, (step) => {
      activation.step = step;
    });
    activation = { inProgress: false, modelId, finishedAt: new Date().toISOString() };
  })().catch((e) => {
    activation = { inProgress: false, modelId, error: (e as Error).message };
  });
}

function runDoctor() {
  const s = readState();
  if (!s) {
    doctorRun = { inProgress: false, error: "no server running" };
    return;
  }
  doctorRun = { inProgress: true, modelId: s.modelId };
  runExam(s.modelId, s.context, { baseUrl: activeBaseUrl(s), requestModel: requestModelFor(s) })
    .then((result) => {
      saveReport(result);
      doctorRun = { inProgress: false, modelId: s.modelId, result };
    })
    .catch((e) => {
      doctorRun = { inProgress: false, modelId: s.modelId, error: (e as Error).message };
    });
}

const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".png": "image/png",
  ".mp4": "video/mp4",
  ".svg": "image/svg+xml",
};

function serveStatic(root: string, urlPath: string, res: ServerResponse): boolean {
  const rel = urlPath === "/" ? "/index.html" : urlPath;
  const full = normalize(join(root, rel));
  if (!full.startsWith(normalize(root))) return false; // path traversal guard
  if (!existsSync(full) || !statSync(full).isFile()) return false;
  const body = readFileSync(full);
  res.writeHead(200, { "Content-Type": MIME[extname(full)] ?? "application/octet-stream" });
  res.end(body);
  return true;
}

export function createApiServer(dashboardRoot: string) {
  return createServer(async (req, res) => {
    const url = new URL(req.url ?? "/", "http://127.0.0.1");
    const path = url.pathname;

    try {
      if (path === "/api/scan") {
        return json(res, 200, scanHardware(MODELS_DIR));
      }

      if (path === "/api/switch" && req.method === "GET") {
        const context = Number(url.searchParams.get("context") ?? DEFAULT_CONTEXT);
        const hw = scanHardware(MODELS_DIR);
        const ranked = await rankCandidates(hw, context);
        return json(res, 200, {
          context,
          ollamaAvailable: await isOllamaRunning(),
          candidates: ranked.map(serializeCandidate),
        });
      }

      if (path === "/api/switch/activate" && req.method === "POST") {
        const body = await readBody(req);
        if (!body.modelId) return json(res, 400, { error: "modelId required" });
        if (activation.inProgress) return json(res, 409, { error: "activation already in progress", activation });
        runActivation(body.modelId, body.context);
        return json(res, 202, { started: true });
      }

      if (path === "/api/server/stop" && req.method === "POST") {
        return json(res, 200, { stopped: stopServer() });
      }

      if (path === "/api/setup/install-vscode" && req.method === "POST") {
        if (vscodeInstall.inProgress) return json(res, 409, { error: "already installing", vscodeInstall });
        vscodeInstall = { inProgress: true, log: [] };
        const repoRoot = join(dashboardRoot, "..", "..");
        installVscodeExtension(repoRoot, (line) => vscodeInstall.log.push(line))
          .then(() => {
            vscodeInstall = { ...vscodeInstall, inProgress: false, done: true };
          })
          .catch((e) => {
            vscodeInstall = { ...vscodeInstall, inProgress: false, error: (e as Error).message };
          });
        return json(res, 202, { started: true });
      }

      if (path === "/api/setup/vscode-status" && req.method === "GET") {
        return json(res, 200, vscodeInstall);
      }

      if (path === "/api/setup/launch-agent" && req.method === "POST") {
        const body = await readBody(req);
        const target = body.target as AgentTarget | undefined;
        if (!target || !["claude", "goose", "cline"].includes(target)) {
          return json(res, 400, { error: "target must be claude, goose, or cline" });
        }
        const s = readState();
        if (!s) return json(res, 409, { error: "no server running" });
        const model = await resolveModel(loadCatalog(), s.modelId);
        const spec = launchSpecFor(target, model, s);
        const repoRoot = join(dashboardRoot, "..", "..");
        const result = launchInNewTerminal(spec.bin, spec.args, spec.env, repoRoot);
        return json(res, 200, { ...result, manualStepNote: spec.manualStepNote });
      }

      if (path === "/api/status" && req.method === "GET") {
        const s = readState();
        const report = s ? loadReport(s.modelId) : null;
        return json(res, 200, {
          server: s,
          serverHealthy: s ? await health() : false,
          activation,
          doctor: doctorRun,
          verifiedReport: report,
        });
      }

      if (path === "/api/doctor" && req.method === "POST") {
        if (doctorRun.inProgress) return json(res, 409, { error: "exam already running", doctorRun });
        runDoctor();
        return json(res, 202, { started: true });
      }

      if (path === "/api/reports" && req.method === "GET") {
        const all = loadAllReports();
        return json(
          res,
          200,
          Object.entries(all).map(([id, r]) => ({ modelId: id, grade: r?.grade, when: r?.when, context: r?.context }))
        );
      }

      const connectMatch = path.match(/^\/api\/connect\/(claude|goose|cline)$/);
      if (connectMatch && req.method === "GET") {
        const s = readState();
        if (!s) return json(res, 409, { error: "no server running" });
        const m = await resolveModel(loadCatalog(), s.modelId);
        const text =
          connectMatch[1] === "claude" ? connectClaude(m) : connectMatch[1] === "goose" ? connectGoose(m) : connectCline(m);
        return json(res, 200, { text });
      }

      if (path === "/api/llama-base-url") {
        return json(res, 200, { baseUrl: BASE_URL });
      }

      if (serveStatic(dashboardRoot, path, res)) return;

      json(res, 404, { error: "not found" });
    } catch (e) {
      json(res, 500, { error: (e as Error).message });
    }
  });
}

export function startApiServer(dashboardRoot: string, port: number = API_PORT) {
  ensureDirs();
  const server = createApiServer(dashboardRoot);
  server.listen(port, "127.0.0.1");
  return server;
}
