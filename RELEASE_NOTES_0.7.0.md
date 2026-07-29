# v0.7.0

## New

- **`@agentdyno` chat participant in VS Code's Copilot Chat view** — shows up next
  to Copilot in the chat sidebar after installing the extension. Slash commands:
  `/status` (server + verified grade), `/doctor` (run the 5-probe exam from
  chat), `/connect goose` / `/connect cline` (get the config). All three are
  thin wrappers over the same local dashboard API every other AgentDyno surface
  uses — nothing is reimplemented. Battle-tested live: activated a real model,
  ran a real doctor exam (graded B), fetched real Goose and Cline connect
  configs through the participant's own code paths.
- **Clean-slate reinstall flow** — `dyno setup` now detects leftovers from a
  previous install (state files, saved reports, an already-installed VS Code
  extension) and asks, once, up front, whether to clean before continuing.
  Also available directly as `dyno clean` (`--models` to also delete
  downloaded model weights, `--vscode-extension` to also uninstall the
  extension — both opt-in, never a surprise side effect). The browser setup
  wizard got the same banner.

## Fixed

- `installVscodeExtension()` had the packaged `.vsix` filename hardcoded to a
  specific version string — would have silently broken on every future
  extension version bump. Now reads name+version from the extension's own
  `package.json`.
- A first draft of `dyno clean` uninstalled the VS Code extension by default
  any time it detected one — caught by actually running the command against
  a real machine, not just reading the code. Now opt-in only.
- The chat participant's connect handler would have shown `undefined` instead
  of a helpful message when no model server was active, because the API
  returns a 409 with a valid JSON `{error}` body and the fetch helper doesn't
  check status codes — caught via a live curl test of the exact endpoint the
  participant calls.

## Install

```sh
brew install sauravGit/agentdyno/agentdyno
# or:
npm install -g https://github.com/sauravGit/agentdyno/releases/download/v0.7.0/agentdyno-0.7.0.tgz
```

Still not on the public npm registry — same blocker as prior releases (no
`npm login` on this machine). The tarball attached here is the exact artifact
`npm publish` would upload.
