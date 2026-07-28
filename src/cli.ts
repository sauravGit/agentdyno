#!/usr/bin/env node
// magix-box CLI — mb <command>

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import os from "node:os";
import { MODELS_DIR, ensureDirs, findModel, loadCatalog, resolveModel } from "./catalog.js";
import { DEFAULT_CONTEXT, rankFits } from "./fit.js";
import { connectGoose, connectCline, connectGooseRemote, connectClineRemote, fetchRemoteStatus } from "./connect.js";
import { GRADE_MEANING, runExam } from "./probes.js";
import { fetchLeaderboard } from "./leaderboard.js";
import { pullModel, pullRuntime } from "./pull.js";
import { formatBytes, scanHardware } from "./scan.js";
import { activeBaseUrl, readState, requestModelFor, startServer, startOllamaServer, stopServer } from "./serve.js";
import { OLLAMA_BASE_URL } from "./ollama.js";
import { rankForSwitch } from "./switch.js";
import { REPORTS_DIR, loadAllReports, loadReport, saveReport } from "./reports.js";
import { startApiServer, API_PORT } from "./api.js";
import { activateCandidate } from "./activate.js";
import { runSetupWizard } from "./setup.js";
import { getOrCreateLanToken, advertiseLan, discoverLan, saveRemoteConfig, loadRemoteConfig, clearRemoteConfig } from "./lan.js";

function arg(flag: string): string | null {
  const i = process.argv.indexOf(flag);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : null;
}
const has = (flag: string) => process.argv.includes(flag);

const MODE_LABEL: Record<string, string> = {
  comfortable: "comfortable",
  tight: "tight",
  "partial-offload": "gpu+cpu split",
  "cpu-only": "cpu only",
  "wont-fit": "won't fit",
};

async function cmdScan() {
  const hw = scanHardware(MODELS_DIR);
  if (has("--json")) return console.log(JSON.stringify(hw, null, 2));
  console.log(`machine   ${hw.cpuBrand} (${hw.arch}), ${hw.cores} cores`);
  console.log(`memory    ${formatBytes(hw.ramBytes)} RAM`);
  console.log(`accel     ${hw.accel}${hw.gpuName ? ` — ${hw.gpuName}` : ""}`);
  console.log(`budgets   gpu ${formatBytes(hw.gpuBudgetBytes)} | cpu ${formatBytes(hw.ramBudgetBytes)}`);
  console.log(`disk      ${formatBytes(hw.diskFreeBytes)} free`);
  for (const n of hw.notes) console.log(`note      ${n}`);
}

async function cmdFit() {
  const context = Number(arg("--context") ?? DEFAULT_CONTEXT);
  const hw = scanHardware(MODELS_DIR);
  const fits = rankFits(loadCatalog(), hw, context);
  if (has("--json")) return console.log(JSON.stringify(fits, null, 2));
  console.log(`fit verdicts at ${context} tokens of context (gpu budget ${formatBytes(hw.gpuBudgetBytes)}):\n`);
  console.log("model                                quant    need      verdict        max-ctx  tools");
  for (const f of fits) {
    const name = `${f.model.displayName}`.padEnd(36);
    const quant = f.quant.quant.padEnd(8);
    const need = formatBytes(f.needBytes).padEnd(9);
    const mode = MODE_LABEL[f.mode].padEnd(14);
    const ctx = String(f.maxComfortableContext).padEnd(8);
    console.log(`${name} ${quant} ${need} ${mode} ${ctx} ${f.model.toolCallGrade}`);
  }
  console.log("\ntools column: catalog grade for tool-calling (A best). Run mb doctor to VERIFY on this machine.");
}

async function cmdPull() {
  if (has("--runtime")) return void (await pullRuntime());
  const id = process.argv[3];
  if (!id) throw new Error("usage: mb pull <model-id> [--quant Q4_K_M] | mb pull --runtime");
  const models = loadCatalog();
  const m = findModel(models, id);
  const qname = arg("--quant");
  const q = qname ? m.quants.find((x) => x.quant === qname) : m.quants[0];
  if (!q) throw new Error(`no quant ${qname} for ${m.id} (have ${m.quants.map((x) => x.quant).join(", ")})`);
  await pullRuntime();
  await pullModel(m, q);
}

async function cmdServe() {
  if (has("--stop")) {
    console.log(stopServer() ? "server stopped" : "no server running");
    return;
  }
  const context = arg("--context") ? Number(arg("--context")) : undefined;
  const ollamaTag = arg("--ollama");
  if (ollamaTag) {
    console.log(`starting ollama:${ollamaTag} (ctx ${context ?? DEFAULT_CONTEXT})...`);
    const s = await startOllamaServer(ollamaTag, context ?? DEFAULT_CONTEXT);
    console.log(`ready: ${OLLAMA_BASE_URL} (backend: ollama, context ${s.context})`);
    console.log(`endpoints: OpenAI /v1/chat/completions | Anthropic /v1/messages`);
    return;
  }
  const hw = scanHardware(MODELS_DIR);
  const models = loadCatalog();
  const id = process.argv[3] && !process.argv[3].startsWith("--") ? process.argv[3] : null;
  const fits = rankFits(models, hw, context ?? DEFAULT_CONTEXT).filter((f) =>
    existsSync(join(MODELS_DIR, f.quant.filename))
  );
  const pick = id ? fits.find((f) => f.model.id === findModel(models, id).id) : fits[0];
  if (!pick) throw new Error(id ? `model ${id} not downloaded (mb pull ${id})` : "no downloaded models; run mb pull <model>");
  console.log(`starting ${pick.model.displayName} ${pick.quant.quant} (${MODE_LABEL[pick.mode]}, ctx ${context ?? pick.maxComfortableContext})...`);
  const s = await startServer(pick, hw, { context });
  console.log(`ready: http://127.0.0.1:${s.port} (pid ${s.pid}, context ${s.context})`);
  console.log(`endpoints: OpenAI /v1/chat/completions | Anthropic /v1/messages`);
}

async function cmdDoctor() {
  const s = readState();
  if (!s) throw new Error("no server running; run mb serve first (doctor examines the LIVE server)");
  console.log(`examining ${s.modelId} at context ${s.context} — 5 probes, ~1-3 min on laptop hardware\n`);
  const report = await runExam(s.modelId, s.context, { baseUrl: activeBaseUrl(s), requestModel: requestModelFor(s) });
  for (const r of report.results) {
    const mark = r.pass ? "PASS" : "FAIL";
    const speed = r.tokensPerSec ? ` ${r.tokensPerSec.toFixed(1)} tok/s` : "";
    console.log(`${r.id}  ${mark}  ${r.name.padEnd(26)} ${(r.ms / 1000).toFixed(1)}s${speed}  ${r.detail}`);
  }
  console.log(`\ngrade: ${report.grade}` + (report.genTokensPerSec ? `   generation: ${report.genTokensPerSec.toFixed(1)} tok/s` : ""));
  console.log(`meaning: ${GRADE_MEANING[report.grade]}`);
  saveReport(report);
  console.log(`report saved: ${join(REPORTS_DIR, `${report.modelId}.json`)}`);
}

async function cmdConnect() {
  const target = process.argv[3];
  if (!["goose", "cline"].includes(target)) throw new Error("usage: mb connect <goose|cline>");

  const remote = loadRemoteConfig();
  if (remote) {
    console.log(`using remote server: ${remote.baseUrl} (run \`dyno remote clear\` to use a local server instead)\n`);
    const status = await fetchRemoteStatus(remote.baseUrl, remote.token);
    if (target === "goose") console.log(connectGooseRemote(status, remote.baseUrl, remote.token));
    else console.log(connectClineRemote(status, remote.baseUrl, remote.token));
    return;
  }

  const s = readState();
  if (!s) throw new Error("no server running; run mb serve first (or `dyno remote connect` to use another machine's server)");
  const m = await resolveModel(loadCatalog(), s.modelId);
  const report = loadReport(s.modelId);
  if (!report) {
    console.log("WARNING: this model has not passed mb doctor on this machine — config below is UNVERIFIED\n");
  } else {
    console.log(`verified: grade ${report.grade} on this machine (${new Date(report.when).toLocaleString()})\n`);
    if (report.grade === "C" || report.grade === "F") {
      console.log("WARNING: doctor grade is below agent-ready; expect silent failures. Try a bigger/graded-A model.\n");
    }
  }
  if (target === "goose") console.log(connectGoose(m));
  else console.log(connectCline(m));
}

async function cmdStatus() {
  const s = readState();
  if (!s) return console.log("server: not running");
  const m = await resolveModel(loadCatalog(), s.modelId);
  const report = loadReport(s.modelId);
  console.log(`server: running (${s.backend}${s.backend === "llama-server" ? `, pid ${s.pid}` : ""}) — ${m.displayName}, context ${s.context}`);
  console.log(`doctor: ${report ? `grade ${report.grade} (${report.when})` : "not yet examined"}`);
}

async function cmdSetup() {
  const repoRoot = new URL("../..", import.meta.url).pathname;
  await runSetupWizard(repoRoot);
}

async function cmdDashboard() {
  const root = new URL("../../site/dashboard", import.meta.url).pathname;
  if (!existsSync(root)) throw new Error(`dashboard assets missing at ${root}`);
  const lan = has("--lan");
  const token = lan ? getOrCreateLanToken() : undefined;
  startApiServer(root, API_PORT, { lan, token });
  if (!lan) {
    console.log(`dashboard: http://127.0.0.1:${API_PORT}`);
    console.log("loopback only — not reachable from outside this machine. Ctrl-C to stop.");
  } else {
    const hostname = os.hostname();
    console.log(`dashboard: http://127.0.0.1:${API_PORT} (also reachable on your LAN at this machine's IP, port ${API_PORT})`);
    console.log(`advertising as "${hostname}" on your network — find it from another machine with: dyno remote discover`);
    console.log(`pairing token (share this only with devices you trust): ${token}`);
    console.log("Ctrl-C to stop.");
    const stopAdvertising = await advertiseLan(API_PORT);
    process.on("SIGINT", () => {
      stopAdvertising();
      process.exit(0);
    });
  }
  await new Promise(() => {}); // keep the process alive
}

async function cmdRemote() {
  const sub = process.argv[3];
  if (sub === "discover") {
    console.log("browsing the LAN for AgentDyno servers (3s)...");
    const found = await discoverLan(3000);
    if (found.length === 0) {
      console.log("none found. Make sure the other machine ran `dyno dashboard --lan` and is on the same network.");
      return;
    }
    found.forEach((s, i) => console.log(`  [${i + 1}] ${s.host}  ${s.addresses[0]}:${s.port}`));
    console.log('\nconnect with: dyno remote connect <host>:<port> <token>   (token is shown on the host machine)');
    return;
  }
  if (sub === "connect") {
    const target = process.argv[4];
    const token = process.argv[5];
    if (!target || !token) throw new Error("usage: dyno remote connect <host:port> <token>");
    saveRemoteConfig({ baseUrl: `http://${target}`, token });
    console.log(`saved. This machine's connect configs will now point at ${target}.`);
    console.log("run `dyno remote clear` to go back to using a local server.");
    return;
  }
  if (sub === "clear") {
    clearRemoteConfig();
    console.log("cleared — back to local mode.");
    return;
  }
  if (sub === "status") {
    const cfg = loadRemoteConfig();
    console.log(cfg ? `remote: ${cfg.baseUrl}` : "remote: not configured (using local server)");
    return;
  }
  throw new Error("usage: dyno remote <discover|connect|clear|status>");
}

async function cmdSwitch() {
  const target = process.argv[3] && !process.argv[3].startsWith("--") ? process.argv[3] : null;
  const activateTop = has("--activate") || target !== null;
  const hw = scanHardware(MODELS_DIR);
  const models = loadCatalog();
  const reports = loadAllReports();
  let leaderboard: Awaited<ReturnType<typeof fetchLeaderboard>> = [];
  if (!has("--offline")) {
    try {
      leaderboard = await fetchLeaderboard();
    } catch (e) {
      console.log(`(leaderboard unavailable, ranking on doctor grades only: ${(e as Error).message})`);
    }
  }
  const ranked = rankForSwitch(models, hw, reports, leaderboard);

  if (!activateTop) {
    console.log("switcher ranking (verified grades always outrank unverified priors):\n");
    console.log("model                                quant    grade  verdict        external");
    for (const c of ranked) {
      const name = c.fit.model.displayName.padEnd(36);
      const quant = c.fit.quant.quant.padEnd(8);
      const grade = (c.verified ? c.gradeLabel : c.gradeLabel).padEnd(6);
      const verdict = MODE_LABEL[c.fit.mode].padEnd(14);
      const ext = c.external.matched ? `${c.external.entry.passRate2}% (${c.external.entry.rawName})` : "no data";
      console.log(`${name} ${quant} ${grade} ${verdict} ${ext}`);
    }
    console.log("\ngrade column: real doctor grade (A/B/C/F) if verified on this machine, else 'X?' = untested catalog prior.");
    console.log("run: mb switch <model-id>   to pull+serve+activate a specific pick, or mb switch --activate for the top-ranked one.");
    return;
  }

  const pick = target ? ranked.find((c) => c.fit.model.id === findModel(models, target).id) : ranked[0];
  if (!pick) throw new Error("no ranked candidate found");
  if (!pick.activatable) throw new Error(`${pick.fit.model.id} does not fit this machine`);
  console.log(`activating ${pick.fit.model.displayName} ${pick.fit.quant.quant} (${pick.verified ? "verified " + pick.gradeLabel : "unverified, prior " + pick.gradeLabel})...`);
  const { state } = await activateCandidate(pick, hw, (step) => console.log(`  ${step}...`));
  console.log(`ready: ${state.backend === "ollama" ? "http://127.0.0.1:11434" : `http://127.0.0.1:${state.port}`} (context ${state.context})`);
  if (!pick.verified) console.log("NOTE: unverified on this machine — run mb doctor before connecting an agent.");
}

const HELP = `magix-box — prove your machine can run a coding agent, then wire it up.

usage: mb <command>

  setup                    guided setup: scan -> fit -> pull -> serve -> doctor -> connect, in one flow
  scan                     honest hardware report (--json)
  fit [--context N]        which models fit THIS machine, ranked (--json)
  switch                   ranked model switcher: verified grade beats unverified prior
  switch <model-id>        pull + serve + activate a specific model
  switch --activate        pull + serve + activate the #1 ranked pick
  pull <model> [--quant Q] download model + runtime (resumable, sha256-verified)
  pull --runtime           download just the llama.cpp runtime
  serve [<model>] [--context N] [--stop]   run the local server (Anthropic+OpenAI APIs)
  serve --ollama <tag> [--context N]       activate a model already pulled into Ollama
  doctor                   the agentic readiness exam: 5 probes, grade A-F
  connect <goose|cline>                     wire an agent to the VERIFIED local server
  status                   server + verification status
  version | --version | -v show the installed AgentDyno version
  dashboard                local web UI + API (loopback only, http://127.0.0.1:8403)
  dashboard --lan          same, but reachable + discoverable on your LAN (pairing token required)
  remote discover          find AgentDyno servers advertised on your LAN
  remote connect <h:p> <t> point this machine's connect configs at a remote AgentDyno server
  remote status | clear    show or clear the current remote target

Local, free, no accounts, no telemetry. Apache-2.0.`;

async function cmdVersion() {
  const pkgUrl = new URL("../../package.json", import.meta.url);
  const pkg = JSON.parse(readFileSync(pkgUrl, "utf8"));
  console.log(pkg.version);
}

async function main() {
  ensureDirs();
  const cmd = process.argv[2];
  if (cmd === "--version" || cmd === "-v") {
    await cmdVersion();
    return;
  }
  const table: Record<string, () => Promise<void>> = {
    setup: cmdSetup,
    scan: cmdScan,
    fit: cmdFit,
    pull: cmdPull,
    serve: cmdServe,
    doctor: cmdDoctor,
    connect: cmdConnect,
    status: cmdStatus,
    switch: cmdSwitch,
    dashboard: cmdDashboard,
    remote: cmdRemote,
    version: cmdVersion,
  };
  if (!cmd || !table[cmd]) {
    console.log(HELP);
    process.exit(cmd ? 1 : 0);
  }
  await table[cmd]();
}

main().catch((e) => {
  console.error("error:", (e as Error).message);
  process.exit(1);
});
