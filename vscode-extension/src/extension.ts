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

function apiGet(url: string, timeoutMs = 4000): Promise<any> {
  return new Promise((resolve, reject) => {
    const req = http.get(url, { timeout: timeoutMs }, (res) => {
      const chunks: Buffer[] = [];
      res.on("data", (c) => chunks.push(c));
      res.on("end", () => {
        try {
          resolve(JSON.parse(Buffer.concat(chunks).toString("utf8")));
        } catch (e) {
          reject(e);
        }
      });
    });
    req.on("error", reject);
    req.on("timeout", () => {
      req.destroy();
      reject(new Error("timed out"));
    });
  });
}

function apiPost(url: string, body: unknown = {}, timeoutMs = 4000): Promise<any> {
  return new Promise((resolve, reject) => {
    const payload = Buffer.from(JSON.stringify(body));
    const req = http.request(
      url,
      { method: "POST", timeout: timeoutMs, headers: { "Content-Type": "application/json", "Content-Length": payload.length } },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => {
          try {
            resolve(JSON.parse(Buffer.concat(chunks).toString("utf8")));
          } catch (e) {
            reject(e);
          }
        });
      }
    );
    req.on("error", reject);
    req.on("timeout", () => {
      req.destroy();
      reject(new Error("timed out"));
    });
    req.end(payload);
  });
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

/**
 * Chat participant handler — a thin wrapper same as the rest of this
 * extension: every answer comes from the local dashboard API (src/api.ts),
 * never reimplemented here. Falls back to a clear "start it" message if the
 * dashboard isn't running, since a dead server is the most likely reason a
 * request fails.
 */
function chatHandler(
  dashboardUrlDefault: string
): (
  request: vscode.ChatRequest,
  chatContext: vscode.ChatContext,
  stream: vscode.ChatResponseStream,
  token: vscode.CancellationToken
) => Promise<void> {
  return async (request, _chatContext, stream) => {
    const url = config().get<string>("dashboardUrl") ?? dashboardUrlDefault;
    const up = await pingDashboard(url);
    if (!up) {
      stream.markdown(
        "AgentDyno's dashboard isn't running. Start it with the **AgentDyno: Start Dashboard Server** command, or run `dyno dashboard` in a terminal, then ask again."
      );
      return;
    }

    if (request.command === "status") {
      const s = await apiGet(`${url}/api/status`);
      if (!s.server) {
        stream.markdown("No model server is active. Run `dyno switch --activate` or use the AgentDyno panel to pick one.");
        return;
      }
      stream.markdown(
        `**model:** ${s.server.modelId}  \n` +
          `**context:** ${s.server.context}  \n` +
          `**server:** ${s.serverHealthy ? "healthy" : "not responding"}  \n` +
          `**verified grade:** ${s.verifiedReport ? s.verifiedReport.grade : "not yet examined — try \`@agentdyno /doctor\`"}`
      );
      return;
    }

    if (request.command === "doctor") {
      const s = await apiGet(`${url}/api/status`);
      if (!s.server) {
        stream.markdown("No model server is active — activate one first, then run the exam.");
        return;
      }
      stream.progress("running the 5-probe agentic readiness exam (1-3 min)...");
      await apiPost(`${url}/api/doctor`);
      for (let i = 0; i < 180; i++) {
        await new Promise((r) => setTimeout(r, 1000));
        const poll = await apiGet(`${url}/api/status`);
        if (!poll.doctor?.inProgress) {
          if (poll.doctor?.result) {
            const r = poll.doctor.result;
            stream.markdown(
              `**grade: ${r.grade}**${r.genTokensPerSec ? ` (${r.genTokensPerSec.toFixed(1)} tok/s)` : ""}  \n` +
                r.results.map((p: any) => `- ${p.pass ? "PASS" : "FAIL"} ${p.name}`).join("\n")
            );
          } else {
            stream.markdown(`exam failed: ${poll.doctor?.error ?? "unknown error"}`);
          }
          return;
        }
      }
      stream.markdown("exam is taking longer than expected — check the AgentDyno panel for progress.");
      return;
    }

    if (request.command === "connect") {
      const target = request.prompt.trim().toLowerCase().includes("cline") ? "cline" : "goose";
      try {
        const result = await apiGet(`${url}/api/connect/${target}`);
        if (result.error || !result.text) {
          stream.markdown(`No model server is active — activate one first, then ask again. (${result.error ?? "no config returned"})`);
          return;
        }
        stream.markdown(`**${target} connect config:**\n\n\`\`\`\n${result.text}\n\`\`\``);
        if (target === "cline") {
          stream.markdown(`\nOr run **AgentDyno: Connect Cline** from the Command Palette — it copies these values and opens Cline's settings panel for you.`);
        }
      } catch (e) {
        stream.markdown(`Couldn't reach the dashboard: ${(e as Error).message}`);
      }
      return;
    }

    // No slash command: give a short status line and point at the specifics.
    const s = await apiGet(`${url}/api/status`).catch(() => null);
    if (s?.server) {
      stream.markdown(
        `Running **${s.server.modelId}** (${s.serverHealthy ? "healthy" : "not responding"}). ` +
          "Try `/status`, `/doctor`, or `/connect goose|cline`."
      );
    } else {
      stream.markdown("No model server is active. Try `/status`, `/doctor`, or `/connect goose|cline` once one is.");
    }
  };
}

/**
 * The one setup step AgentDyno genuinely cannot automate: Cline exposes no
 * VS Code configuration and no command to set its API provider fields
 * programmatically (checked directly against its installed package.json —
 * empty `contributes.configuration`, no `cline.setApiConfiguration`-style
 * command). So this doesn't pretend to auto-fill Cline's settings; it
 * removes every OTHER step instead: opens Cline's settings panel for you
 * and puts the exact values on your clipboard, ready to paste. Do this
 * once — the values point at AgentDyno's stable gateway, so switching
 * models later (even switching backends) never requires repeating it.
 */
async function connectClineGuided(dashboardUrlDefault: string): Promise<void> {
  const url = config().get<string>("dashboardUrl") ?? dashboardUrlDefault;
  if (!(await pingDashboard(url))) {
    vscode.window.showWarningMessage(
      "AgentDyno dashboard isn't running yet. Start a model first (`dyno serve <model>`, or use the AgentDyno panel), then run this again."
    );
    return;
  }
  const status = await apiGet(`${url}/api/status`);
  if (!status.server) {
    vscode.window.showWarningMessage(
      "No model is active yet. Run `dyno serve <model>` or activate one from the AgentDyno panel, then run this again."
    );
    return;
  }
  const baseUrl = `${url}/v1`;
  const apiKey = "magix-box-local";
  const modelId = status.server.modelId;
  await vscode.env.clipboard.writeText(`Base URL: ${baseUrl}\nAPI Key: ${apiKey}\nModel ID: ${modelId}`);
  try {
    await vscode.commands.executeCommand("cline.settingsButtonClicked");
  } catch {
    // Cline isn't installed, or renamed its command — the clipboard copy and message below still carry the values.
  }
  vscode.window.showInformationMessage(
    `Copied to clipboard. In Cline's Settings -> API Provider: "OpenAI Compatible", paste: Base URL ${baseUrl} | API Key ${apiKey} | Model ID ${modelId}. One-time — switching models later never requires redoing this.`
  );
}

export function activate(context: vscode.ExtensionContext) {
  const provider = new DashboardViewProvider();
  const participant = vscode.chat.createChatParticipant("agentdyno.chat", chatHandler("http://127.0.0.1:8403"));
  participant.iconPath = vscode.Uri.joinPath(context.extensionUri, "icon.png");
  context.subscriptions.push(participant);
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
    }),
    vscode.commands.registerCommand("agentdyno.connectCline", () => connectClineGuided("http://127.0.0.1:8403"))
  );
}

export function deactivate() {}
