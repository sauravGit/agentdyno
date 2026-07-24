# magix-box Build Log

Mission: research, design, build, brand, and package an open-source, local-first
"Claude Code for any open model" system inspired by BBALabs/athanor-lite, running
on macOS (Intel + Apple Silicon) and other platforms. Fully autonomous run; every
decision and self-answered question is logged here.

Format: each entry = date, decision/question, answer, why, evidence.

---

## 2026-07-24

### D-001: Verified the upstream repo exists
- Fact: https://github.com/BBALabs/athanor-lite exists (GitHub API id 1289855202).
  Description: "Free GPU detection and local AI model manager. Scans your hardware,
  recommends compatible models, and handles download + launch in one click."
- Cloned shallow copy to research/upstream/athanor-lite for study.
- Key facts from README/docs/ARCHITECTURE.md: Windows-only, Tauri 2 (Rust) +
  React 19 + Vite + Zustand, llama.cpp llama-server sidecar, NVML/WMI/registry
  GPU detection, curated GGUF catalog (~15 entries) with per-quant fit verdicts,
  resumable SHA-256-verified downloads, Ollama library adoption via hard links,
  proprietary-ish source-available license (personal/evaluation use).
- Implication: we cannot copy code (license is NOT open source), but we can
  study the architecture and re-implement independently under a real OSS license.

### Q-001: The skill expects an outline.yaml; none exists. Ask user?
- Answer: No. Mission says never ask. I bootstrap the outline myself
  (research/outline.yaml + fields.yaml) and proceed with the research-deep
  fan-out pattern.

### Q-002: Advisor review before committing to approach?
- Attempted; advisor tool is disabled for this conversation. Proceeding on own
  judgment, consistent with the autonomy mandate.

### Q-003: Batch approval between research batches (skill says ask)?
- Answer: Mission autonomy overrides; run batches without approval, log progress.

### D-002: License analysis of athanor-lite (read LICENSE firsthand)
- Source-available, non-commercial: view/study/evaluate OK, personal builds OK,
  redistribution and commercial use PROHIBITED, derivative works prohibited
  without permission.
- Decision: clean-room re-implementation. We study the architecture (explicitly
  permitted: "view, study, and evaluate") but write all code from scratch under
  Apache-2.0 or MIT. No code, assets, or text copied. Log kept of what was
  studied: README.md, docs/ARCHITECTURE.md, models/recommend.rs (fit-math
  approach), directory layout.

### D-003: Athanor's fit-math model (studied, to be re-derived independently)
- mem(ctx) = weights_gb + overhead_gb + kv_per_token * ctx, kv derived from
  catalog minMemGb at 8K reference context. GPU budget = NVIDIA CUDA VRAM only;
  CPU budget = half of system RAM. Verdicts: comfortable (>=15% headroom),
  tight, partial-offload, cpu-only, exceeds.
- Gap we must solve: Apple Silicon unified memory has no separate VRAM; Metal
  working-set limit is a fraction of RAM. Their NVIDIA-only budget is exactly
  why the tool is Windows-only. Our fit engine must model unified memory,
  Intel Macs (no Metal LLM accel worth using -> CPU budget), and Linux/NVIDIA.

### D-004: Reference target machine profiled
- This machine: MacBook Air, Apple M4, 10 cores (4P+6E), 16 GB unified RAM,
  282 GiB free disk. A mid-tier consumer target: ~7B-14B Q4 GGUF territory.

### Research fan-out launched
- 4 web-search-agents in background, 3 items each, results land in
  research/results/*.json validated by research/validate_json.py.
- Deviation from skill: validator script did not exist in the skill directory;
  wrote a minimal local one (research/validate_json.py).

### D-005: Load-bearing technical facts verified firsthand
- llama.cpp release b10107 (published 2026-07-24) ships prebuilt binaries for
  macos-arm64 AND macos-x64 (~11 MB each), plus ubuntu-x64/arm64 and Windows
  CPU/CUDA/Vulkan. Source: api.github.com/repos/ggml-org/llama.cpp/releases/latest.
  => zero-compile install path exists on every target platform.
- llama-server (tools/server/README.md on master, fetched today) documents:
  "Anthropic Messages API compatible chat completions" (section: Anthropic-
  compatible API Endpoints), OpenAI-compatible /v1/chat/completions and
  /v1/responses, and "Function calling / tool use for ~any model" via --jinja.
  => Claude Code can target a local llama-server via ANTHROPIC_BASE_URL with no
  translation proxy. This is the product's spine: hardware-aware model pick +
  managed llama-server + one command to wire any agent CLI/IDE to it.

### Research results: batch 1 (3 of 4 agents complete)
- Cline/Roo, Continue, claude-code-router: plumbing to point Claude Code at
  local backends exists (ANTHROPIC_BASE_URL -> Ollama >=0.14 / LM Studio /
  llama.cpp /v1/messages), but tool-call fidelity with local models is the
  universal failure mode; none of them do hardware-aware model fit. Roo Code
  archived May 2026; Continue.dev acquired by Cursor June 2026, repo read-only.
- Ollama: no "what fits my machine" answer (open issue #14771 proposes
  `ollama fit`), VRAM detection OOMs (#13018, #10114), paid Turbo/Cloud pivot
  criticized. LM Studio: closed source is the top complaint; dropped Intel Macs.

### C-001 CONFLICT RESOLVED: does llama-server speak Anthropic /v1/messages?
- Runtime agent claimed no Anthropic API + missing /v1/responses (issue #19138).
- Firsthand primary source (tools/server/README.md on master, fetched
  2026-07-24) documents BOTH "Anthropic-compatible API Endpoints" and
  "POST /v1/responses". Router agent independently confirmed /v1/messages.
- Ruling: README on master wins; issue #19138 predates the feature. Recorded
  so the thesis does not repeat the stale claim.

### Q-004: research-report skill asks which TOC summary fields to show
- Answer (self): category | license | popularity. Report generated:
  research/REPORT.md (12 items, 43 source URLs).

### D-006: Product thesis written (THESIS.md)
- Core: hardware-aware fit + correct llama-server launch + one-command agent
  wiring (Claude Code via native Anthropic endpoint, plus OpenCode/Aider).
- Risks R1-R3 recorded, incl. unanswered Anthropic ToS question (#5577):
  mitigated by making open CLIs first-class targets.
- Skeptic agent launched in background to attack the thesis before build.

### D-007: Implementation language = TypeScript/Node >= 20
- No Go/Rust toolchain on this machine (verified); Node 25 + Python 3.14 present.
- Target users of the Claude Code bridge already run Node (Claude Code
  requires it) => npm/npx distribution is zero-friction and cross-arch.
- Full rationale in docs/DESIGN.md. Rejected Rust/Go/Python with reasons.

### D-008: Fit math derived independently (docs/DESIGN.md)
- kv_gb computed from real GGUF geometry (layers, kv_heads, head_dim) rather
  than back-solving from a vendor minMemGb like athanor does — more honest and
  extensible; reports "max comfortable context", the number agent users need.
- Apple Silicon GPU budget: 65% of RAM default (iogpu.wired_limit_mb=0 on this
  machine confirms kernel-default mode); to be validated empirically in bench.

### D-009 PIVOT: skeptic falsified "nobody occupies the intersection"
- Skeptic found AlexsJones/llmfit — verified firsthand via GitHub API:
  30,581 stars, MIT, Rust, created 2026-02-15, pushed 2026-07-23.
  "One command to find what runs on your hardware." SCAN+FIT is occupied.
- luongnv89/ccl verified: 37 stars, Python, wires Claude Code/Codex to local
  runtimes via llmfit. CONNECT exists but has no verification and no traction.
- Ollama >= 0.14 speaks Anthropic Messages API natively (two independent
  researcher confirmations).
- Skeptic verdict: PIVOT. Accepted. New wedge: VERIFICATION. Memory fit does
  not equal agentic competence (skeptic's feasibility evidence: model choice
  dominates tool-call reliability; every researched pain point is a SILENT
  agentic failure). Nobody benchmarks "does agentic coding actually work on
  this machine" per-model, per-quant, per-context.
- Product reframe: mb doctor = launch candidate, run tool-calling probe
  battery (edit-file probe, multi-tool probe, long-context probe), grade A-F
  with tok/s, then mb connect writes the VERIFIED config. scan/fit/pull/serve
  retained as plumbing. THESIS.md updated with addendum, not rewritten —
  the falsified claim stays visible with the correction, per fact-check rules.
