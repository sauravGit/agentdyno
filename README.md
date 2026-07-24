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

## Quickstart (macOS Apple Silicon / Intel, Linux; Windows experimental)

```sh
npm install && npm run build     # from source (npm package planned)
node dist/src/cli.js scan        # what is this machine, honestly
node dist/src/cli.js fit         # which models fit, ranked, with max context
node dist/src/cli.js pull qwen2.5-coder-7b
node dist/src/cli.js serve       # managed llama-server: right flags, health-polled
node dist/src/cli.js doctor      # THE EXAM: 5 probes, grade A-F, tok/s
node dist/src/cli.js connect claude   # wire an agent to the VERIFIED server
```

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
