# v0.6.1

Same as v0.6.0, plus a real bug found by actually running `brew install` against
the tap (not just researching it):

- `bonjour-service` was pinned `^1.4.4`, and 1.4.4 had been published to npm only
  ~90 minutes before this release. Homebrew's npm install step applies a release
  cooldown (a supply-chain safety guard that refuses to install packages newer
  than a few days old), so `brew install` failed with `ETARGET`. Relaxed to
  `^1.4.3` (19 days old at time of release, functionally identical for what we
  use) — verified via a clean `brew install sauravGit/agentdyno/agentdyno` end
  to end.

## v0.6.0 highlights (unchanged)

- **Goose + Cline first-class integration** — `dyno connect goose` / `dyno
  connect cline`, both battle-tested against a real managed llama-server. The
  VS Code extension auto-installs both CLIs plus Cline's own VS Code extension.
- **LAN / remote mode** — `dyno dashboard --lan` advertises over mDNS; `dyno
  remote discover|connect|status|clear` on the client side. Only a
  bearer-token-gated control-plane API is ever exposed to the network.
- **VS Code activity-bar icon** for the extension.
- **`dyno version` / `dyno --version`**.
- **npm-publish-ready** — package trimmed from 26MB/182 files to 1.5MB/40 files.

## Install

```sh
brew install sauravGit/agentdyno/agentdyno
# or:
npm install -g https://github.com/sauravGit/agentdyno/releases/download/v0.6.1/agentdyno-0.6.1.tgz
```

## Known gap

Not yet on the public npm registry — `npm publish` requires `npm login` with
real credentials, which this automation doesn't have. The tarball attached here
is the exact artifact that command would upload.
