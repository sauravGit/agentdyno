// Shared "make an agent actually usable" operations: installing the VS Code
// extension and merging OpenCode's provider config. Used by BOTH the CLI
// setup wizard (setup.ts) and the dashboard API's UI wizard endpoints
// (api.ts) — kept in its own module (rather than in either of those two) so
// neither has to import the other and create a circular dependency.

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import os from "node:os";

export function which(bin: string): boolean {
  try {
    execFileSync(process.platform === "win32" ? "where" : "which", [bin], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

export async function mergeOpencodeConfig(block: Record<string, unknown>): Promise<string> {
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

/** Runs the vsix build+package+install chain — the same steps documented in
 *  TESTING.md — so this can never silently drift from what a human would type. */
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
