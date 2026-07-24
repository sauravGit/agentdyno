# Product Thesis — working codename "magix-box"

Date: 2026-07-24. Every claim below traces to a URL in research/REPORT.md or
research/results/*.json, or to a firsthand check logged in BUILD_LOG.md.
Inferences are labeled INFERENCE.

## The one-sentence thesis

Developers who refuse to pay coding-agent subscriptions have all the parts —
open agent CLIs, llama.cpp, capable open models — but no tool that looks at
their actual machine, tells them honestly which coding model fits, launches it
correctly, and wires their agent (Claude Code, OpenCode, Aider, Cline) to it in
one command; we build that missing connective tissue as a true open-source
project.

## The pain (verified)

1. "What can my machine run?" is unanswered by the most popular runtime.
   Ollama has an open feature request for `ollama fit` (issue #14771) and
   real VRAM-detection OOM bugs (#13018, #10114). Fit-calculator websites
   stop at a number and are distrusted for bad KV-cache math (HN/HF threads
   in results/Hardware_Fit_Tools.json).
2. Local models fail at agentic tool calling out of the box, across every
   agent front-end: Goose #6688 ("fragile and unusable"), #6883 (breaks past
   ~5 tools; Goose defaults to 11), OpenCode #7030 (tool calls report success,
   no files change), Aider #1208/#3651 (edit-format failures), Cline #4362
   ("you did not use a tool" loops), Continue #9157/#6913 (raw XML instead of
   tool calls), plus Ollama's silent 2k-context default truncation (Aider docs
   warning). Root causes are configuration, not fate: wrong chat template,
   wrong context size, too many tools, wrong model/quant for the RAM budget.
3. Claude-Code-style agents are hardware-blind; hardware-aware tools don't
   code. Athanor Lite (the inspiration) does honest fit math + one-click chat
   but zero agentic coding, is Windows-only, source-available non-commercial,
   ~38 stars. OpenHands (82k stars) codes but times out on local models with
   no feedback (#1253, #8768). Nobody occupies the intersection (confirmed by
   dedicated researcher pass, results/Hardware_Fit_Tools.json).
4. The market is consolidating away from local-first: Roo Code archived
   (May 2026), Continue.dev acquired by Cursor and repo frozen (June 2026),
   Ollama criticized for its paid Turbo/Cloud pivot. INFERENCE: this leaves
   users of those tools looking for a maintained, genuinely free home.

## The product

A single small CLI (with optional VS Code-friendly output) that does four
things, in order:

1. SCAN — detect the machine honestly: Apple Silicon unified memory (Metal
   working-set limit), Intel Mac (CPU-only budget), NVIDIA VRAM, free disk.
2. FIT — honest memory math per model/quant/context (weights + KV cache +
   overhead vs. real budget), a curated catalog of coding-and-tool-call-capable
   GGUF models, verdicts: comfortable / tight / partial-offload / cpu-only /
   won't-fit, with measured tokens/sec expectations.
3. SERVE — download (resumable, SHA-256-verified) and run llama-server with
   the CORRECT flags: right context size, right chat template (--jinja),
   right GPU layers. llama-server natively exposes Anthropic Messages API +
   OpenAI APIs + tool calling (verified on master README 2026-07-24).
4. CONNECT — one command that wires an agent to the local endpoint:
   prints/exports ANTHROPIC_BASE_URL for Claude Code, writes config for
   OpenCode/Aider/Cline/Goose, applies tool-count and context guardrails that
   the research shows are the difference between "unusable" and "works".

True open source (Apache-2.0). No accounts, no telemetry, no paid tier.

## Why us / why now

- llama.cpp ships tiny prebuilt binaries for macOS arm64 + x64, Linux, and
  Windows (verified: release b10107, 2026-07-24) — zero-compile installs.
- llama-server's Anthropic-compatible endpoint is NEW and largely unexploited:
  the 36k-star claude-code-router ecosystem was built to translate APIs; that
  translation layer is now optional. The window to be "the tool that makes it
  just work" is open.
- Athanor Lite proves the fit-math UX but fenced it (Windows, non-commercial
  license). A clean-room, cross-platform, truly-OSS re-implementation with an
  agent bridge is both legal (their license permits study) and differentiated.

## Risks (kept visible)

- R1: Anthropic's position on pointing Claude Code at non-Anthropic backends
  is publicly unanswered (anthropics/claude-code #5577 closed without answer).
  Mitigation: Claude Code is ONE of several first-class connect targets; the
  product is equally useful with fully-open CLIs (OpenCode, Aider, Goose).
- R2: Small local models are genuinely weaker than frontier models; a 16 GB
  MacBook Air runs ~7B-14B Q4. Mitigation: honesty is the brand — we show
  measured tok/s and set expectations, never promise Claude-quality output.
- R3: Ollama or LM Studio could ship "fit" natively. Mitigation: our moat is
  the agent-bridge + guardrails combination and OSS trust, not fit math alone.

## Scope for the MVP (this run)

- CLI in a single portable language runtime (decided in DESIGN.md).
- macOS Apple Silicon fully working end-to-end on this machine (M4, 16 GB);
  macOS Intel and Linux code paths implemented with honest CPU budgets;
  Windows path designed but untested (no Windows machine available - logged).
- Curated catalog: ~8-12 coding/tool-calling models with verified metadata.
- Connect targets in MVP: Claude Code (env vars) + OpenCode + Aider configs.

---

## ADDENDUM 2026-07-24: pivot after adversarial review (see research/SKEPTIC.md)

The claim "nobody occupies the intersection" was FALSIFIED by the skeptic pass:
AlexsJones/llmfit (30.6k stars, verified via GitHub API) ships hardware-aware
fit + launch; luongnv89/ccl (37 stars) wires Claude Code to local runtimes;
Ollama >= 0.14 natively speaks the Anthropic API.

Surviving, sharpened thesis: FIT IS SOLVED, TRUST IS NOT. Every researched
pain point is a silent agentic failure on a model that "fits" (OpenCode #7030,
Goose #6688/#6883, Cline #4362, Continue #9157). No tool verifies, on the
user's actual machine, that a model/quant/context combination can reliably
execute agentic tool calls before wiring an agent to it. magix-box's product
is that proof: a 90-second on-machine agentic readiness exam (mb doctor) whose
output is a graded, reproducible verdict and a verified agent config.
Fit math, download, and serve remain as plumbing that makes the exam one
command. Differentiation vs llmfit: they answer "does it fit"; we answer
"does it work — and here is the transcript."
