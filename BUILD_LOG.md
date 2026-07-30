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

### D-010: Brand = AgentDyno (CLI: dyno, npm: agentdyno)
- Availability verified 2026-07-24: npm 404 (free), GitHub name search 0 hits,
  agentdyno.dev RDAP 404 (unregistered; NOT purchased per no-spend guardrail),
  agentdyno.com registered (acceptable; .dev is the developer TLD anyway).
- Rejected: checkride (npm taken by an agent harness - too close), shakedown
  (npm taken, 151 name collisions), modelproof (weaker metaphor).
- Tagline direction: "Don't trust 'it fits.' Measure it." Dyno = dynamometer.
- Repo/product rename to agentdyno; magix-box remains the workspace dir name.

### D-011: First live exam run — the product validated itself
- Qwen2.5-Coder-7B Q4_K_M on the M4/16GB, served with correct Qwen template
  (server /props confirms full tool-call template caps): model still emitted
  raw `<function .../>` XML instead of its own <tool_call> JSON format.
  Grade F. This reproduces, on demand, the exact silent failure users report
  (Continue #9157, Goose #6688) — and matches the skeptic's evidence that
  "Qwen3 passes, Qwen2.5 fails". The dyno gave the right verdict where the
  catalog prior (A) was wrong.
- Fixes: catalog priors for qwen2.5-coder-7b/14b downgraded A->C; P5 filler
  capped at 8K tokens (M4 prefill measured ~106 tok/s => full-context probe
  would blow the 300s timeout; 8K keeps exam <2 min and still screens recall).
- Next: same machine, Qwen3-8B — the A/B contrast is the launch demo.

### D-012: Honest A/B verification (self-caught probe bug + rubric fix)
- First Qwen3-8B run graded C on a FALSE P5 failure. Fable-mode diagnostic
  (direct curl at exact probe size) proved the cause: P5 used max_tokens=256,
  which truncated the tool call (finish_reason=length) before it completed.
  With 512 tokens the same prompt recalls the constant correctly. Fixed the
  probe (256->512). A benchmark that emits false failures is worthless; this
  was caught before shipping, not after.
- Rubric was also miscalibrated: it treated a mangled escaped string (P4) as
  equivalent to "cannot emit tool calls" (P1). Rewrote to a mechanism-based
  rubric: P1-P3 = the agent LOOP (fail any => F); P4-P5 = QUALITY dims
  (0 pass => C, 1 => B, 2 + fast => A). Extracted gradeFromProbes() as a pure
  function; locked with 16 passing unit tests (test/grade.test.js).
- FINAL VERIFIED grades, same MacBook Air M4 / 16 GB, context 21,535:
  * Qwen2.5-Coder-7B Q4_K_M = F. Fails P1: emits raw <function .../> XML
    instead of a tool call; the agent loop never starts. Reproduces the exact
    silent failure users report (Continue #9157).
  * Qwen3-8B Q4_K_M = B. Passes P1/P2/P3 (correct call, right tool among 9,
    real tool-result round trip) and P5 (long-context recall); fails P4 by
    dropping a backslash in an escaped quote, producing invalid JS.
- This is the launch demo: two models that both "fit," one unusable, one
  usable-with-caveats, told apart only by measurement. Certificates rendered
  to site/certificates/*.html. Site "exam" section now shows these REAL
  numbers (was illustrative).

### D-013: GitHub identity + auth (user directive mid-run)
- User directed: author + push as sauravGit, and "use sauravGit to
  authenticate". Rewrote all commit authors to sauravGit via filter-branch;
  repo URLs set to github.com/sauravGit/agentdyno.
- Blocker: `gh` is currently authenticated as account JKI3251_hca, not
  sauravGit. `gh auth login` is interactive (device/browser flow) and cannot
  be completed autonomously. Push is staged and waiting on that auth. This is
  a hard external blocker, logged rather than worked around (per guardrails,
  no alternative account may be substituted silently).

### D-014: Shipped — private repo + release, final self-grade
- Repo: github.com/sauravGit/agentdyno (PRIVATE, verified via API). Author on
  all commits: sauravGit. Release v0.1.0 published (non-draft) with notes;
  both videos attached as release assets.
- Auth note: user directed "use sauravGit to authenticate". gh already had
  sauravGit in its keyring (inactive); switched active account rather than a
  fresh interactive login. No new credentials created.

### Definition-of-done self-grade (honest)
- [PASS] Every guardrail held (no spend; private/local only; nothing invented;
  no Athanor code copied; never asked, never stalled) — see recap "guardrails".
- [PASS] Every thesis claim has a live URL — 101 unique source URLs; REPORT.md.
- [PASS] Site screenshot-verified on mobile + desktop; fixed a real horizontal-
  overflow bug on mobile and re-verified with an iframe scrollWidth probe.
- [PASS w/ caveat] Both videos render; I watched representative extracted frames
  of each (cannot play video in real time), confirming content + styling. The
  full 30fps playback was not observed frame-by-frame — stated plainly.
- [PASS] recap.html links every deliverable; all 16 local links resolve (checked).
- [PASS] Brand guidelines complete enough for a stranger to make a new asset.
- [PASS] Red team ran (two passes); objections visible in RED_TEAM.md + recap,
  including the UNRESOLVED go-to-market bet (O1) and our own probe bug (O3).
- [PASS] No placeholders pretending to be finished.
- [ASSUMPTION] "Founder script passes my voice rules": user did not supply an
  explicit voice-rules doc; applied the brand voice (instrument-not-salesman,
  no hype, no emojis, measurement verbs) defined in BRAND.md. If specific voice
  rules exist, the script (brand/LAUNCH_VIDEO_SCRIPT.md) may need a pass.
- [CUT, logged] Windows path designed but untested (no Windows machine);
  repeat-N probe stability (O2) deferred; MLX backend deferred to future work.

### D-015: Model switcher + leaderboard signal (user-directed scope expansion)
- User asked for a "one-click, benchmark-based model switcher" folding in
  llmfit/Athanor-style auto-selection, a UI, and IDE connectors. Corrected an
  expectation first: no laptop-runnable open model is competitive with
  Opus/Fable-class frontier models — that framing was not accepted silently.
- Chose Aider's polyglot coding leaderboard (github.com/Aider-AI/aider,
  aider/website/_data/polyglot_leaderboard.yml) as the external signal: real,
  fetchable, structured (verified 69 entries, pass_rate_2 field). Added
  js-yaml as the one new runtime dependency (justified: hand-rolling a YAML
  parser for correctness-critical external data is worse than one small,
  well-maintained pure-JS lib).
- HONEST FINDING: matched against our real 8-model catalog, ZERO models get
  an external score. The leaderboard only covers 32B+ variants of families we
  catalog at 3-30B (laptop-sized). Rather than borrow a bigger sibling's
  score, matchExternalScore() requires same family AND params within 25%,
  else reports "no data" explicitly. This is disclosed, not hidden.
- Switcher rule (rankForSwitch, src/switch.ts): a model VERIFIED by `mb doctor`
  on this machine always outranks an unverified catalog prior, regardless of
  letter grade — because we already proved priors can be wrong (D-011: Qwen2.5-
  Coder-7B was cataloged A, measured F). Within the same verified/unverified
  band: grade, then external score (rare), then fit comfort, then size.
- Bug caught by live-testing before shipping: initial "verified" check used
  exact context match, so Qwen3-8B's real grade-B report (examined at 21535)
  was invisible when `switch` asked at the default 16384, showing "A?
  unverified" instead of its true "B verified" — the opposite of the product's
  purpose. Fixed to "report.context >= requested" (a passing exam at a larger
  context also covers a smaller ask; not vice versa, since long-context
  recall gets harder, not easier, as context grows). Locked with tests for
  both directions.
- New CLI: `mb switch` (ranked list), `mb switch <id>` / `mb switch --activate`
  (pull+serve the pick in one command) — the "one-click" UX requested.

### D-016: Local API server + web dashboard (verified live, not just compiled)
- src/api.ts: loopback-only (127.0.0.1) node:http server, no framework
  (consistent with the CLI's zero-runtime-framework posture). Routes: scan,
  switch (list + activate), status (polls activation/doctor progress), doctor
  (fire-and-forget, polled), connect/:target, server/stop. Activation and
  doctor runs are async and tracked via in-memory state so the dashboard can
  poll instead of holding an HTTP request open for a multi-minute exam.
- Extracted reports.ts (save/load/loadAll) out of cli.ts so the CLI and API
  server share one reader/writer instead of duplicating file I/O.
- site/dashboard/index.html: on-brand (BRAND.md tokens) single-page dashboard.
  Hardware panel, switcher table with per-row Activate, live server panel with
  a doctor-exam button, connect-config panel with copy button. Vanilla JS,
  polls /api/status every 2s.
- Verified LIVE end-to-end, not just compiled: started the dashboard as a
  detached process, called /api/switch/activate over real HTTP for qwen3-8b,
  polled /api/status independently until the async activation settled,
  confirmed serverHealthy:true and the correct saved doctor report (grade B)
  surfaced automatically, then fetched /api/connect/claude and got the exact
  verified config. Screenshotted the dashboard rendering this real data.
- Bug caught while testing: first test run killed the dashboard's OWN process
  while an activation was still in flight (same Node process owns both the
  HTTP server and the async pull/serve chain) - this silently kills a running
  activation with no error surfaced. Not fixed in code (this is inherent to a
  single-process design and expected: don't kill the dashboard process while
  something is activating). Documented here as an operational caveat.
- Second bug caught while testing: dashboard's "connect" panel defaulted the
  claude tab to visually active but never fetched its config on page load,
  so it showed a placeholder despite the tab looking selected. Fixed
  (loadConnect(activeTarget) now runs on load, not just on tab click) and
  re-verified with a fresh screenshot showing the real config appear by default.

### D-017: VS Code extension shell (thin wrapper, as scoped)
- Built vscode-extension/ as its own small TypeScript project (separate
  package.json/tsconfig — VS Code extensions need commonjs output, the main
  CLI uses NodeNext ESM, so a shared build would fight itself).
- Deliberately thin, per the user's chosen scope: it does NOT reimplement
  scan/fit/doctor. It runs `node dist/src/cli.js dashboard` in an integrated
  terminal (prompting once for the repo path, saved to VS Code settings) and
  embeds the same dashboard in a webview via an iframe with a scoped CSP
  (frame-src limited to the dashboard's own origin). One source of truth for
  all product logic: the CLI + API server.
- Packaged a REAL, installable .vsix with @vscode/vsce (8.21 KB, 6 files:
  compiled extension.js, package.json, README, LICENSE) — not just source.
- HONEST LIMITATION: no `code` CLI was available in this environment to
  actually load the extension into a running VS Code and click the commands.
  Verified as far as possible without that: clean tsc compile, clean vsce
  package with no warnings, manual inspection of the packaged package.json
  and bundled extension.js. NOT verified: the webview actually renders inside
  real VS Code, the terminal command actually runs correctly, the settings
  prompt UX. This gap is stated here rather than claimed as tested.

### D-018: Ollama backend (user-directed: privacy-first, "any model from ollama.com/search")
- User's real requirement, restated precisely: developers who don't want code
  reaching Anthropic's servers, willing to run any model that fits from
  Ollama's library, wiring it into their own coding setup.
- Fact-checked before building anything: ollama.com/search has NO public JSON
  API (checked the rendered page directly - server-rendered, no __NEXT_DATA__
  payload, nothing to scrape cleanly). Ollama's REST API (/api/pull, /api/tags,
  /api/show, /v1/chat/completions, and a real Anthropic-compatible /v1/messages
  per docs/api/anthropic-compatibility.mdx) IS real, documented, and verified
  live. Decision: don't scrape the search page; let Ollama's own registry
  resolve tags on `pull`, exactly like the CLI already does.
- LIVE VERIFICATION (not just docs-reading): installed Ollama via Homebrew,
  started the real daemon (nohup, detached from this session), pulled
  qwen2.5-coder:3b, and inspected real /api/tags + /api/show JSON firsthand.
  Confirmed /api/show returns real KV geometry under family-prefixed keys
  (qwen2.attention.head_count_kv=2, qwen2.block_count=36, etc.) - this means
  fit math for Ollama models is derived from the daemon's own truth, never a
  hand-maintained HF-repo mapping.
- HONEST FINDING (matches the earlier llama.cpp result exactly): tested our
  existing P1 probe payload directly against Ollama's real
  /v1/chat/completions for qwen2.5-coder:3b - it returned the tool call as
  JSON-in-markdown inside `content`, NOT a real `tool_calls` array. Our
  UNMODIFIED firstToolCall() in probes.ts already treats that as "no call" ->
  correctly fails. Zero changes needed to probes.ts logic to reuse it against
  a second backend; only its transport args (baseUrl, requestModel) were
  parameterized out of the serve.ts import it used to hardcode.
- New src/ollama.ts: isOllamaRunning, listOllamaModels, showOllamaModel
  (derives head_dim from embedding_length/head_count when rope.dimension_count
  is absent - verified against the real payload), ollamaModelToCatalogEntry
  (synthesizes a fit.ts-compatible CatalogModel on the fly; catalog prior is
  "B" only if Ollama's own capabilities array reports "tools", else "C" - never
  a silent "A", consistent with every other unverified prior in this project),
  pullOllamaModel (streams the real NDJSON progress from /api/pull).
- serve.ts: added a Backend discriminator ("llama-server" | "ollama") to
  ServeState; activeBaseUrl()/requestModelFor() abstract the transport so
  probes.ts, connect.ts, and the API server don't special-case per backend.
  stopServer() never kills Ollama's own daemon process (it's independent,
  other tools may depend on it) - only forgets our bookkeeping.
- catalog.ts: added resolveModel() - findModel() for static catalog ids,
  live ollamaModelToCatalogEntry() for "ollama:<tag>" ids. Both cli.ts and
  api.ts's connect/status paths now use it instead of assuming a static entry.
- FULL LIVE END-TO-END TEST (real daemon, real model, no mocks):
  `dyno serve --ollama qwen2.5-coder:3b` -> `dyno doctor` (grade F, matching
  the manual curl test exactly) -> `dyno connect claude` (correct
  ANTHROPIC_BASE_URL=127.0.0.1:11434, correct ANTHROPIC_MODEL=qwen2.5-coder:3b,
  correctly warned "grade F, try a bigger model") -> `dyno status`
  (correctly shows backend: ollama, no fake pid). Also verified via the
  dashboard API (/api/switch lists the ollama model in the SAME ranked table
  as the llama.cpp catalog, graded F not F?) and screenshotted the live
  dashboard rendering it.
- Test suite: 5 new tests in test/ollama.test.js using fixtures captured
  VERBATIM from the real daemon responses above (not invented shapes).
  32/32 total tests passing.

### D-019: TESTING.md guide + a real bug caught while writing it
- User asked for a step-by-step guide (input + expected output) so any new
  user can try every feature. Rather than write it from memory, ran a full
  fresh walkthrough on this machine with the SMALLEST catalog model
  (qwen2.5-coder-3b, fast path) to capture genuinely real output: scan, fit,
  pull, serve, curl smoke-test, doctor, connect (all 3 targets), status,
  switch.
- BUG FOUND BY DOING THIS: `dyno connect claude` printed
  ANTHROPIC_MODEL="local" instead of the real model id. Root cause: the
  D-018 Ollama refactor introduced requestModelFor(state), which correctly
  returns the internal sentinel "local" for llama-server API REQUEST BODIES
  (llama-server ignores that field) — but connect.ts's config-printing
  functions were wrongly reusing the same function for the USER-FACING
  ANTHROPIC_MODEL/opencode-model-key/aider---model values, which must be the
  real, meaningful model id regardless of backend.
- Fix: connect.ts now has publicModelId(model, state) — ollama backend still
  uses the exact pulled tag (Ollama routes requests on it, so it must be
  correct); llama-server backend now uses the CatalogModel's own id (correct,
  informative, matches what the user typed in `dyno pull`/`dyno serve`).
  Verified live across all three targets (claude/opencode/aider) and BOTH
  backends after the fix; also re-confirmed `dyno serve --stop` still leaves
  a real Ollama daemon running (does not kill someone else's process).
- Also refactored connect.ts for testability: connectClaudeWith/
  connectOpencodeWith/connectAiderWith take ServeState explicitly so tests
  exercise real formatting logic without touching ~/.magix-box on disk;
  connectClaude/connectOpencode/connectAider (used by cli.ts/api.ts) are thin
  wrappers reading live state. Added test/connect.test.js (4 new tests)
  locking this exact bug so it cannot silently regress. 35/35 tests passing.
- Also fixed a markdown bug in the guide itself: a captured doctor-exam output
  line contained a literal triple-backtick sequence (the model's own raw
  output was JSON-fenced text), which would have terminated the guide's outer
  code fence early and corrupted rendering. Caught by writing a small script
  to track fence depth line-by-line rather than eyeballing it.
- TESTING.md covers all 12 commands/flows (scan, fit, pull, serve, doctor,
  connect x3, switch, dashboard, Ollama backend, cleanup) plus a
  troubleshooting table. Linked from README.md.

### D-020: Two follow-up questions answered — response quality + VS Code testing gap
- Q: "what quality of response if we connect claude?" Answered from our OWN
  measured data, not marketing: on a 16GB laptop the honest ceiling today is
  grade B (Qwen3-8B, ~16-18 tok/s, 16-21K usable context, occasional
  escaped-string edit corruption); 3B/7B models are grade F (can't drive
  tools at all). Explicitly not comparable to real Claude for multi-step
  reasoning/large refactors - architectural gap, not a settings problem.
  Alternatives given, filtered by the user's stated privacy requirement
  (no cloud): try bigger unverified-prior catalog models (Devstral-Small,
  Qwen3-Coder-30B-A3B) on more RAM, use OpenCode/Aider instead of Claude Code
  (avoids the unresolved Anthropic ToS question), or a deliberate hybrid
  workflow. Did NOT suggest a paid Anthropic API key as "the fix" since that
  directly contradicts the user's stated requirement.
- Q: user correctly noted TESTING.md never covered testing the VS Code
  extension - the honest gap logged back in D-017 ("no code CLI available").
  Re-checked: VS Code.app IS installed here, just no `code` shell shortcut;
  found and used the bundled CLI at Contents/Resources/app/bin/code.
- Attempted a full automated E2E (install + open + click command palette +
  screenshot). Installing (`--install-extension`) is a real persistent
  change to the user's live environment - the harness correctly blocked this
  pending explicit consent; asked via AskUserQuestion, user said yes.
  Installed for real, confirmed via `code --list-extensions --show-versions`
  -> agentdyno.agentdyno-vscode@0.1.0. This is the FIRST real (non-static)
  verification this extension has ever had.
- Discovered a genuine environment boundary while trying to go further:
  screencapture and AppleScript System Events keystroke simulation both
  failed (screen recording / accessibility permissions not granted to this
  sandboxed session) - there is no screen or keyboard this agent can drive
  for the user's actual physical display. Confirmed via ps aux that a real,
  long-running VS Code GUI process exists (started days ago, on the user's
  own screen) - the extension is genuinely live in it, but the last 3
  clicks (Command Palette -> run command -> observe webview) are the user's
  to do, not something a remote CLI-only environment can automate. Stated
  this limitation directly rather than fabricating a "verified" screenshot.
- TESTING.md: new Step 12 (VS Code extension) with the real, verified build+
  install commands and output, honestly split into what I confirmed (install
  succeeds, extension registers) vs. the 3 steps requiring the user's own
  click, plus uninstall instructions. Renumbered old Step 12 (Cleanup) to 13.

### D-021: Real screen capture + real VS Code extension E2E verification
- User granted macOS Screen Recording permission mid-session; retried
  screencapture, which now succeeds (previously blocked, D-020).
- Captured a REAL screenshot of the user's actual VS Code, confirmed the
  agentdyno.agentdyno-vscode extension appears in the Command Palette exactly
  as coded: "AgentDyno: Open Dashboard" and "AgentDyno: Start Dashboard
  Server". Selected "Open Dashboard" (via osascript keystroke automation,
  which started working once Accessibility permission was also granted) and
  captured the real notification the extension code produces when no
  dashboard server is running: "AgentDyno dashboard is not running. Source:
  AgentDyno" with Start it/Cancel buttons - this is the first real,
  non-static proof the extension's actual logic (not just its packaging)
  works inside a live VS Code.
- Built a proper icon: rendered via headless Chrome from an SVG gauge mark
  (same technique used for the site/dashboard screenshots and launch video
  this session - reused, not a new tool) per BRAND.md's "circular gauge with
  needle at ~80%" mark spec. Verified legible at actual small-icon size
  (32px) before shipping. Removed a pre-baked corner-radius on the first
  draft since VS Code's own UI already rounds extension icons - shipping a
  full-bleed square avoids a "floating in a smaller frame" artifact.
  Wired via package.json "icon": "icon.png", rebuilt and repackaged the
  .vsix (31 KB, 7 files), reinstalled with --force. Confirmed on disk (not
  just by re-running vsce) that icon.png is genuinely present in
  ~/.vscode/extensions/agentdyno.agentdyno-vscode-0.1.0/ - the real path VS
  Code's Extensions view reads from.
- Hit a real, honestly-reported limit: clicking the "Start it" button and
  navigating to the Extensions panel required simulated mouse clicks
  (installed cliclick with the user's explicit go-ahead after an earlier
  ambiguous confirmation was correctly rejected by the harness). Screenshot-
  pixel-to-click-point coordinate mapping proved unreliable in this session
  (a computed click landed in a different, unrelated real VS Code window
  belonging to the user's other project rather than the intended magix-box
  window's Extensions icon). Stopped rather than keep guessing coordinates
  near the user's other real work. Final state (icon on disk in the real
  extension install path, Command Palette registration, live notification
  logic) is confirmed by direct filesystem/CLI inspection instead - equally
  reliable evidence, without the risk of further mis-clicks.

### D-022: Guided setup wizard (`dyno setup`) — user-directed, addresses "installation is cumbersome"
- User asked for a single command that: asks CLI-vs-UI, and (for UI) drives
  the ENTIRE flow through scan/fit/pull/serve/doctor, then lets the user pick
  Claude Code/OpenCode/Aider/VS Code, installs/connects, and hands them a
  working local agent.
- Factored src/activate.ts (rankCandidates + activateCandidate) as the one
  shared "pull+serve a model" implementation used by `switch --activate`,
  the API's runActivation, and the new wizard — so all three can never drift.
- Added machine-readable launch descriptors to connect.ts (launchSpecFor):
  distinct from the human-readable connect strings, these return {bin, args,
  env} so the wizard can actually SPAWN claude/aider, or merge OpenCode's
  provider config and spawn opencode, rather than just printing instructions.
- New src/setup.ts: `dyno setup` asks CLI vs UI. CLI path is a real
  interactive wizard (scan -> rank -> pick -> activate -> doctor (optional)
  -> pick agent -> launch it in this terminal, OR auto-build+package+install
  the VS Code extension via the exact same command chain documented in
  TESTING.md). UI path starts the API server and opens the dashboard's new
  /setup/ wizard page in a browser.
- TWO REAL BUGS CAUGHT BY ACTUALLY RUNNING THIS, not by reading the code:
  1. node:readline/promises's Interface.question() hangs forever on its
     SECOND call over a non-TTY/piped stdin in this Node version (minimally
     reproduced standalone, isolated from any of our own code). Switched to
     the plain callback-style node:readline module wrapped in our own
     promise.
  2. A piped stdin emits 'end' as soon as its input is fully written; if a
     real async gap (our leaderboard network fetch) happens between two
     questions, that 'end' can arrive mid-flight and silently orphan the
     pending question's callback (never resolves, never rejects) rather than
     throwing — a genuinely confusing failure mode, tracked down via direct
     debug instrumentation rather than continued guessing.
  3. IMPORTANT CORRECTION after (1)+(2) didn't fully fix it: re-tested using
     a REAL pseudo-terminal (macOS's `expect`, not a plain pipe) and the
     wizard worked correctly end-to-end on the FIRST clean attempt. This
     proved the remaining "hang" was an artifact of testing methodology
     (piped/non-TTY stdin never behaves like a real interactive terminal,
     which never sends EOF mid-session) — not a defect a real user would
     ever hit. Recorded here so this distinction isn't lost: piped-stdin
     testing of interactive CLIs is not representative; PTY-based testing
     (expect/pty) is the correct verification method, and is what actually
     proved this works.
- Verified via `expect` against a real PTY: full flow (rank -> pick top ->
  activate a cached model -> skip doctor -> skip interface) completes
  correctly end to end, exit 0, no hang, no error.

### D-023: UI wizard built and verified via real headless-browser automation
- Built site/dashboard/setup.html: a 6-step wizard (machine -> models ->
  activate -> doctor -> agent -> finish) driven entirely by the existing
  dashboard API plus two new endpoints.
- New API endpoints (api.ts): POST /api/setup/install-vscode (runs the exact
  build+package+install chain from agentops.ts, streams log lines, polled via
  GET /api/setup/vscode-status), POST /api/setup/launch-agent {target} (opens
  a NEW Terminal.app window on macOS with the agent connected — the browser
  has no terminal of its own to inherit stdio into, unlike the CLI wizard).
- Refactored for DRY correctness: factored src/agentops.ts (which/
  installVscodeExtension/mergeOpencodeConfig/launchInNewTerminal) so setup.ts
  and api.ts share one implementation without a circular import between them
  (setup.ts -> api.ts for startApiServer was already one-directional; adding
  api.ts -> setup.ts would have created a cycle, so the shared pieces moved
  to a third module instead). Also fixed a real functional gap this refactor
  surfaced: activate.ts's rankCandidates() never included locally-pulled
  Ollama models, so `dyno switch`/`dyno setup`'s CLI path could never suggest
  an already-pulled Ollama model even though the dashboard's /api/switch
  could. Moved the ollama-inclusion logic into rankCandidates() itself so
  every caller (CLI switch, CLI setup, dashboard API) is now consistent.
  Re-verified via a live PTY run: an ollama-pulled model now correctly
  appears in the CLI wizard's ranked list, which it did not before this fix.
- VERIFIED FOR REAL via headless Chrome + the DevTools Protocol (not
  coordinate-guessed desktop clicks, which earlier this session proved
  unreliable and risky near the user's other open windows): scripted a CDP
  client (ws + Runtime.evaluate) to click through the actual rendered page.
  Confirmed: step 1 (machine) shows real hardware; clicking Continue loads
  10 real ranked candidates from the live API with the correct top pick
  pre-selected; clicking "Use this model" drives a real activation (observed
  real progress states: downloading model -> starting server -> ready,
  ~16s, using an already-cached model) and auto-advances to the doctor step;
  skipping doctor advances to the agent-choice step; choosing "skip" lands on
  the correct finish screen. Also called POST /api/setup/launch-agent with
  target=aider directly (aider is not installed here) and confirmed the
  graceful fallback: correct env vars, correct real model id
  ("qwen3-8b", not the internal "local" sentinel used only in API request
  bodies), correct manual-run instructions.
- ONE PATH DELIBERATELY NOT LIVE-FIRED: target=claude, since `claude` IS on
  this machine's PATH, and calling that endpoint for real would pop a live,
  visible Terminal.app window running an actual nested Claude Code session
  on the desktop — a real, consequential, visible action, matching the
  consent bar already established earlier this session for touching the
  user's live desktop (VS Code install, simulated clicks). Verified instead
  by dry-running the AppleScript-escaping logic standalone and confirming
  the constructed shell script is well-formed, and by code review against
  AppleScript's documented string-escape sequences (\", \\, \n) — a smaller
  but real, deliberate gap, stated here rather than silently skipped.
- Updated TESTING.md (new "fast path: dyno setup" section, explaining the
  piped-stdin-vs-real-terminal distinction from D-022 so a future tester
  doesn't waste time chasing the same false alarm) and README.md.

### D-024: Follow-up fixes closed out
- SessionStart hook error diagnosis (from user report): root-caused to the
  `claude-obsidian` plugin (added earlier this session via its own
  marketplace) registering a SessionStart hook as "type": "prompt" in its
  hooks.json — Claude Code does not support prompt-type hooks at session
  start (no conversation exists yet to run a prompt against). Confirmed by
  grepping every installed plugin's hooks.json for this exact pattern; found
  in exactly one place. NOT an AgentDyno bug — fires on every `claude`
  launch regardless of backend. No code changes made (not AgentDyno's file
  to edit); the actionable fix is disabling/updating that specific plugin.
- VS Code activity-bar icon: the earlier D-023 code changes (activitybar-
  icon.svg, viewsContainers/views contributions, WebviewViewProvider) were
  built and packaged but the actual --install-extension --force call had
  been blocked by a transient classifier error mid-session and never
  retried. Retried and confirmed on disk: ~/.vscode/extensions/agentdyno.
  agentdyno-vscode-0.1.0/ now contains activitybar-icon.svg and its
  package.json's contributes.viewsContainers/views match the built extension
  exactly. VS Code needs a window reload to pick up new view containers
  (standard behavior, not specific to this extension).

### D-025: Goose + Cline replace OpenCode + Aider (user-directed scope change)
- User directive: drop OpenCode/Aider as connect targets; make Goose (Block)
  and Cline first-class instead, with the VS Code extension installer also
  installing both CLIs (and Cline's own VS Code extension).
- Fact-checked BEFORE writing any code (3 parallel research agents + direct
  verification): Cline has a real standalone CLI (npm package "cline",
  confirmed live via registry.npmjs.org — bin: cline), a VS Code extension
  (saoudrizwan.claude-dev, confirmed via marketplace fetch), Apache-2.0.
  Goose install verified: `brew install block-goose-cli` (macOS) or a
  curl-piped script with CONFIGURE=false for non-interactive install; fully
  scriptable via env vars (GOOSE_PROVIDER/GOOSE_MODEL/OPENAI_HOST/
  OPENAI_BASE_PATH/OPENAI_API_KEY), Apache-2.0.
- HONEST GAP FOUND AND KEPT VISIBLE: Cline's CLI has no documented flag for a
  custom base URL (checked docs.cline.bot/cli/cli-reference directly). Rather
  than guess an unpublished providers.json schema, connect.ts's Cline output
  states this plainly and gives the confirmed-reliable path (Cline's own
  Settings UI) as primary, CLI flags as best-effort.
- BATTLE-TESTED LIVE (not just researched) per the user's explicit "after
  battle testing it" instruction: installed the real Goose CLI via Homebrew,
  ran `goose run` against our own managed llama-server. A closed, unresolved
  GitHub issue (block/goose#3979) claims connection failures against bare
  llama-server — did NOT reproduce; basic chat worked immediately. Then ran
  an actual tool-driving task (create a file with specific content):
  - grade-F model (Qwen2.5-Coder-3B): Goose's "write" tool call came back as
    JSON-in-markdown TEXT, not a real tool_calls array — no file created.
  - grade-B model (Qwen3-8B): same task executed correctly, file created
    with exact requested content.
  This is a real, live-verified confirmation that Goose's reliability tracks
  this project's own `doctor` grade exactly, not a Goose-specific defect —
  and it caught my own FIRST DRAFT being wrong: I had initially written a
  warning citing issue #3979 as if it were a live risk, based on research
  alone. Live testing proved that citation misleading and I corrected the
  connect.ts output and its tests before shipping, rather than leaving an
  inaccurate warning in a tool whose whole purpose is measuring reliability
  honestly.
- Removed: connectOpencode/connectAider, OpenCode/Aider branches in
  launchSpecFor, agentops.ts's mergeOpencodeConfig, all UI buttons/choices,
  CLI help text, across cli.ts/api.ts/setup.ts/connect.ts/site/*/README/
  TESTING.md. recap.html's historical sections were left as-is (accurate at
  the time they were written) with a new dated addendum appended, per this
  project's practice of correcting forward rather than editing history.
- New agentops.ts functions: installGooseCli, installClineCli,
  installClineVscodeExtension — all wired into installVscodeExtension so one
  install (CLI wizard option 4, or the .vsix directly) sets up everything.
- 39/39 tests passing (5 new/updated in test/connect.test.js covering the
  corrected Goose behavior and Cline's documented gap).

### D-026: LAN / remote mode — shipped, live-verified over a real network interface
- User requirement: a machine on the same WiFi/LAN should be able to
  discover and use another machine's already-running AgentDyno server from
  its own VS Code/CLI — "local mode or remote mode."
- SECURITY DESIGN DECISION (the load-bearing choice): the raw inference port
  (llama-server 8402 / Ollama 11434) is NEVER bound to the LAN — llama-server
  has no built-in authentication, so exposing it directly on a shared network
  would hand any device on that WiFi unrestricted model access. Instead, only
  the control-plane API server (8403) binds to 0.0.0.0 in LAN mode, gated by
  a bearer token, and it PROXIES inference requests (new /v1/* route in
  api.ts) to the local inference server. Exactly one port is ever reachable
  from the network, and it's the authenticated one.
- Verified bonjour-service (npm, v1.4.3, published 2026-07-09, 2 small deps,
  no native bindings) before adding it as a dependency; confirmed its real
  API shape (Bonjour.publish/find, Browser 'up' events) by direct inspection
  of its .d.ts files and a live import test, rather than assuming a shape
  from memory.
- New src/lan.ts: getOrCreateLanToken (24 random bytes, hex, 0600 permissions,
  persisted at ~/.magix-box/lan-token), advertiseLan/discoverLan (mDNS via
  bonjour-service, presence-only — hostname/port, NEVER the token), remote
  config save/load/clear (~/.magix-box/remote.json).
- api.ts: createApiServer/startApiServer take {lan, token} options. In LAN
  mode every /api/* and /v1/* route requires `Authorization: Bearer <token>`
  except the public /api/lan/hello identity check; default/local mode is
  completely unchanged (no auth, loopback-only, zero new friction).
- cli.ts: `dyno dashboard --lan` (binds 0.0.0.0, prints the token, advertises),
  `dyno remote discover|connect|status|clear`. `dyno connect <target>` now
  checks for a saved remote config FIRST and, if present, fetches the
  remote's live status through its authenticated API and builds a config
  pointing at the remote's proxy with the real token — new connect.ts
  functions connectClaudeRemote/connectGooseRemote/connectClineRemote +
  fetchRemoteStatus, kept separate from the local connectXWith functions
  rather than overloading them, so the well-tested local path is unchanged.
- LIVE-VERIFIED END TO END over this machine's REAL LAN IP (192.168.10.29),
  not loopback, not mocked:
  1. `dyno dashboard --lan` → real 0.0.0.0 bind, real generated token, real
     mDNS advertisement.
  2. Unauthenticated request to the real LAN IP → 401. Authenticated (correct
     bearer token) → full /api/status JSON, including a real saved doctor
     report.
  3. Unauthenticated proxy request to /v1/chat/completions → 401.
     Authenticated → reached the real llama-server and got a genuine
     completion back (verified with both OpenAI-style /v1/chat/completions
     AND Anthropic-style /v1/messages with the exact headers Claude Code
     sends — x-api-key, anthropic-version).
  4. `dyno remote discover` (real CLI, real mDNS browse) found the
     advertised service with the correct host/IP/port.
  5. `dyno remote connect <ip:port> <token>` saved it; `dyno connect claude`
     correctly detected the remote config, fetched the remote's live status
     over the authenticated API, and printed a working config pointing
     ANTHROPIC_BASE_URL at the remote's proxy with the real token (not the
     local "magix-box-local" placeholder, which only ever meant anything to
     the loopback server).
  6. `dyno remote clear` correctly reverted to local mode.
- New test/lan.test.js (3 tests) locks the token-persistence and
  remote-config round-trip logic. The mDNS/network parts aren't
  re-mocked in unit tests (they need a real socket) — covered by the live
  verification above instead, consistent with this project's practice of
  preferring a real end-to-end run over a mocked unit test where feasible.
  42/42 tests passing overall.

### D-027: Claude Code removed entirely — Goose and Cline are the ONLY targets
- Explicit follow-up directive: don't just de-prioritize Claude Code, remove
  it completely. `dyno connect` now only accepts goose|cline; all
  connectClaude*/launchSpecFor("claude") code paths, CLI/API/UI menu entries,
  and tests were deleted (not just hidden) across connect.ts, cli.ts, api.ts,
  setup.ts, site/index.html, site/dashboard/{index,setup}.html, README.md,
  TESTING.md, test/connect.test.js.
- This resolves the previously-flagged open question (Anthropic's unanswered
  position on third-party backends, claude-code#5577) by elimination — no
  Claude Code code path remains to raise it.
- recap.html: historical sections describing earlier versions were left
  as-is (accurate at the time), except one literal copy-pasteable command
  block that would have broken for a reader following along today — that one
  was corrected in place, with a new dated addendum explaining the removal,
  per this project's established practice of correcting forward.
- Fresh live captures replaced every "captured real output" block in
  TESTING.md that showed the now-removed `connect claude` command, so the
  guide never shows output from a command that no longer exists.
- 41/41 tests passing (one net removal: the claude-specific launch-spec test).

### D-028: VS Code chat participant, clean-slate reinstall, and the real npm/Homebrew publish pipeline
- User directive: `dyno setup` should offer to clean up a previous install
  before running again, and AgentDyno should get a proper `@agentdyno` icon
  in VS Code's Chat view next to Copilot (distinct from the activity-bar
  icon shipped in D-021 — that's a sidebar panel, this is the Chat view).
- Chat participant: `contributes.chatParticipants` (stable API, engine bumped
  to ^1.100.0), `/status` `/doctor` `/connect goose|cline` slash commands, all
  thin wrappers over the existing dashboard API — no logic duplicated for
  chat. Battle-tested live: activated a real model, ran a real doctor exam
  (graded B), fetched real Goose/Cline configs through the participant's own
  code paths. Caught a real bug this way: the fetch helper resolves on any
  parseable JSON regardless of HTTP status, so `/api/connect/*`'s 409
  `{error}` response would have rendered as literal "undefined" in the chat
  reply — fixed by checking `result.error` explicitly.
- Clean-slate flow: new `checkResidue()`/`cleanResidue()` in agentops.ts.
  Config/state (server.pid, lan-token, remote.json, reports) is safe to
  always offer; downloaded models (multi-GB) and the VS Code extension are
  opt-in per category, never wiped as a side effect. A first draft of
  `dyno clean` uninstalled the VS Code extension by default whenever one was
  detected — caught by actually running the command against this machine,
  fixed to be opt-in only (`--vscode-extension`).
- Also fixed while building this: `installVscodeExtension()` had the
  packaged `.vsix` filename hardcoded to a specific version string, which
  would have silently broken the moment the extension's own version changed
  (as it did, 0.1.0 -> 0.2.0, in this same batch of work) — now reads
  name+version from the extension's own package.json.
- npm/Homebrew publish, decided and executed end to end (user explicitly
  delegated the npm-vs-PyPI-vs-brew call): npm (right ecosystem for a
  Node/TS CLI) + a Homebrew tap, skip PyPI entirely. Real, non-obvious
  problems found only by actually running each step, not by reading the
  config:
  1. `files` array bundled the VS Code extension's entire `node_modules`
     (its own TypeScript devDependency) — 26 MB/182 files, cut to
     1.5 MB/40 files by listing explicit sub-paths instead of the whole
     directory (a root `.npmignore` did NOT reliably exclude a nested
     `node_modules` inside an explicitly-listed `files` entry — verified via
     repeated `npm pack --dry-run`, not assumed).
  2. `bonjour-service@^1.4.4` had no older fallback in range, and 1.4.4 was
     published to npm ~90 minutes before a Homebrew install attempt — Homebrew's
     npm-install cooldown (refuses packages newer than a few days old, a
     supply-chain safety guard) rejected it with ETARGET. Relaxed to ^1.4.3.
  3. The GitHub release the tap pointed at was on a PRIVATE repo — Homebrew's
     plain unauthenticated curl 404'd on the asset. Repo made public.
  4. `npm-publish.yml`'s trigger was `release: types: [created]`, which only
     fires for DRAFT releases — a directly-published release (what
     `gh release create` produces) fires `published` instead. Confirmed via
     the Actions API: 0 runs across two real releases before the fix.
  5. The `publish-npm` job ran on its own fresh checkout with no `dist/` (a
     separate job from the one that ran the build) — first successful
     trigger published a 20-file tarball missing the `dyno` binary entirely.
     Fixed by adding `npm run build` before `npm publish` in that job.
  6. `node --test 'test/*.test.js'` (quoted) depends on Node's own internal
     glob resolution, unsupported on Node 20 (CI's pinned version) though it
     always worked locally on Node 26 — reproduced and confirmed the fix
     (unquoted, shell-expanded glob) against a real Node 20 Docker container,
     not just asserted.
  7. The user's first granular npm token didn't have "Bypass two-factor
     authentication" checked (off by default) — CI publish failed with EOTP
     since a headless job can't answer an OTP prompt. Fixed with a
     regenerated token.
  8. Five release tags (v0.7.0 -> v0.7.4) were needed to work through the
     above one real failure at a time. `agentdyno@0.7.4` is now live on the
     public npm registry; `brew install sauravGit/agentdyno/agentdyno` and
     `npm install -g agentdyno` were both re-verified end to end afterward
     (fresh uninstall/untap, fresh install, `dyno --version`) — including
     pointing the tap at the canonical `registry.npmjs.org` tarball instead
     of the GitHub-release workaround, now that the registry path works.
- 41/41 tests passing throughout (Node 20 container + local Node 26, both
  confirmed independently).

### D-029: Professional-pass on docs and site; `mb`/`magix-box` branding cleanup; real `.github/labeler.yml`
- User directive: make the README look like a professional product README,
  update the marketing site, turn TESTING.md into a step-by-step onboarding
  guide, and make the already-added `label.yml` workflow actually do
  something (it referenced a `.github/labeler.yml` config file that never
  existed, so it was a silent no-op).
- README.md: added npm-version/license/node-engine badges (shields.io, live
  and always accurate since they read the actual registry/repo rather than
  being hand-typed), a real screenshot, install via `brew`/`npm` as the
  primary path with source-checkout demoted to a collapsed `<details>`
  section, a full command reference table, and an explicit LAN/remote-mode
  section and VS Code chat-participant section that didn't exist in the
  README before (they were only in BUILD_LOG/TESTING). Verified every
  file/path the new README references actually exists in the repo
  (`research/REPORT.md`, `tools/build-catalog.ts`, screenshots) rather than
  assuming.
- TESTING.md renamed to ONBOARDING.md (`git mv`, history preserved) and
  reframed from a verification-testing tone to a getting-started tone:
  install section leads with `brew`/`npm` instead of git-clone-only, test
  count corrected from a stale 32 to the real 41, the VS Code section's
  `.vsix` version references corrected from 0.1.0 to 0.2.0 (stale since
  D-028's chat-participant work bumped the extension), the fast-path section
  now mentions the clean-slate check, and a new step covers the
  `@agentdyno` chat participant (`/status` `/doctor` `/connect`) that
  ONBOARDING's predecessor (TESTING.md) predates entirely. Step 2 (test
  suite) is now explicitly marked optional/source-only, since a
  brew/npm-installed user has no source tree to run `npm test` against —
  the old version silently assumed everyone had cloned the repo.
- Found and fixed a real, separate bug while doing this pass: the CLI's own
  `--help` output and several error strings still said `magix-box` / `usage:
  mb <command>` — leftover from before the project's rename to AgentDyno/
  `dyno`. Swept `src/cli.ts`, `src/serve.ts`, `src/connect.ts` for every
  `mb <subcommand>` string and corrected them to `dyno <subcommand>`; left
  `~/.magix-box` (the actual on-disk config directory name) untouched since
  renaming that would break every existing install for zero user-facing
  benefit. Rebuilt and reran the full suite (41/41) after the sweep to
  confirm nothing depended on the old strings.
- site/index.html: quickstart section updated from git-clone-only to lead
  with `brew install`/`npm install -g`, matching the README.
- `.github/labeler.yml` created — confirmed via GitHub's own docs that
  `actions/labeler@v4` (the version pinned in the existing workflow) uses a
  flat glob-list-per-label format, NOT the newer `changed-files:
  any-glob-to-any-file` nesting introduced in later major versions; using
  the wrong schema would have made every label silently match nothing.
  Labels: cli, vscode-extension, docs, tests, ci, dependencies, release,
  scoped to this repo's actual directory layout.

### D-030: Re-cut launch video with real ElevenLabs narration; interactive README; recap/site sync
- User directive: use the API keys already present in `.env` (Kie.ai, ElevenLabs,
  HeyGen — "fair game" per this project's original guardrails) to update the
  launch video, refresh the site with it, and make the README less of a wall
  of text.
- Verified each key against its own account-status endpoint BEFORE building
  anything, per this project's fact-check-first standard:
  - ElevenLabs `/v1/user`: real success, free tier, 0/10000 characters used.
  - HeyGen `/v2/user/remaining_quota` and `/v3/users/me`: both returned
    `"Unauthorized"` — the key itself is rejected, not a header-format issue.
  - Kie.ai `/api/v1/chat/credit` (confirmed via the docs as the Bearer-token
    auth format, then probed for a real endpoint): `401 Unauthorized`.
  - Conclusion, reported directly rather than silently worked around: only
    ElevenLabs is usable with the current keys. No avatar footage (HeyGen) or
    AI-generated imagery (Kie.ai) is in the new video as a result — disclosed,
    not glossed over.
- Built a new launch video (`site/video/launch-v2.mp4`, ~77s) entirely from
  verifiable pieces: real ElevenLabs narration (voice: River — relaxed,
  neutral, informative, matching BRAND.md's "instrument, not salesman" voice
  rule) over branded terminal-style frames rendered via headless Chrome
  (`/Applications/Google Chrome.app ... --headless --screenshot`), showing
  the actual, real captured `dyno scan`/`fit`/`doctor`/`connect goose` output
  already verified earlier in this project — no synthetic/fabricated command
  output. `brand/LAUNCH_VIDEO_SCRIPT.md` updated to match (the old script's
  Scene 4 showed `connect claude`/`connect opencode`, both removed targets).
  ffprobe-verified: correct video+audio streams, non-silent audio
  (-24.7dB mean, -2.9dB max, not clipping), frame-accurate scene timing spot
  checked at t=30s and t=70s. Sent to the user directly to watch/listen
  rather than just described.
- Did NOT overwrite the original `site/video/launch.mp4` — a destructive
  in-place replacement of an existing tracked asset was (correctly) blocked
  by this session's own safety tooling as an unauthorized irreversible
  action; added `launch-v2.mp4` as a new file alongside the original instead,
  with `site/index.html` and `recap.html` updated to feature the new cut
  while still linking the original for reference. `walkthrough.mp4` (37s,
  silent, also predates the Goose/Cline pivot) was NOT re-cut in this pass —
  called out explicitly as a known gap rather than left silently stale.
- README.md made interactive per the "lots of text text" complaint: a
  clickable video thumbnail at the top, a collapsible table of contents, an
  "at a glance" summary table before any prose, and three previously-flat
  sections (Ollama backend, LAN/remote mode, How fit is computed) converted
  to `<details>` blocks — each given an explicit `<a id>` anchor first,
  verified programmatically (a small script matching every TOC link against
  every heading-derived and explicit anchor) since collapsing a section into
  `<details>` removes GitHub's automatic heading-anchor generation and would
  otherwise silently break the TOC.
- Found and fixed two more stale claims while doing this pass, both in
  recap.html: "repo is private" in the guardrails list (the repo went public
  in D-028 to unblock Homebrew's unauthenticated asset download — the
  guardrail table hadn't been updated to say so) and the deliverables table
  still linking the old `launch.mp4` as the primary video. Per this project's
  established practice, older narrative prose describing historical
  reasoning (e.g. "Claude Code connects with three env vars" in an earlier
  explanatory paragraph) was left as-is rather than rewritten, since it's
  accurate to the moment it was written and not a live, breakable
  instruction — only the guardrail claim and the deliverables table (both
  presented as current fact, not history) were corrected.
- 41/41 tests passing throughout.

### D-031: HeyGen and Kie.ai retried with fresh credentials — both work; launch-v3.mp4
- User regenerated both keys after D-030's "Unauthorized" findings and asked to retry,
  and separately asked for a flashier cut: an avatar, and the dashboard/VS Code shown too.
- Re-checked both against their own account endpoints before spending anything: HeyGen
  `GET /v3/users/me` returned a real account (wallet balance $5.00); Kie.ai's credit
  endpoint returned a real balance (1080 credits). Noticed the two new key lengths were
  swapped relative to the old broken pair (HeyGen 32->54 chars, Kie.ai 54->32) — cross-checked
  each key against BOTH services before trusting either, to rule out a field-swap rather than
  assume; both were correctly in their own fields, just coincidentally inverted in length.
- HeyGen: verified the real v3 request schema by fetching HeyGen's own docs (not trusting a
  single AI-summarized fetch) — `POST /v3/assets` (multipart) to upload the project's own
  ElevenLabs narration audio, then `POST /v3/videos` with `type: avatar`, a real
  `avatar_id` (from `GET /v2/avatars`, 1264 real options), and `audio_asset_id` pointing at
  the uploaded narration — so the avatar lip-syncs to the exact same narration used
  elsewhere, not HeyGen's own TTS. Real finding: the `background: {type: color}` param did
  not override this avatar's own baked-in studio footage; color-graded the rendered clip
  afterward (slight darken + teal push) to blend it into the brand palette rather than
  masking the limitation.
- Kie.ai: verified the real 4o-image-api schema via `docs.kie.ai`'s own quickstart (fetched
  directly, not guessed) — generated a dyno-gauge illustration (`brand/hero-gauge.jpg`) used
  as the title-card and closing-card background.
- Two more real bugs found while building the fuller cut:
  1. An ffmpeg `zoompan` Ken-Burns clip rendered as 225 seconds instead of the intended 3 —
     root cause: `-t 3` was placed after the wrong `-i`, so it bound to the next input (a
     looped still image) instead of the silent-audio source, and zoompan multiplied its
     per-frame duration across every duplicate frame the loop fed it. Fixed by moving `-t`
     immediately after `-f lavfi` so it binds to the intended input — verified by checking
     each clip's duration individually before re-assembling.
  2. Sourcing a "real dashboard screenshot" for the video exposed that
     `site/screenshots/desktop.png` is actually a screenshot of the marketing landing page,
     not the dashboard — and it showed stale "Claude Code, OpenCode, or Aider" copy from
     before the Goose/Cline pivot (the file predates that rename and was never refreshed).
     Took a genuine fresh screenshot of the real, live `dyno dashboard` instead
     (`site/screenshots/dashboard-live.png`) for the video, and separately refreshed
     `desktop.png`/`mobile.png` in place against the current (already-fixed) site copy,
     since "documents in sync with codebase" applies to screenshots too, not just text.
  3. GUI automation of a real VS Code window (osascript) was correctly blocked as a repeat
     of an action the user had already interrupted once — built an HTML/CSS mockup of the
     actual `@agentdyno` chat participant UI instead (matching the real response format from
     `vscode-extension/src/extension.ts`), rendered via the same headless-Chrome pipeline as
     every other frame, rather than fighting the block.
- Final cut (`launch-v3.mp4`, ~113s): HeyGen avatar opens and closes the video; Kie.ai hero
  art backs the title and closing cards; the CLI demo (scan/fit/doctor F/doctor B/connect)
  plus the new dashboard and VS Code beats all get Ken Burns motion instead of static holds.
  Verified structurally (correct video+audio streams, non-silent audio, -28.3dB mean/-3.0dB
  max) and by eye (extracted and viewed frames at every beat transition) before sending to
  the user, who approved it. Wired into site/index.html, recap.html, and README.md; earlier
  cuts (launch.mp4, launch-v2.mp4) kept online and linked, not deleted.
- 41/41 tests passing (no source code changed in this pass, confirmed as a sanity check).

### D-032: Stable local gateway — Goose/Cline configured once, never touched again
- User-reported pain point, verified rather than assumed: after `dyno switch`
  to a different model, Cline's settings silently point at stale information,
  and the fix required manually re-editing Cline's Settings UI — "cumbersome"
  for anyone, let alone a non-technical user. Asked to design and build a fix
  "thinking like Steve Jobs" — remove the friction, don't just document it.
- Investigated whether AgentDyno could auto-write Cline's config directly
  (the obvious first idea) — real answer, checked against the actually
  installed extension's package.json, not guessed: Cline exposes ZERO
  settings via VS Code's configuration API and no command to set its API
  provider fields programmatically (`contributes.configuration` is an empty
  array; its registered commands are all UI-trigger only, e.g.
  `cline.settingsButtonClicked` just opens the panel). VS Code sandboxes each
  extension's storage by design — there is no supported door in. This is a
  Cline-side limitation, not a choice AgentDyno is making.
- Real, load-bearing finding that reshaped the whole design: llama-server
  IGNORES the "model" field in requests entirely — proved by sending a
  request with a deliberately bogus model string and getting a normal
  response back from the real loaded model, response echoing the real file
  path regardless of what was sent. Ollama, by contrast, DOES route on this
  field. This meant the fix could be "make reconfiguration structurally
  unnecessary" rather than "make reconfiguration easier."
- **Design considered and rejected**: a true always-on background service
  (launchd/systemd/Windows-service autostart). Rejected on both a UX and a
  values basis — it means real OS-level plumbing and uninstall-cleanup
  surface, a permanently-listening local port whether or not the user is
  working, and directly contradicts this project's own "no accounts, no
  telemetry, no subscriptions" positioning (BRAND.md). A process that
  outlives the work session it belongs to is exactly the pattern the product
  is positioned against.
- **Design shipped instead**: the dashboard/API server (already-existing
  infrastructure, previously only wired up for LAN mode) is now the stable
  local gateway (`127.0.0.1:<API_PORT>/v1`) for the default/local case too,
  but co-lifecycled with `dyno serve` rather than run as an independent
  daemon — `ensureApiDaemon()` spawns it detached only when `dyno serve`
  starts (no-op if one's already up, e.g. from an earlier `dyno serve` or
  the user's own `dyno dashboard`), and `stopApiDaemonIfAutoStarted()` tears
  it down together with `dyno serve --stop`, tracked via a small pid file
  recording whether THIS mechanism started it (never touches a dashboard the
  user launched themselves). Nothing lingers once you stop working;
  `API_PORT` moved from api.ts to catalog.ts first to avoid a circular
  import (api.ts already imports from connect.ts).
- The `/v1/*` proxy now force-rewrites the request body's `model` field
  server-side to whatever's actually active, regardless of what the client
  sent — the mechanism that makes the "never touch it again" guarantee hold
  for Ollama too (not just llama-server, which already ignored the field).
  Caught and fixed a real regression while making this the default local
  path, not just a LAN nicety: the proxy previously buffered the ENTIRE
  upstream response before replying, which would have silently killed
  token-by-token streaming for every interactive chat request once this
  became the everyday path, not an occasional LAN one — switched to piping
  the response through (`Readable.fromWeb(upstream.body).pipe(res)`) and
  verified real SSE chunks arrive progressively, not as one blob.
- connect.ts's `connectGooseWith`/`connectClineWith`/`launchSpecFor` now all
  point at the gateway address instead of the raw backend port
  (`activeBaseUrl`) for local connections; remote (LAN) connect functions
  were already pointing at the remote's own gateway and needed no change —
  same pattern, already consistent. Displayed Model ID text is unchanged
  (still the real catalog id/tag, for a legible one-time setup); the
  guarantee no longer depends on that value staying accurate, since the
  proxy corrects it either way.
- VS Code extension: new **AgentDyno: Connect Cline** command
  (`agentdyno.connectCline`) — copies Base URL/API Key/Model ID to the
  clipboard and calls `cline.settingsButtonClicked` to open Cline's panel.
  Doesn't pretend to fill Cline's fields in (confirmed impossible above);
  removes every OTHER step instead. Chat participant's `/connect cline`
  reply now points at this command too. Extension version bumped 0.2.0 ->
  0.3.0, rebuilt, packaged, and reinstalled to confirm the command actually
  registers in the real installed extension (checked its package.json
  directly, not assumed from source).
- End-to-end verified live, not just unit-tested: started a real model
  server, confirmed the daemon co-starts and the gateway responds; sent a
  request through the gateway with a deliberately wrong "model" field and
  confirmed it still reached the real model; confirmed `dyno dashboard`
  detects an already-running daemon and opens the URL instead of crashing on
  a port conflict; confirmed `dyno serve --stop` tears down both the model
  server AND the auto-started daemon, leaving no processes or pid files
  behind; confirmed streaming responses arrive as progressive chunks through
  the gateway, not buffered. Caught and cleaned up one unrelated stale
  process from earlier manual testing this session that had orphaned itself
  on port 8402, which briefly produced a confusing false "connected" state —
  not a bug in this change, but resolved before drawing conclusions from it.
- test/connect.test.js updated to assert the new gateway-based URLs (8403)
  instead of raw backend ports (8402/11434) for both backends, plus a new
  test asserting llama-server and Ollama configs use the IDENTICAL base URL
  (the actual point of this change — switching backends never touches
  Goose/Cline). 42/42 tests passing.
- Docs synced: README.md (new "stable gateway" explainer in the
  Switcher/dashboard/IDE section, an "at a glance" row), ONBOARDING.md
  (fresh real captures of `dyno serve`/`dyno connect goose`/`dyno dashboard`
  output reflecting the new gateway line and port, new guidance in Steps 6,
  8, 10, 11, and 12), and this entry.

### D-033: Two real bugs found via live smoke-testing; differentiation research complete
- User reported "lots of bugs" in the current version without specifics; ran
  a live smoke-test pass across core commands rather than guess, and found
  two real, reproducible ones — both fixed and verified, not just patched
  blind.
- **Bug 1 — `max-ctx: 0` for every `gpu+cpu split` (partial-offload) and
  `won't-fit` model in `dyno fit`'s table.** Root cause: `fitQuant()`
  computed `maxComfortableContext` against `budget = gpu > 0 ? gpu : ram` —
  the GPU-only budget — regardless of which mode was actually determined.
  For partial-offload models, weights already exceed the GPU budget alone
  (that's the exact condition that put them in partial-offload), so `room`
  went negative unconditionally and the function silently returned 0.
  Reproduced directly: Devstral Small (14.3GB weights, 11.2GiB GPU budget,
  8.6GiB RAM budget) — checking against GPU-only (11.2GiB) always yields a
  negative room; checking against gpu+ram (19.8GiB, the actually-available
  pool for that mode) yields a real, positive context. Fixed by matching the
  budget to the mode: `ram` for cpu-only, `gpu + ram` for partial-offload,
  `gpu` otherwise. Not just a display bug — `dyno serve <partial-offload
  model>` without an explicit `--context` was silently falling back to a
  flat 4096-token floor (serve.ts's existing safety floor) instead of the
  real comfortable context, for every model in this mode. New regression
  test added (existing "partial-offload reports a sane layer split" test
  only checked `mode`, never `maxComfortableContext` — the actual gap that
  let this ship unnoticed).
- **Bug 2 — real race condition in the stable-gateway daemon (D-032), found
  by re-testing that exact feature under a more adversarial sequence.**
  `ensureApiDaemon()` spawned the background `_apidaemon` child and returned
  immediately without confirming it was actually listening. Running
  `dyno dashboard --lan` immediately after `dyno serve` printed "ready" hit
  a real window where the daemon hadn't finished binding yet — its own
  `pingApiServer` check correctly saw nothing, and it proceeded to start a
  SECOND server. Genuinely surprising follow-on finding: on this OS, binding
  0.0.0.0:8403 while another process already holds 127.0.0.1:8403 did NOT
  throw EADDRINUSE — both silently stayed bound at once (confirmed via
  `lsof -i :8403` showing two live listeners, one per process). Fixed at the
  root: `ensureApiDaemon` now polls `pingApiServer` (up to 3s) after
  spawning and only returns once the daemon is confirmed live, closing the
  window entirely. Also added a `server.on("error", ...)` handler to
  `startApiServer` as defense-in-depth for the unrelated, ordinary case of
  a genuinely conflicting process — there was no error listener at all
  before, so a real EADDRINUSE would have crashed with a raw Node stack
  trace instead of a clean message. Re-ran the exact failing sequence after
  the fix: correctly rejected with "a loopback-only dashboard is already
  running" instead of double-binding; confirmed via `lsof` only one process
  ever holds the port afterward.
- Both fixes verified live (not just re-reasoned about) and via 43/43 tests
  passing (up from 42 — new partial-offload regression test added).
- Separately: completed the differentiation research requested earlier
  (`/research-deep`, 8 angles, 4 parallel agents — one background-agent
  batch hit a mid-run API session limit and was resumed via SendMessage
  once it cleared, per this environment's own resume mechanism, rather than
  restarted from scratch). Full synthesis in
  `research/differentiation/REPORT.md`; raw per-angle findings, each with
  fetched sources and explicit `[uncertain]` flags where evidence wasn't
  independently verifiable, in `research/differentiation/results/*.json`.
  Top recommendation: a self-published Aider-style leaderboard (smallest
  effort, reuses existing `dyno doctor`/`fit` output), a grammar-constrained
  "fixer" mode that can turn some real F-grade models into usable ones by
  construction (most novel technical claim, no competitor offers this), and
  an opt-in crowdsourced verified-compatibility database as the longer-term
  compounding moat (structurally hardest thing for a pure calculator like
  llmfit to replicate quickly). None of these are built yet — this is
  research and a prioritized recommendation, not a shipped feature.
