# What would make AgentDyno feel like a category, not "another llmfit"?

Deep research across 8 angles (4 parallel agents, 2 items each), every claim
traced to a fetched URL, uncertain evidence explicitly flagged in each
result file. Raw JSON: [`results/`](results/). This report is the synthesis
and the prioritized call.

## The core answer

llmfit answers "does it fit." Every other local-AI tool researched here
(Ollama, LM Studio, Continue.dev, Aider) answers "can I run/edit with it."
**Nobody in this space verifies agentic tool-calling reliability on a
specific user's own hardware and treats that verification as a first-class,
shareable artifact.** That's the actual gap, confirmed independently across
all 8 research angles — not a feature AgentDyno is missing, but a category
nobody else occupies. The recommendation below is about making that gap
undeniable, not about adding features for their own sake.

## Tier 1 — build these; each is a genuine step-change, not polish

### 1. Grammar-constrained "fixer" mode (turn a passive grader into an active fixer)
llama-server already accepts `grammar`/`json_schema`/`response_format` —
confirmed live and via llama.cpp's own docs. AgentDyno's exam currently
*reports* that a model fails P1-P3 (malformed tool calls). It could instead
**re-run the failing probe through the same 127.0.0.1:8403 gateway with a
schema derived from the tool signature, forcing well-formed output**, and
report a dual grade: unaided vs. harness-assisted. This directly answers the
"grade-F model is unusable" problem from earlier in this project's own
BUILD_LOG — turning some real F-grade models into usable ones by
construction. No other local-model tool does this. Real caveat, stated
plainly: grammar guarantees *structure*, not *correctness* — a forced-pass
measures the harness assisting, not the raw model, and must be labeled as
such, never conflated with the unaided grade.
**Effort: small-to-medium.** [`grammar_constrained_structured_output_decoding.json`](results/grammar_constrained_structured_output_decoding.json)

### 2. Self-published leaderboard, Aider-style
Aider's own model leaderboard (self-run, reproducible, cost-per-run
disclosed) is the single most-cited precedent for what actually built
trust and traffic in this exact space — confirmed via Aider's own repo/docs.
AgentDyno already computes everything a leaderboard needs (`dyno doctor`'s
grade, tok/s, hardware tier from `dyno scan`). The gap-naming move: don't
try to compete with SWE-bench/Terminal-Bench (multi-hundred-task, Docker,
frontier-API-key, cloud-oriented — confirmed via their own docs) — name that
gap explicitly as the reason a laptop-local tool exists at all, and publish
a static leaderboard page scoped to what AgentDyno actually measures:
tool-calling reliability, on real consumer hardware, for the models people
can actually run.
**Effort: small.** [`existing_agentic_coding_benchmark_standards.json`](results/existing_agentic_coding_benchmark_standards.json)

### 3. Opt-in crowdsourced verified-compatibility database
The precedent is real and already reaching this exact space:
`llm.aidatatools.com` auto-submits Ollama benchmark results to a public,
comparable database across Apple Silicon/NVIDIA/CPU — the closest direct
analog found. `dyno doctor` already emits the exact
`model + hardware + agent-target + pass/fail` triple this pattern is built
from; `connect` (Goose/Cline) adds a third axis — **agent compatibility** —
that no existing hardware-fit database has. This is the answer that's
structurally hardest for llmfit or any pure calculator to copy quickly: it
compounds as a data asset over time, not just a feature. Real, stated
costs: an opt-in consent flow (hardware fingerprints are PII-adjacent), a
hosted backend, and submission moderation — this moves AgentDyno from
"purely local tool" to "also operates a small hosted service," a real
scope and trust decision, not a rubber stamp.
**Effort: medium.** [`crowdsourced_verified_compatibility_databases.json`](results/crowdsourced_verified_compatibility_databases.json)

## Tier 2 — strong, sequence after Tier 1

### 4. Speculative-decoding verification harness (measure, don't just enable)
mlx-lm and llama.cpp both support speculative decoding today (draft models,
`--spec-draft-model`, confirmed via mlx-lm's SERVER.md and llama.cpp docs).
Real-world gains are uneven — 2-3x on some coding workloads, literally zero
on some model pairs, confirmed via fetched community benchmarks (GPU-class
evidence; Apple-Silicon-specific magnitudes are `[uncertain]`, not fetched).
The differentiated move isn't adding speculative decoding — Ollama/LM
Studio could do that too — it's **AgentDyno empirically measuring per-machine
tok/s with vs. without a draft pair and refusing to enable it when it
regresses.** A static toggle every other tool ships; an honest, verified
toggle only AgentDyno's positioning supports.
**Effort: small-to-medium** (harness) **/ medium-to-large** (full MLX backend). [`mlx_speculative_decoding_performance.json`](results/mlx_speculative_decoding_performance.json)

### 5. Hugging Face model-card badges
HF model cards natively support arbitrary tags, a `model-index` eval-results
block with an external `source`, and inline badge images — confirmed via
HF's own docs and a live GGUF repo (`bartowski/Qwen2.5-7B-Instruct-GGUF`)
already carrying voluntary attribution badges. AgentDyno already generates
HTML certificates; a `dyno publish` command could template a
verification badge + `model-index` block. Real caveat: it's a **self-issued**
badge with no third-party trust, and PR-injecting into other people's repos
reads as spam — realistically limited to the user's own repos/forks at
first. Distribution value, not a credibility shortcut.
**Effort: small-to-medium.** [`model_card_ecosystem_trust_badges.json`](results/model_card_ecosystem_trust_badges.json)

### 6. Market the stable gateway as the adoption surface
Ollama's most-cited growth lever (confirmed via TechCrunch coverage) is
exactly what AgentDyno already has: a drop-in OpenAI-compatible local
endpoint. The pitch AgentDyno can make that Ollama can't: *"point any
OpenAI-API tool at 127.0.0.1:8403/v1 and get a backend that's been verified
to actually tool-call reliably, not just respond."* Mostly a docs/outreach
effort (get listed in Goose/Cline/Continue's own "connect to a local
backend" docs), not new code.
**Effort: small.** [`growth_case_studies_oss_local_ai_tools.json`](results/growth_case_studies_oss_local_ai_tools.json)

## Tier 3 — real, but narrower audience or bigger lift; sequence later

### 7. "AgentDyno CI" — GitHub Action for regression detection
Real precedent (promptfoo's Action, DeepEval's pytest gate, garak — 8.6k
stars, used by Microsoft/NVIDIA/Cisco per garak's own repo) but every one of
them assumes a remotely-reachable endpoint on `ubuntu-latest`. **None runs a
local-weights-plus-runtime exam** — that gap is real and AgentDyno-shaped,
but the buyer is narrower (teams shipping local models, not individual
developers) and it needs a self-hosted runner plus taming exam
non-determinism to avoid flaky red builds.
**Effort: medium.** [`ci_regression_testing_llm_eval.json`](results/ci_regression_testing_llm_eval.json)

### 8. Recurring leaderboard content ("this week's grade-A models")
dubesor's manual benchmark (347 models over ~2 years, confirmed via the
project's own retirement note: "whatever comes next must be automated")
is the cautionary tale here — manual hardware testing is the treadmill that
kills recurring content formats. AgentDyno's exam is already automated,
which is exactly the missing piece dubesor's format lacked — but sustaining
a cadence still costs real operator time to run new models on real
hardware each cycle.
**Effort: medium**, ongoing operator cost is the real constraint, not build cost. [`leaderboard_bakeoff_content_formats.json`](results/leaderboard_bakeoff_content_formats.json)

## What NOT to build

Don't try to reproduce SWE-bench Verified, Terminal-Bench, or BigCodeBench
inside AgentDyno — all three are Docker/cloud-oriented, hundreds of tasks,
frontier-API-key-dependent (confirmed via their own repos). That's not a gap
to close; it's the reason a laptop-local, seconds-to-minutes tool has a
reason to exist at all. Naming that explicitly in positioning is worth more
than attempting a stripped-down "SWE-bench lite for local models" — nobody
will believe a shrunk-down version competes with the original on its own
terms.

## Suggested sequencing

1. **Ship #2 (self-published leaderboard)** first — smallest effort,
   directly reuses existing `dyno doctor`/`dyno fit` output, immediate
   legitimacy signal.
2. **Ship #1 (grammar-constrained fixer mode)** next — the most novel
   technical claim, directly fixes this project's own documented F-grade
   pain point, and is genuinely something no competitor offers today.
3. **Design #3 (crowdsourced database)** as the compounding, longer-term
   moat — start with the consent/anonymization design before writing the
   backend, since that's the part most likely to go wrong if rushed.
4. Treat #4-#6 as opportunistic follow-ups once #1-#3 are live; treat #7-#8
   as backlog, not near-term.
