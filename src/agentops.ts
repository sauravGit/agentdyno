// Shared "make an agent actually usable" operations: installing the VS Code
// extension (ours, plus Cline's), and installing the Goose + Cline CLIs.
// Used by BOTH the CLI setup wizard (setup.ts) and the dashboard API's UI
// wizard endpoints (api.ts) — kept in its own module (rather than in either
// of those two) so neither has to import the other and create a circular
// dependency.

import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";

export function which(bin: string): boolean {
  try {
    execFileSync(process.platform === "win32" ? "where" : "which", [bin], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

function findVscodeCli(): string | null {
  if (which("code")) return "code";
  if (
    process.platform === "darwin" &&
    existsSync("/Applications/Visual Studio Code.app/Contents/Resources/app/bin/code")
  ) {
    return "/Applications/Visual Studio Code.app/Contents/Resources/app/bin/code";
  }
  return null;
}

/**
 * Installs the Goose CLI (github.com/block/goose). Verified 2026-07-28:
 * Homebrew formula `block-goose-cli` is the official, reproducible install
 * path on macOS; the alternative is a curl-piped install script
 * (`download_cli.sh`, supports CONFIGURE=false for non-interactive install) —
 * used as a fallback where Homebrew isn't available. Apache-2.0.
 */
export async function installGooseCli(log: (line: string) => void): Promise<void> {
  if (which("goose")) {
    log("goose already installed, skipping");
    return;
  }
  if (which("brew")) {
    log("$ brew install block-goose-cli");
    execFileSync("brew", ["install", "block-goose-cli"], { stdio: "pipe" });
    return;
  }
  log("$ curl -fsSL https://github.com/block/goose/releases/download/stable/download_cli.sh | CONFIGURE=false bash");
  execFileSync(
    "bash",
    ["-c", "curl -fsSL https://github.com/block/goose/releases/download/stable/download_cli.sh | CONFIGURE=false bash"],
    { stdio: "pipe" }
  );
}

/**
 * Installs the Cline CLI (npm package "cline", github.com/cline/cline).
 * Verified 2026-07-28: `npm install -g cline` installs a prebuilt per-platform
 * binary (bin: cline), no separate Node runtime needed at run time. Apache-2.0.
 */
export async function installClineCli(log: (line: string) => void): Promise<void> {
  if (which("cline")) {
    log("cline already installed, skipping");
    return;
  }
  log("$ npm install -g cline");
  execFileSync("npm", ["install", "-g", "cline"], { stdio: "pipe" });
}

/**
 * Installs Cline's own VS Code extension (marketplace id
 * saoudrizwan.claude-dev, verified 2026-07-28) — separate from the CLI,
 * since Cline is fundamentally a VS Code-first tool and its settings UI is
 * the one confirmed-reliable way to configure a custom base URL (see
 * connect.ts's connectClineWith for why the CLI alone isn't enough yet).
 */
export function installClineVscodeExtension(log: (line: string) => void): { installed: boolean; note: string } {
  const codeBin = findVscodeCli();
  if (!codeBin) return { installed: false, note: "VS Code's `code` CLI not found — install Cline manually from the marketplace (saoudrizwan.claude-dev)." };
  log(`$ ${codeBin} --install-extension saoudrizwan.claude-dev`);
  try {
    execFileSync(codeBin, ["--install-extension", "saoudrizwan.claude-dev"], { stdio: "pipe" });
    return { installed: true, note: "" };
  } catch (e) {
    return { installed: false, note: (e as Error).message };
  }
}

/** Runs the AgentDyno vsix build+package+install chain — the same steps
 *  documented in TESTING.md — so this can never silently drift from what a
 *  human would type. Also installs the Goose + Cline CLIs and Cline's own
 *  VS Code extension, per the "one install gets you everything" scope. */
export async function installVscodeExtension(repoRoot: string, log: (line: string) => void): Promise<void> {
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
  const codeBin = findVscodeCli();
  if (!codeBin) {
    throw new Error(
      "packaged the extension but couldn't find VS Code's `code` CLI — install it from " +
        "VS Code's Command Palette (\"Shell Command: Install 'code' command in PATH\"), then run: " +
        `code --install-extension ${join(dir, vsixName)}`
    );
  }
  run(codeBin, ["--install-extension", join(dir, vsixName), "--force"]);

  log("installing Goose CLI...");
  try {
    await installGooseCli(log);
  } catch (e) {
    log(`goose install failed (non-fatal): ${(e as Error).message}`);
  }

  log("installing Cline CLI...");
  try {
    await installClineCli(log);
  } catch (e) {
    log(`cline CLI install failed (non-fatal): ${(e as Error).message}`);
  }

  log("installing Cline's VS Code extension...");
  const clineExt = installClineVscodeExtension(log);
  if (!clineExt.installed) log(`(skipped: ${clineExt.note})`);
}

/**
 * Opens a NEW terminal window running the given agent binary with its env
 * set (macOS-first, matching this project's existing macOS-first stance —
 * Windows is "experimental", Linux gets a manual-instructions fallback).
 * Used by the browser-based UI wizard, which has no terminal of its own to
 * inherit stdio into (unlike the CLI wizard, which runs IN a terminal
 * already and can just spawn with stdio: 'inherit').
 */
export function launchInNewTerminal(
  bin: string,
  args: string[],
  env: Record<string, string>,
  cwd: string
): { launched: boolean; note: string } {
  if (!which(bin)) {
    return {
      launched: false,
      note: `"${bin}" isn't on your PATH — install it, then run:\n${Object.entries(env)
        .map(([k, v]) => `export ${k}="${v}"`)
        .join("\n")}\n${bin} ${args.join(" ")}`,
    };
  }
  const exports = Object.entries(env).map(([k, v]) => `export ${k}=${JSON.stringify(v)}`).join("\n");
  const cmd = `${bin} ${args.map((a) => JSON.stringify(a)).join(" ")}`;
  if (process.platform === "darwin") {
    // AppleScript string escaping: backslashes and double quotes.
    const shellScript = `cd ${JSON.stringify(cwd)}\n${exports}\n${cmd}\n`;
    const escaped = shellScript.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n");
    try {
      execFileSync("osascript", [
        "-e",
        `tell application "Terminal" to do script "${escaped}"`,
        "-e",
        'tell application "Terminal" to activate',
      ]);
      return { launched: true, note: "" };
    } catch (e) {
      return { launched: false, note: `couldn't open Terminal.app: ${(e as Error).message}` };
    }
  }
  return {
    launched: false,
    note: `auto-launching a new terminal isn't supported on ${process.platform} yet — run this yourself:\n${exports}\n${cmd}`,
  };
}
