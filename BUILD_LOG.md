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
