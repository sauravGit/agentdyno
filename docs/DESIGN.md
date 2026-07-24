# Design — magix-box MVP

Status: designed 2026-07-24, before build. Clean-room design: no code from
athanor-lite (source-available, non-commercial); architecture concepts studied
under its "view, study, evaluate" grant, all implementation original.

## Product promise

One command from "bare machine" to "my agent CLI is coding against a local
model that actually fits my hardware." Free forever, Apache-2.0, no accounts,
no telemetry.

## Language / distribution decision (D-007)

TypeScript on Node >= 20, no native modules, minimal runtime deps.

Why: the primary connect target, Claude Code, requires Node — so every target
user already has the runtime; `npx`-style zero-install beats "download a
binary" for this audience; Intel and Apple Silicon Macs both covered by Node
itself; and this machine has Node 25 but no Go/Rust toolchain, so a compiled
language would add toolchain installs without MVP benefit. Rejected: Rust
(athanor's choice — right for a GUI sidecar app, wrong for our npm-audience
CLI MVP), Python (env conflicts contradict the "never breaks your system"
promise), Go (single binary is elegant but no toolchain present and no
audience advantage over npm).

## Command surface (v0.1)

```
mb scan                 # hardware report (JSON with --json)
mb fit [--context N]    # ranked model/quant verdicts for THIS machine
mb pull <model>         # resumable, SHA-256-verified GGUF download
mb serve [<model>]      # launch managed llama-server, correct flags, health-polled
mb connect <agent>      # claude | opencode | aider — wire agent to local server
mb doctor               # end-to-end self-check: scan -> serve -> tool-call probe
mb bench                # measured tokens/sec on this machine
```

`mb` = magix-box. Every command works standalone; `mb doctor` is the
first-run "prove it works" experience.

## Hardware scan (per platform)

- macOS Apple Silicon: `sysctl hw.memsize`, `sysctl iogpu.wired_limit_mb`
  (0 => kernel default; GPU-wired budget modeled as 65% of RAM, the known
  default for <= 36 GB machines — validated empirically via mb bench),
  chip name via `sysctl machdep.cpu.brand_string`, cores via `hw.ncpu`.
- macOS Intel: no usable Metal LLM budget -> CPU-only; budget = 50% of RAM.
- Linux: /proc/meminfo; `nvidia-smi --query-gpu=...` when present for VRAM.
- Windows: designed (wmic/PowerShell CIM + nvidia-smi) but untested this run
  (no Windows machine available) — shipped behind an "experimental" warning.
- Disk free via statfs on the models directory.

## Fit math (independent derivation)

For a quant Q of model M at context C tokens:

```
need_gb(C) = weights_gb            # from catalog (exact file size)
           + kv_gb(C)              # 2 * layers * kv_heads * head_dim * 2bytes * C   (fp16 K+V)
           + overhead_gb           # compute buffers + runtime, constant per backend
```

kv parameters (layers, kv_heads, head_dim) come from the catalog per model —
real GGUF metadata, not guesses; models using GQA get the small kv_heads this
math rewards. Budgets: gpu_budget (Metal wired limit or NVIDIA free VRAM),
ram_budget (50% of system RAM). Verdicts:

- comfortable: need <= 85% of gpu_budget
- tight: need <= gpu_budget
- partial-offload: weights fit gpu+ram combined; report layer split
- cpu-only: fits ram_budget only
- wont-fit: exceeds everything

Also reported: max context that stays comfortable (solve C from the linear
equation) — this is the number agent users actually need, since agents die
by context, not by chat length.

## Catalog (curated, embedded)

~10 entries, coding + tool-calling capable, GGUF, verified at build time:
exact byte sizes and SHA-256 from Hugging Face API, kv geometry from model
cards/config.json. Catalog entries carry `tool_call_grade` (A/B/C) based on
documented jinja-template tool support in llama.cpp and community evidence.
Catalog is a JSON file; community PRs extend it.

## Runtime management

- `mb pull` fetches the right llama.cpp release asset for os/arch from GitHub
  releases (verified available for macos-arm64/x64, ubuntu, windows) into
  ~/.magix-box/runtime; model GGUFs into ~/.magix-box/models. Resumable via
  HTTP Range; SHA-256 verified; disk pre-flight against scan.
- `mb serve` spawns llama-server with: --jinja (tool calling), -c <fitted
  context>, -ngl <fitted layers>, --host 127.0.0.1 --port 8402, health-polls
  /health, streams logs to ~/.magix-box/logs. PID-file managed; `mb serve
  --stop` drains and kills.

## Connect (the differentiator)

- claude: prints and optionally writes env: ANTHROPIC_BASE_URL=http://127.0.0.1:8402
  (llama-server natively implements the Anthropic Messages API — verified),
  ANTHROPIC_AUTH_TOKEN=dummy, plus guardrail advice (small tool count, context
  ceiling from fit). Includes the honest note that Anthropic has not publicly
  blessed third-party backends (claude-code #5577) and links open alternatives.
- opencode: writes ~/.config/opencode provider block pointing at the local
  OpenAI-compatible endpoint with the fitted context.
- aider: prints the aider flags (--openai-api-base ... --model openai/<id>)
  with context-window settings that avoid the documented truncation trap.

Guardrails applied automatically, derived from researched failure modes:
context ceiling from fit math (Cline 85K-token blowups), tool-count warning
(Goose breaks past ~5 tools on small models), template correctness (--jinja
with model-native template; Continue's raw-XML failure mode).

## Non-goals for v0.1

GUI, RAG, fine-tuning, multi-workspace, Windows testing, MLX backend (llama.cpp
Metal is sufficient; MLX noted as future work), model training, telemetry.
