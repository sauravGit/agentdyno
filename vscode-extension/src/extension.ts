// AgentDyno VS Code extension — intentionally a thin wrapper, not a rebuild.
// It does not bundle the CLI or reimplement scan/fit/doctor: it starts
// `dyno dashboard` in an integrated terminal and embeds the same dashboard
// (site/dashboard/index.html, served by src/api.ts) in a webview. All product
// logic stays in one place (the CLI + API server) so the extension can never
// drift from what `dyno` actually does on the command line.

import * as vscode from "vscode";
import * as http from "node:http";

let terminal: vscode.Terminal | undefined;

function config() {
  return vscode.workspace.getConfiguration("agentdyno");
}

async function ensureRepoPath(): Promise<string | undefined> {
  let repoPath = config().get<string>("repoPath");
  if (repoPath) return repoPath;

  const picked = await vscode.window.showOpenDialog({
    canSelectFiles: false,
    canSelectFolders: true,
    canSelectMany: false,
    openLabel: "Select AgentDyno checkout",
    title: "Select your local clone of github.com/sauravGit/agentdyno",
  });
  if (!picked || picked.length === 0) return undefined;
  repoPath = picked[0].fsPath;
  await config().update("repoPath", repoPath, vscode.ConfigurationTarget.Global);
  return repoPath;
}

function pingDashboard(url: string, timeoutMs = 800): Promise<boolean> {
  return new Promise((resolve) => {
    const req = http.get(`${url}/api/status`, { timeout: timeoutMs }, (res) => {
      res.resume();
      resolve((res.statusCode ?? 500) < 500);
    });
    req.on("error", () => resolve(false));
    req.on("timeout", () => {
      req.destroy();
      resolve(false);
    });
  });
}

async function startServer(): Promise<void> {
  const repoPath = await ensureRepoPath();
  if (!repoPath) {
    vscode.window.showWarningMessage("AgentDyno: no repo path selected — cannot start the dashboard server.");
    return;
  }
  if (!terminal || terminal.exitStatus !== undefined) {
    terminal = vscode.window.createTerminal({ name: "AgentDyno", cwd: repoPath });
  }
  terminal.show(true);
  terminal.sendText("node dist/src/cli.js dashboard", true);
}

function openWebview(url: string) {
  const panel = vscode.window.createWebviewPanel(
    "agentdynoDashboard",
    "AgentDyno",
    vscode.ViewColumn.Beside,
    { enableScripts: true, retainContextWhenHidden: true }
  );
  const csp = `default-src 'none'; frame-src ${url}; style-src 'unsafe-inline';`;
  panel.webview.html = `<!DOCTYPE html>
<html><head><meta http-equiv="Content-Security-Policy" content="${csp}">
<style>html,body,iframe{margin:0;padding:0;width:100%;height:100%;border:0;background:#0B0E11}</style>
</head><body><iframe src="${url}"></iframe></body></html>`;
}

export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand("agentdyno.startServer", startServer),
    vscode.commands.registerCommand("agentdyno.openDashboard", async () => {
      const url = config().get<string>("dashboardUrl") ?? "http://127.0.0.1:8403";
      if (await pingDashboard(url)) {
        openWebview(url);
        return;
      }
      const choice = await vscode.window.showWarningMessage(
        "AgentDyno dashboard is not running.",
        "Start it",
        "Cancel"
      );
      if (choice !== "Start it") return;
      await startServer();
      // Give the server a moment to bind, then open — the dashboard's own
      // polling loop handles the rest once the webview is up.
      for (let i = 0; i < 10; i++) {
        await new Promise((r) => setTimeout(r, 500));
        if (await pingDashboard(url)) break;
      }
      openWebview(url);
    })
  );
}

export function deactivate() {}
