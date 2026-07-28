// The guided setup wizard: `dyno setup`.
//
// Goal: collapse "clone -> build -> scan -> fit -> pull -> serve -> doctor ->
// connect -> (maybe) install a VS Code extension" into one command that ends
// with a working, connected local coding agent. Offers CLI or browser UI;
// both paths share the exact same underlying modules (activate.ts, probes.ts,
// connect.ts) as every other command, so the wizard can never do something
// the plain CLI commands couldn't also do on their own.

import * as readline from "node:readline";
import { spawn, execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import os from "node:os";
import { scanHardware, formatBytes } from "./scan.js";
import { MODELS_DIR } from "./catalog.js";
import { rankCandidates, activateCandidate } from "./activate.js";
import { runExam } from "./probes.js";
import { saveReport } from "./reports.js";
import { activeBaseUrl, requestModelFor, readState } from "./serve.js";
import { launchSpecFor, type AgentTarget } from "./connect.js";
import { startApiServer, API_PORT } from "./api.js";

const MODE_LABEL: Record<string, string> = {
  comfortable: "comfortable",
  tight: "tight",
  "partial-offload": "gpu+cpu split",
  "cpu-only": "cpu only",
  "wont-fit": "won't fit",
};

function openBrowser(url: string) {
  const plat = process.platform;
  try {
    if (plat === "darwin") execFileSync("open", [url]);
    else if (plat === "win32") execFileSync("cmd", ["/c", "start", "", url]);
    else execFileSync("xdg-open", [url]);
  } catch {
    console.log(`(couldn't auto-open a browser — visit ${url} manually)`);
  }
}

function which(bin: string): boolean {
  try {
    execFileSync(process.platform === "win32" ? "where" : "which", [bin], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

async function mergeOpencodeConfig(block: Record<string, unknown>) {
  const dir = join(os.homedir(), ".config", "opencode");
  const file = join(dir, "opencode.json");
  mkdirSync(dir, { recursive: true });
  let existing: Record<string, unknown> = {};
  if (existsSync(file)) {
    try {
      existing = JSON.parse(readFileSync(file, "utf8"));
    } catch {
      /* corrupt/empty file — start fresh rather than crash the wizard */
    }
  }
  const merged = {
    ...existing,
    provider: { ...(existing.provider as object | undefined), ...(block.provider as object) },
  };
  writeFileSync(file, JSON.stringify(merged, null, 2));
  return file;
}

/** Runs the vsix build+package+install chain — the same steps a human would
 *  type by hand — so the wizard's "install VS Code extension" button/menu
 *  item is never out of sync with what TESTING.md documents. */
async function installVscodeExtension(repoRoot: string, log: (line: string) => void): Promise<void> {
  const dir = join(repoRoot, "vscode-extension");
  if (!existsSync(dir)) throw new Error(`${dir} not found — is this a full agentdyno checkout?`);
  const run = (cmd: string, args: string[]) => {
    log(`$ ${cmd} ${args.join(" ")}`);
    execFileSync(cmd, args, { cwd: dir, stdio: "pipe" });
  };
  run("npm", ["install"]);
  run("npm", ["run", "build"]);
  run("npx", ["--yes", "@vscode/vsce", "package", "--no-dependencies", "--allow-missing-repository"]);
  const vsixName = "agentdyno-vscode-0.1.0.vsix";
  const codeBin = which("code")
    ? "code"
    : process.platform === "darwin" &&
        existsSync("/Applications/Visual Studio Code.app/Contents/Resources/app/bin/code")
      ? "/Applications/Visual Studio Code.app/Contents/Resources/app/bin/code"
      : null;
  if (!codeBin) {
    throw new Error(
      "packaged the extension but couldn't find VS Code's `code` CLI — install it from " +
        "VS Code's Command Palette (\"Shell Command: Install 'code' command in PATH\"), then run: " +
        `code --install-extension ${join(dir, vsixName)}`
    );
  }
  run(codeBin, ["--install-extension", join(dir, vsixName), "--force"]);
}

async function launchAgent(target: AgentTarget, repoRoot: string): Promise<{ launched: boolean; note: string }> {
  const state = readState();
  if (!state) throw new Error("no server active — this should not happen right after activation");
  const models = (await import("./catalog.js")).loadCatalog();
  const model = models.find((m) => m.id === state.modelId) ?? {
    // Ollama models aren't in the static catalog; resolve live.
    ...(await (await import("./catalog.js")).resolveModel(models, state.modelId)),
  };
  const spec = launchSpecFor(target, model, state);

  if (target === "opencode" && spec.opencodeProviderConfig) {
    const file = await mergeOpencodeConfig(spec.opencodeProviderConfig);
    console.log(`wrote provider config: ${file}`);
  }

  if (!which(spec.bin)) {
    return {
      launched: false,
      note: `"${spec.bin}" isn't on your PATH — install it, then run:\n  ${Object.entries(spec.env)
        .map(([k, v]) => `export ${k}="${v}"`)
        .join("\n  ")}\n  ${spec.bin} ${spec.args.join(" ")}`,
    };
  }

  console.log(`\nlaunching ${spec.bin} ${spec.args.join(" ")} ...\n`);
  const child = spawn(spec.bin, spec.args, {
    cwd: repoRoot,
    env: { ...process.env, ...spec.env },
    stdio: "inherit",
  });
  await new Promise<void>((resolve) => child.on("exit", () => resolve()));
  return { launched: true, note: "" };
}

/**
 * Two real, reproduced Node quirks drove this implementation, found by
 * actually running the wizard end-to-end with piped input rather than
 * trusting the code:
 *
 * 1. node:readline/promises's Interface.question() hangs forever on its
 *    SECOND call over a piped/non-TTY stdin in this Node version. The plain
 *    callback-style node:readline module does not have this problem, so we
 *    wrap it in a promise ourselves instead of using readline/promises.
 * 2. A piped (non-TTY) stdin emits 'end' as soon as its finite input is
 *    fully written, which readline treats as a reason to auto-close the
 *    Interface. If real async work (e.g. our leaderboard fetch) happens
 *    between two questions, that 'end' event has time to fire and close the
 *    interface before the next question() call — which then THROWS
 *    (ERR_USE_AFTER_CLOSE) instead of hanging. A real interactive terminal
 *    never sends 'end' mid-session (a human's stdin just stays open), so
 *    this only affects scripted/piped invocations — but we handle it anyway
 *    so `dyno setup` degrades gracefully in scripts/CI instead of crashing.
 */
function ask(rl: readline.Interface, q: string): Promise<string> {
  // `.closed` exists at runtime (verified) but this @types/node version's
  // declarations for the callback-style Interface don't expose it.
  if ((rl as unknown as { closed?: boolean }).closed) return Promise.resolve("");
  return new Promise((resolve) => {
    try {
      rl.question(q, resolve);
    } catch {
      resolve("");
    }
  });
}

async function cliWizard(repoRoot: string, rl: readline.Interface) {

  console.log("\nAgentDyno guided setup (CLI)\n");

  const hw = scanHardware(MODELS_DIR);
  console.log(
    `machine: ${hw.cpuBrand} (${hw.arch}), ${formatBytes(hw.ramBytes)} RAM, accel: ${hw.accel}\n`
  );

  console.log("ranking candidates for this machine...");
  const ranked = (await rankCandidates(hw)).filter((c) => c.activatable);
  ranked.slice(0, 8).forEach((c, i) => {
    console.log(
      `  [${i + 1}] ${c.fit.model.displayName} ${c.fit.quant.quant}  ${c.verified ? c.gradeLabel : c.gradeLabel + " (unverified)"}  ${MODE_LABEL[c.fit.mode]}`
    );
  });
  const pickRaw = await ask(rl, `\npick a number [1-${Math.min(8, ranked.length)}], or Enter for the top pick: `);
  const idx = pickRaw.trim() ? Math.max(1, Math.min(ranked.length, Number(pickRaw))) - 1 : 0;
  const pick = ranked[idx];
  if (!pick) {
    console.log("no candidate fits this machine.");
    rl.close();
    return;
  }

  console.log(`\nactivating ${pick.fit.model.displayName} ${pick.fit.quant.quant}...`);
  const { state } = await activateCandidate(pick, hw, (step) => console.log(`  ${step}...`));
  console.log(`server ready: ${activeBaseUrl(state)} (context ${state.context})`);

  const runDoctor = await ask(rl, "\nrun the agentic readiness exam now? [Y/n]: ");
  if (runDoctor.trim().toLowerCase() !== "n") {
    console.log("examining (1-3 min)...");
    const report = await runExam(state.modelId, state.context, {
      baseUrl: activeBaseUrl(state),
      requestModel: requestModelFor(state),
    });
    saveReport(report);
    console.log(`grade: ${report.grade}${report.genTokensPerSec ? `  (${report.genTokensPerSec.toFixed(1)} tok/s)` : ""}`);
  }

  console.log("\nwhich coding interface do you want to use?");
  console.log("  [1] Claude Code\n  [2] OpenCode\n  [3] Aider\n  [4] VS Code extension\n  [5] skip — I'll connect manually");
  const choice = (await ask(rl, "pick a number: ")).trim();

  if (choice === "4") {
    console.log("\ninstalling the VS Code extension (build + package + install)...");
    try {
      await installVscodeExtension(repoRoot, (l) => console.log("  " + l));
      console.log("\ndone — open VS Code and click the AgentDyno icon in the activity bar.");
    } catch (e) {
      console.log(`\ncouldn't finish automatically: ${(e as Error).message}`);
    }
    rl.close();
    return;
  }

  const targetMap: Record<string, AgentTarget> = { "1": "claude", "2": "opencode", "3": "aider" };
  const target = targetMap[choice];
  if (!target) {
    console.log("\nskipped — run `dyno connect <claude|opencode|aider>` any time.");
    rl.close();
    return;
  }

  const doLaunch = await ask(rl, `\nlaunch ${target} right now in this terminal? [Y/n]: `);
  rl.close();
  if (doLaunch.trim().toLowerCase() === "n") {
    console.log(`run \`dyno connect ${target}\` for the config, whenever you're ready.`);
    return;
  }
  const result = await launchAgent(target, repoRoot);
  if (!result.launched) console.log(`\n${result.note}`);
}

export async function runSetupWizard(repoRoot: string) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  console.log("\nAgentDyno setup — how would you like to do this?");
  console.log("  [1] Guided UI in your browser (recommended)");
  console.log("  [2] Guided CLI, right here");
  const choice = (await ask(rl, "pick a number [1/2]: ")).trim();

  if (choice === "2") {
    await cliWizard(repoRoot, rl); // cliWizard owns closing rl once it's done
    return;
  }
  rl.close();

  const root = join(repoRoot, "site", "dashboard");
  startApiServer(root);
  const url = `http://127.0.0.1:${API_PORT}/setup/`;
  console.log(`\nopening the guided setup in your browser: ${url}`);
  console.log("(the dashboard server is now running in this terminal — leave it open, or Ctrl-C and run `dyno dashboard` later)");
  openBrowser(url);
  await new Promise(() => {}); // keep the API server alive
}
