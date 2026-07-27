# AgentDyno for VS Code

Thin wrapper around the AgentDyno CLI dashboard — does not bundle or duplicate
any product logic. Requires a local clone of
[github.com/sauravGit/agentdyno](https://github.com/sauravGit/agentdyno)
with `npm install && npm run build` already done.

## Commands
- **AgentDyno: Start Dashboard Server** — runs `dyno dashboard` in an integrated terminal.
- **AgentDyno: Open Dashboard** — opens the dashboard (starting it first if needed) in a VS Code webview.

## Settings
- `agentdyno.repoPath` — path to your AgentDyno checkout (prompted on first use).
- `agentdyno.dashboardUrl` — defaults to `http://127.0.0.1:8403`.
