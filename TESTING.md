# Testing AgentDyno — a step-by-step guide for new users

Every step below is **input you type** and **expected output** — captured from a
real run on a MacBook Air (Apple M4, 16 GB) so you know what "working" looks
like before you try it yourself. Numbers (tok/s, GiB, grades) will differ on
your machine — that's the point of the tool. Commands and shape shouldn't.

Total time: ~15 minutes for the CLI fast path (small model). Add ~10-15
minutes for the optional F-vs-B demo in Step 7, and ~5 minutes for the
optional VS Code extension in Step 12.

---

## 0. Prerequisites

| Need | Check | Expected |
|---|---|---|
| Node.js >= 20 | `node --version` | `v20.x.x` or higher |
| npm | `npm --version` | any recent version |
| ~5 GB free disk | `df -h .` | plenty free (models are 2-5 GB each) |
| macOS Intel/Silicon, or Linux | — | Windows is experimental, untested |

---

## 1. Install

**Input:**
```sh
git clone https://github.com/sauravGit/agentdyno
cd agentdyno
npm install
npm run build
```

**Expected output** (last few lines):
```
> agentdyno@0.3.0 build
> tsc
```
No errors. A `dist/` directory now exists next to `src/`.

**Verify the build works:**
```sh
node dist/src/cli.js
```
**Expected output:**
```
magix-box — prove your machine can run a coding agent, then wire it up.

usage: mb <command>

  scan                     honest hardware report (--json)
  fit [--context N]        which models fit THIS machine, ranked (--json)
  switch                   ranked model switcher: verified grade beats unverified prior
  ...
Local, free, no accounts, no telemetry. Apache-2.0.
```

> Every command below is written as `node dist/src/cli.js <command>`. If you'd
> rather type `dyno <command>`, run `npm link` once (optional) and use that
> instead — same binary either way.

---

## The fast path: `dyno setup`

Everything from Step 3 through Step 8 below (scan → pick a model → activate →
doctor → connect an agent), in one guided flow. Skip ahead here if you don't
want to run each command by hand; come back to the individual steps if you
want to understand or test each piece on its own.

**Input:**
```sh
node dist/src/cli.js setup
```

**Expected output:**
```
AgentDyno setup — how would you like to do this?
  [1] Guided UI in your browser (recommended)
  [2] Guided CLI, right here
pick a number [1/2]:
```

**Choosing `1` (UI)**: starts the dashboard server and opens
`http://127.0.0.1:8403/setup.html` in your browser — a step-by-step wizard:
machine → pick a model → activate (live progress) → run the exam (optional)
→ pick Goose / Cline / VS Code extension → done. Picking an
agent opens a new terminal window with it already connected (macOS); picking
the VS Code extension builds, packages, and installs it automatically —
along with the Goose + Cline CLIs and Cline's own VS Code extension.

**Choosing `2` (CLI)**: the same flow as plain text prompts in this terminal,
ending with an option to launch the chosen agent directly, in this same
window.

**Important if you're testing this non-interactively** (piping answers via
`echo`/`printf`): a plain pipe is not a real terminal, and Node's terminal
input handling behaves differently once real network calls (the leaderboard
fetch) happen between prompts — a piped/non-TTY stdin can end up silently
stuck. This does **not** affect real interactive use (typing into an actual
terminal never hits this). If you need to script it, drive it through a real
pseudo-terminal instead, e.g. with `expect` rather than a plain pipe.

---

## 2. Run the test suite (proves the logic works without touching a model)

**Input:**
```sh
npm test
```

**Expected output** (end of a longer list):
```
ℹ tests 32
ℹ suites 0
ℹ pass 32
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
```
All 32 pass. These run against fixtures — no model download, no running
daemon, no network needed. If this fails, stop here and check your Node
version before continuing.

---

## 3. `scan` — what does AgentDyno think your machine can do?

**Input:**
```sh
node dist/src/cli.js scan
```

**Expected output** (real example, Apple M4 / 16 GB):
```
machine   Apple M4 (arm64), 10 cores
memory    16.0 GiB RAM
accel     metal — Apple M4 (unified memory)
budgets   gpu 10.4 GiB | cpu 8.0 GiB
disk      267.4 GiB free
note      Apple Silicon default GPU budget modeled at 65% of unified RAM
```

**What to check:** `memory` should match your actual RAM (check Activity
Monitor / `System Settings > General > About`, or `free -h` on Linux). If it's
wildly wrong, something is broken — file an issue with this output attached.

**Also try:** `node dist/src/cli.js scan --json` — same data as machine-readable JSON.

---

## 4. `fit` — which open models actually fit your machine?

**Input:**
```sh
node dist/src/cli.js fit
```

**Expected output** (real example — yours will differ by RAM/GPU, but the
shape is identical):
```
fit verdicts at 16384 tokens of context (gpu budget 10.4 GiB):

model                                quant    need      verdict        max-ctx  tools
Qwen3 8B                             Q4_K_M   8.1 GiB   comfortable    21535    A
Qwen2.5 Coder 3B Instruct            Q8_0     4.8 GiB   comfortable    32768    B
Llama 3.2 3B Instruct                Q4_K_M   4.8 GiB   comfortable    53920    B
Qwen2.5 Coder 3B Instruct            Q4_K_M   3.6 GiB   comfortable    32768    B
Qwen2.5 Coder 7B Instruct            Q6_K     7.9 GiB   comfortable    32768    C
...
tools column: catalog grade for tool-calling (A best). Run mb doctor to VERIFY on this machine.
```

**What to check:**
- Every row's `verdict` should make sense given your `scan` budgets (bigger
  models further down should say `gpu+cpu split` or `won't fit` on a 16 GB
  machine; everything should say `comfortable` on a 64+ GB machine).
- The `tools` column is a grade **nobody has proven yet on your machine** —
  that's the whole point of Step 6. Don't trust it blindly; that's the thesis.

---

## 5. `pull` — download a model (fast path: the smallest one)

**Input:**
```sh
node dist/src/cli.js pull qwen2.5-coder-3b --quant Q4_K_M
```

**Expected output** (trimmed — you'll see a live progress line that updates
in place):
```
downloading llama.cpp b10107 (llama-b10107-bin-macos-arm64.tar.gz, 10 MiB)
runtime ready: ~/.magix-box/runtime/llama-server -> ...
downloading Qwen2.5 Coder 3B Instruct Q4_K_M (1.9 GiB)
  1.9 GiB / 1.9 GiB (100.0%)
verifying SHA-256...
checksum OK
```

**What to check:** it ends with `checksum OK`, not an error. If it stops
partway, just re-run the same command — downloads resume from where they
left off (kill it with Ctrl-C mid-download and try this yourself to see the
resume behavior).

**First run only:** this also downloads the ~10 MB llama.cpp runtime once;
subsequent `pull`s skip that step.

---

## 6. `serve` — launch the model with the correct settings

**Input:**
```sh
node dist/src/cli.js serve qwen2.5-coder-3b
```

**Expected output:**
```
starting Qwen2.5 Coder 3B Instruct Q4_K_M (comfortable, ctx 32768)...
ready: http://127.0.0.1:8402 (pid 12345, context 32768)
endpoints: OpenAI /v1/chat/completions | Anthropic /v1/messages
```

**What to check:**
```sh
node dist/src/cli.js status
```
**Expected output:**
```
server: running (llama-server, pid 12345) — Qwen2.5 Coder 3B Instruct, context 32768
doctor: not yet examined
```

**Try talking to it directly** (optional, proves the server really works):
```sh
curl -s http://127.0.0.1:8402/v1/chat/completions \
  -H 'Content-Type: application/json' \
  -d '{"model":"local","messages":[{"role":"user","content":"Say OK and nothing else."}]}' \
  | python3 -c "import json,sys; print(json.load(sys.stdin)['choices'][0]['message']['content'])"
```
**Expected output:** `OK` (or very close to it — small models are occasionally chatty).

---

## 7. `doctor` — the actual point of this project: does it work as an agent?

**Input:**
```sh
node dist/src/cli.js doctor
```

**Expected output** (takes 1-3 minutes; 5 probes run against your live
server — this is a real captured run, not illustrative):
```
examining qwen2.5-coder-3b at context 32768 — 5 probes, ~1-3 min on laptop hardware

P1  FAIL  single tool call           1.4s 45.3 tok/s  no tool call (content: a JSON-fenced write_file call as raw TEXT, not a real tool_call)
P2  FAIL  tool selection among 9     2.2s 43.6 tok/s  no tool call with 9 tools present
P3  FAIL  tool-result round trip     0.9s 46.4 tok/s  no tool call
P4  FAIL  tricky-string arg fidelity 1.4s 45.1 tok/s  no parseable tool call
P5  FAIL  long-context recall        35.7s 29.5 tok/s  no parseable tool call

grade: F   generation: 42.0 tok/s
meaning: cannot drive the agent loop (tool calls malformed, wrong, or ignored); do not wire an agent to this
report saved: ~/.magix-box/reports/qwen2.5-coder-3b.json
```

**What to check:** this is a REAL result, not a bug — the smallest catalog
model is exactly the case where "it fits" and "it works" diverge. A grade of
`F` here is AgentDyno doing its job, not failing at it. Grades are per
model+quant+context — a bigger model, or the same model at a smaller context,
can grade differently.

**Try the bigger model too** (optional, ~20-30 min total — this reproduces
the F-vs-B story from the launch video):
```sh
node dist/src/cli.js serve --stop
node dist/src/cli.js pull qwen3-8b
node dist/src/cli.js serve qwen3-8b
node dist/src/cli.js doctor
```
**Expected output** (real example on the same machine):
```
P1  PASS  single tool call           17.6s 18.3 tok/s  correct call + args
P2  PASS  tool selection among 9     32.9s 16.7 tok/s  picked rename_symbol correctly
P3  PASS  tool-result round trip     45.7s 16.8 tok/s  used real tool result (7311)
P4  FAIL  tricky-string arg fidelity 18.7s 16.9 tok/s  content degraded: ...
P5  PASS  long-context recall        68.0s 12.3 tok/s  recalled constant from context start

grade: B   generation: 16.2 tok/s
```
Same laptop, different model, night-and-day difference — see it for yourself.

---

## 8. `connect` — wire a real agent to the (now-verified) server

**Input:**
```sh
node dist/src/cli.js connect goose
```

**Expected output** (real captured run):
```
verified: grade F on this machine (7/28/2026, 12:16:49 AM)

WARNING: doctor grade is below agent-ready; expect silent failures. Try a bigger/graded-A model.

# Goose -> local Qwen2.5 Coder 3B Instruct
export GOOSE_PROVIDER="openai"
export GOOSE_MODEL="qwen2.5-coder-3b"
export OPENAI_HOST="http://127.0.0.1:8402"
export OPENAI_BASE_PATH="v1/chat/completions"
export OPENAI_API_KEY="magix-box-local"
goose run --model qwen2.5-coder-3b
# or: goose session

# Guardrail: server context is 32768 tokens; long sessions will compact early.
# local 3.1B-class models are weaker than frontier models. Goose's
# reliability tracks your `dyno doctor` grade directly — battle-tested: a
# grade-F model here returned the tool call as text (no file written); a
# grade-B model executed it correctly. Run doctor before trusting this.
```

**What to check:** notice the WARNING — it only appears because the grade is
below B. Re-run this after switching to a graded-B+ model (Step 7's optional
part) and the warning should disappear. If you have the real Goose CLI
installed (`brew install block-goose-cli`), you can literally paste this
output into your terminal and it will connect — that's exactly how this
project verified it live (see BUILD_LOG.md D-025).

**Also try:**
```sh
node dist/src/cli.js connect cline
```
AgentDyno deliberately does not support Claude Code as a connect target —
Anthropic has never publicly stated whether pointing it at a non-Anthropic
backend is permitted. Goose and Cline are this project's two first-class,
fully-open targets.
Each prints a different, correct config for that specific tool.

---

## 9. `switch` — one ranked list, one command to activate the best pick

**Input:**
```sh
node dist/src/cli.js switch
```

**Expected output** (grades change based on what you've run `doctor` on so far):
```
switcher ranking (verified grades always outrank unverified priors):

model                                quant    grade  verdict        external
Qwen3 8B                             Q4_K_M   B      comfortable    no data
Qwen2.5 Coder 3B Instruct            Q4_K_M   F      comfortable    no data
Llama 3.2 3B Instruct                Q4_K_M   B?     comfortable    no data
...
grade column: real doctor grade (A/B/C/F) if verified on this machine, else 'X?' = untested catalog prior.
```

**What to check:** any model you've already run `doctor` on shows a plain
letter (verified); everything else shows `X?` (unverified guess). The
verified ones should be sorted strictly above unverified ones, regardless of
letter — that ordering rule is the core promise of this tool. Confirm it with
your own eyes here.

**One-command activate:**
```sh
node dist/src/cli.js switch --activate
```
**Expected output:** pulls (if needed) + serves the #1 ranked pick automatically.

---

## 10. `dashboard` — the web UI

**Input:**
```sh
node dist/src/cli.js dashboard
```

**Expected output:**
```
dashboard: http://127.0.0.1:8403
loopback only — not reachable from outside this machine. Ctrl-C to stop.
```

**What to check:** open `http://127.0.0.1:8403` in a browser. You should see:
- A **// machine** panel matching your `scan` output
- A **// switcher** table matching your `switch` output, with an
  **activate** / **pull + activate** button per row
- A **// active server** panel with a **run doctor exam** button
- A **// connect** panel with tabs for goose / cline that show
  real config text (only after a server is running)

Click **activate** on any row and watch the page poll and update itself over
a few seconds/minutes without a page reload.

Stop it with `Ctrl-C` in the terminal when done.

---

## 11. Ollama backend (optional — privacy-first path)

Skip this section if you don't use [Ollama](https://ollama.com). If you do:

**Input:**
```sh
ollama serve &                        # your own daemon, in its own terminal
ollama pull qwen2.5-coder:3b          # ollama's own registry
node dist/src/cli.js serve --ollama qwen2.5-coder:3b
```

**Expected output:**
```
starting ollama:qwen2.5-coder:3b (ctx 16384)...
ready: http://127.0.0.1:11434 (backend: ollama, context 16384)
endpoints: OpenAI /v1/chat/completions | Anthropic /v1/messages
```

**Then run the exact same commands as before:**
```sh
node dist/src/cli.js doctor
node dist/src/cli.js connect goose
```
**Expected output:** identical shape to Step 7/8, just sourced from Ollama
instead of our managed llama-server. `status` will show `backend: ollama`.

**What to check:** `node dist/src/cli.js serve --stop` should NOT stop your
Ollama daemon (check with `ollama list` afterward — it should still respond).
AgentDyno only forgets its own bookkeeping; it never owns your Ollama process.

---

## 12. VS Code extension (thin wrapper around the dashboard)

Build and install a real `.vsix` — no CLI-only shortcuts here, this installs
into your actual VS Code. It ships with an AgentDyno-branded icon (the gauge
mark from `brand/BRAND.md`, built in `vscode-extension/icon.png`) so it's
recognizable in the Extensions view rather than showing a generic icon.

This flow has been verified for real, end to end, in a live VS Code: the
install succeeds, `AgentDyno: Open Dashboard` / `AgentDyno: Start Dashboard
Server` both appear correctly in the Command Palette, and selecting "Open
Dashboard" with no server running correctly triggers the extension's own
"AgentDyno dashboard is not running — Start it?" prompt.

**Input:**
```sh
cd vscode-extension
npm install
npm run build
npx --yes @vscode/vsce package --no-dependencies --allow-missing-repository
code --install-extension agentdyno-vscode-0.1.0.vsix
```
(If `code` isn't on your PATH: open the Command Palette in VS Code ->
"Shell Command: Install 'code' command in PATH" once, or use the full path
to the bundled CLI, e.g. on macOS:
`/Applications/Visual Studio Code.app/Contents/Resources/app/bin/code`.)

**Expected output:**
```
Installing extensions...
Extension 'agentdyno-vscode-0.1.0.vsix' was successfully installed.
```

**Verify it's really installed:**
```sh
code --list-extensions --show-versions | grep agentdyno
```
**Expected output:**
```
agentdyno.agentdyno-vscode@0.1.0
```

**Finish it yourself with 3 clicks** (a CLI can install the extension and
confirm it's registered, but clicking through its UI is yours to do — and if
you're testing this from a remote/headless agent session, there's no screen
for anything to automate safely):

1. Open VS Code on this repo, open the Command Palette (`Cmd+Shift+P` /
   `Ctrl+Shift+P`), type **AgentDyno: Open Dashboard**, press Enter.
   **Expected:** if `dyno dashboard` isn't already running, VS Code asks
   "AgentDyno dashboard is not running. Start it?" — click **Start it**.
2. **Expected:** an integrated terminal opens and runs `node dist/src/cli.js
   dashboard`; after a moment a new editor panel opens beside it showing the
   AgentDyno dashboard (same UI as Step 10) inside a webview.
3. Try the **AgentDyno: Start Dashboard Server** command directly too — it
   should just (re)start the terminal command without opening the webview.
4. Open the Extensions view (icon in the left activity bar) and find
   AgentDyno — you should see the gauge-mark icon, not a generic placeholder.

**Uninstall when done** (optional):
```sh
code --uninstall-extension agentdyno.agentdyno-vscode
```

---

## 13. Cleanup

**Input:**
```sh
node dist/src/cli.js serve --stop
```
**Expected output:** `server stopped`

**To reclaim disk space** (optional — deletes downloaded models/runtime):
```sh
rm -rf ~/.magix-box
```

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| `npx tsc` / `npm run build` fails | Node < 20 | `node --version`, upgrade if needed |
| `pull` fails partway | flaky network | just re-run — it resumes |
| `doctor` says "no server running" | forgot Step 6 | run `serve` first, `doctor` examines the LIVE server |
| every model grades F | server started but never loaded (check `~/.magix-box/logs/llama-server.log`) | confirm `status` shows the model you expect |
| `dashboard` shows a blank switcher table | still loading (first paint) | wait ~1s, it polls automatically |
| Ollama section: "not pulled into ollama yet" | forgot `ollama pull <tag>` first | AgentDyno never pulls into Ollama's own store for you |
| `code: command not found` | VS Code's shell shortcut isn't installed | use the full path to the bundled CLI (see Step 12), or run "Shell Command: Install 'code' command in PATH" from VS Code's own Command Palette once |

If something here doesn't match, that's a bug — please open an issue with the
exact command and output you got.
