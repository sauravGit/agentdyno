# AgentDyno

**Don't trust "it fits." Measure it.**

AgentDyno is the dyno bench for local coding agents. It scans your machine,
finds the open models that fit, launches them correctly — and then actually
proves, with a five-probe agentic exam on your own hardware, that a model can
drive tools before you wire Claude Code, OpenCode, or Aider to it.

Local, free, Apache-2.0. No accounts, no telemetry, no paid tier.

## Why

Fit calculators tell you a model fits in memory. Then you connect an agent and
it fails silently: tool calls come out as raw XML, the model picks the wrong
tool once more than five are registered, edits report success while no file
changes. Every one of those failure modes is documented across the ecosystem
(references in `research/REPORT.md`). Memory fit is necessary, not sufficient.
AgentDyno measures the sufficient part.

New here? [**TESTING.md**](TESTING.md) is a step-by-step guide (input + real
expected output for every command) to try every feature in ~15 minutes.

## Quickstart (macOS Apple Silicon / Intel, Linux; Windows experimental)

```sh
npm install && npm run build     # from source (npm package planned)
node dist/src/cli.js setup       # guided: pick UI or CLI, ends with a connected agent
```

`dyno setup` is the fast path: scan → pick a model → activate → run the exam
→ connect Claude Code / OpenCode / Aider (auto-launched in a new terminal) or
install the VS Code extension — one flow instead of the manual steps below.

Or run each step yourself:

```sh
node dist/src/cli.js scan        # what is this machine, honestly
node dist/src/cli.js fit         # which models fit, ranked, with max context
node dist/src/cli.js pull qwen2.5-coder-7b
node dist/src/cli.js serve       # managed llama-server: right flags, health-polled
node dist/src/cli.js doctor      # THE EXAM: 5 probes, grade A-F, tok/s
node dist/src/cli.js connect claude   # wire an agent to the VERIFIED server
```

## Ollama backend

For privacy-conscious developers who already run (or want to run) models via
[Ollama](https://ollama.com) rather than our managed llama-server: point AgentDyno
at a local Ollama daemon instead.

```sh
ollama serve                         # your daemon, your process, independent of us
ollama pull qwen2.5-coder:3b         # ollama's own registry, not ours
node dist/src/cli.js serve --ollama qwen2.5-coder:3b
node dist/src/cli.js doctor          # the SAME 5-probe exam, same rubric, no special-casing
node dist/src/cli.js connect claude  # Ollama >= v0.14 speaks the Anthropic Messages API natively
```

Real per-model KV geometry (layers, KV heads, head dim, context) comes live
from Ollama's own `/api/show`, not a hand-maintained mapping — so fit math and
the doctor exam apply to whatever you've actually pulled, honestly. AgentDyno
never touches ollama.com/search directly (no public JSON API exists for it);
Ollama's own registry resolves the tag on `pull`, which is all a backend needs.
The dashboard's switcher table lists Ollama-pulled models and our
managed-llama.cpp catalog side by side, ranked by the same one rule: verified
beats unverified, always.

## Switcher, dashboard, IDE

- `dyno switch` — one ranked list across the whole catalog: a model VERIFIED
  by `doctor` on this machine always outranks an unverified catalog prior,
  no matter the letter grade (we proved priors can be wrong — see BUILD_LOG.md
  D-011). `dyno switch <model-id>` or `--activate` pulls + serves the pick in
  one command. Where a real external benchmark match exists (Aider's coding
  leaderboard, family + size matched, no borrowed scores from bigger siblings)
  it breaks ties; most laptop-sized models honestly show "no data" instead.
- `dyno dashboard` — a loopback-only local web UI + JSON API (`127.0.0.1:8403`)
  over the same scan/switch/doctor/connect logic: hardware panel, switcher
  table with one-click activate, live doctor exam, connect-config generator.
- `vscode-extension/` — a thin VS Code wrapper (not a reimplementation) that
  starts the dashboard and embeds it in a webview. Build a `.vsix` with
  `cd vscode-extension && npm install && npm run build && npx @vscode/vsce package`.

## The exam (`doctor`)

| Probe | What it proves | Failure it screens for |
|---|---|---|
| P1 single tool call | well-formed tool_call JSON | raw XML/prose instead of tool calls |
| P2 selection among 9 tools | right tool under load | degradation past ~5 registered tools |
| P3 tool-result round trip | uses real results | "says done, did nothing" |
| P4 tricky-string fidelity | quotes/newlines survive | mangled edit payloads |
| P5 long-context recall | facts from context start | forgetting the file it just read |

Grades: **A** all pass at >= 15 tok/s (agent-ready) · **B** core pass
(usable; limited context/speed) · **C** partial (chat only) · **F** cannot
drive tools. Reports are saved to `~/.magix-box/reports/` and shown by
`connect`, so a config you copy is a config that passed.

## How fit is computed

`need(context) = weights + kv_cache(context) + overhead`, with KV geometry
(layers, KV heads, head dim) taken from each model's real `config.json` —
GQA models are correctly rewarded. Budgets are honest per platform: Apple
Silicon unified-memory wired limit (~65% of RAM by default), NVIDIA free VRAM,
half of system RAM for CPU. The catalog (8 models, coding + tool-calling
focused) is generated from live Hugging Face metadata with exact file sizes
and SHA-256 checksums — see `tools/build-catalog.ts`.

## Relationship to prior art

- [llmfit](https://github.com/AlexsJones/llmfit) answers "does it fit" —
  excellent, and if that is all you need, use it. AgentDyno answers "does it
  work as an agent, on this machine, with proof."
- [Athanor Lite](https://github.com/BBALabs/athanor-lite) inspired the honest
  fit-math UX; it is Windows-only and source-available (non-commercial).
  AgentDyno is an independent clean-room implementation under Apache-2.0.
- llama.cpp's `llama-server` provides the runtime and natively speaks both the
  OpenAI and Anthropic APIs — AgentDyno manages it so the flags are right.

NOTE: Anthropic has not publicly stated whether pointing Claude Code at
non-Anthropic backends is permitted (anthropics/claude-code#5577). OpenCode
and Aider are fully-open first-class targets here.

## License

Apache-2.0.
