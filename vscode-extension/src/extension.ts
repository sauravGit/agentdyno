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

function dashboardHtml(url: string, showStartButton: boolean): string {
  const csp = `default-src 'none'; frame-src ${url}; style-src 'unsafe-inline'; script-src 'unsafe-inline';`;
  const startButton = showStartButton
    ? `<button id="start">Start dashboard</button><p class="hint">Runs <code>dyno dashboard</code> in a terminal, then reloads this panel.</p>`
    : "";
  return `<!DOCTYPE html>
<html><head><meta http-equiv="Content-Security-Policy" content="${csp}">
<style>
  html,body{margin:0;padding:0;width:100%;height:100%;background:#0B0E11;color:#E8EDF2;
    font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
  iframe{width:100%;height:100%;border:0;display:${showStartButton ? "none" : "block"}}
  .empty{display:${showStartButton ? "flex" : "none"};flex-direction:column;align-items:center;
    justify-content:center;height:100%;gap:12px;padding:20px;text-align:center}
  button{font-family:inherit;background:#3DDC97;color:#07130d;border:none;border-radius:6px;
    padding:8px 16px;font-weight:600;cursor:pointer}
  .hint{color:#8A97A6;font-size:12px;max-width:220px}
</style></head><body>
<div class="empty"><div>AgentDyno dashboard is not running.</div>${startButton}</div>
<iframe src="${url}"></iframe>
<script>
  const btn = document.getElementById('start');
  if (btn) btn.addEventListener('click', () => acquireVsCodeApi().postMessage({ type: 'start' }));
</script>
</body></html>`;
}

class DashboardViewProvider implements vscode.WebviewViewProvider {
  private view: vscode.WebviewView | undefined;

  resolveWebviewView(webviewView: vscode.WebviewView): void {
    this.view = webviewView;
    webviewView.webview.options = { enableScripts: true };
    webviewView.webview.onDidReceiveMessage(async (msg) => {
      if (msg?.type === "start") {
        await startServer();
        await this.refresh();
      }
    });
    void this.refresh();
  }

  async refresh(): Promise<void> {
    if (!this.view) return;
    const url = config().get<string>("dashboardUrl") ?? "http://127.0.0.1:8403";
    const up = await pingDashboard(url);
    this.view.webview.html = dashboardHtml(url, !up);
    if (!up) {
      // Poll a few times in case a server was just started elsewhere.
      for (let i = 0; i < 10; i++) {
        await new Promise((r) => setTimeout(r, 1000));
        if (await pingDashboard(url)) {
          this.view.webview.html = dashboardHtml(url, false);
          break;
        }
      }
    }
  }
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
  const provider = new DashboardViewProvider();
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider("agentdyno.dashboardView", provider),
    vscode.commands.registerCommand("agentdyno.startServer", async () => {
      await startServer();
      await provider.refresh();
    }),
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
