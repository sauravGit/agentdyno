# Local-LLM Coding Agents — Landscape Research Report

Topic: local-llm-coding-agents. 12 items researched. Uncertain values omitted.

## Table of Contents

1. [Aider](#aider) - agentic-cli | Apache-2.0 (SPDX: Apache-2.0), truly open source | 47,667 GitHub stars (github.com/Aider-AI/aider, via GitHu...
2. [Athanor Lite](#athanor-lite) - model-manager | Source-available, NOT open source. Custom 'Athanor Lite -... | ~38 GitHub stars, ~5 forks, 0 open issues, 1 open PR, ~37...
3. [Cline / Roo Code](#cline-roo-code) - ide-extension | Apache-2.0 (both are truly open source; Roo Code is a for...
4. [Continue.dev](#continuedev) - ide-extension
5. [Goose (Block)](#goose-block) - agentic-cli | Apache-2.0 (SPDX: Apache-2.0), truly open source | 51,607 GitHub stars (repo block/goose, resolved via GitHu...
6. [Hardware-aware model fit tools (canirunthisllm.net, CanItRun.dev, VRAM calculators, Apple MLX / mlx-lm, Hugging Face hardware filters)](#hardware-aware-model-fit-tools-canirunthisllmnet-canitrundev-vram-calculators-apple-mlx-mlx-lm-hugging-face-hardware-filters) - model-manager | Mixed across the category. canirunthisllm.net / CanItRun....
7. [LM Studio](#lm-studio) - desktop-app | Proprietary / closed source. The desktop app is not free/...
8. [Ollama](#ollama) - local-runtime | MIT License (SPDX: MIT). The local runtime is genuinely o... | ~176.8k GitHub stars (https://github.com/ollama/ollama, o...
9. [OpenCode (sst/opencode)](#opencode-sstopencode) - agentic-cli | MIT (SPDX: MIT), truly open source | 189,330 GitHub stars (repo sst/opencode, resolved via Git...
10. [OpenHands (formerly OpenDevin)](#openhands-formerly-opendevin) - agentic-cli | MIT License (true open source). Note: the GitHub org was ... | ~82,000 GitHub stars, ~10,500 forks, ~134 open issues (gi...
11. [claude-code-router (and Claude Code with local models via ANTHROPIC_BASE_URL / y-router / LiteLLM)](#claude-code-router-and-claude-code-with-local-models-via-anthropic-base-url-y-router-litellm) - bridge/router
12. [llama.cpp / llama-server](#llamacpp-llama-server) - local-runtime | MIT License (SPDX: MIT). Fully open source. | ~121.5k GitHub stars (https://github.com/ggml-org/llama.c...

## Aider

**name**: Aider

**category**: agentic-cli

**url**: https://github.com/Aider-AI/aider

**license**: Apache-2.0 (SPDX: Apache-2.0), truly open source

**pricing**: Free and open source; no subscription. Users pay only for whatever LLM API they connect to (or nothing at all when using local models via Ollama/OpenAI-compatible endpoints).

**platforms**: Cross-platform Python package (macOS incl. both Intel and Apple Silicon, Linux, Windows). Installed via `python -m pip install aider-install` or pipx/uv. No architecture-specific binary; runs anywhere Python runs.

**local_model_support**: Connects to local models through Ollama (ollama_chat/ prefix recommended over ollama/) and any OpenAI-compatible API endpoint, plus LiteLLM-backed providers. OLLAMA_API_BASE (default http://127.0.0.1:11434) and OLLAMA_API_KEY configure the endpoint. Model behavior tuned via .aider.model.settings.yml (context window, edit_format).

**agentic_coding_features**: Whole-file and diff/SEARCH-REPLACE edit formats, automatic git commits with generated messages, multi-file edits/refactors, repo map for context, /add /run shell command execution, voice, image/URL context, linting and test-run integration. CLI-first (also has a browser UI). Not MCP-native (MCP support is limited/via wrappers, not a core feature).

**popularity**: 47,667 GitHub stars (github.com/Aider-AI/aider, via GitHub API, 2026-07-24).

**pain_points**: - Local Ollama models cannot see files added to the chat: 'When using Aider with a local Ollama model the model is unable to see any files added to the chat' - user added package.json via /add but deepseek-r1:32b replied 'I don't currently have access to your package.json file or any other files in your project' (aider v0.72.3). https://github.com/Aider-AI/aider/issues/3010<br>- Local/quantized models fail Aider's edit format: 'The LLM did not conform to the edit format' with DeepSeek-Coder-V2 locally, while Claude/ChatGPT and Llama 3.1 8B work. https://github.com/Aider-AI/aider/issues/1208 and 'SEARCH/REPLACE block failed to match!' https://github.com/Aider-AI/aider/issues/3651<br>- Silent context truncation with Ollama: the docs warn 'Ollama uses a 2k context window by default' and 'silently discards context that exceeds the window. This is especially dangerous because many users don't even realize that most of their data is being discarded by Ollama.' https://aider.chat/docs/llms/ollama.html<br>- Diff editing unusable with local qwen2.5-coder-32b-instruct, forcing users onto --edit-format whole. https://github.com/Aider-AI/aider/issues/2371

**gap_vs_vision**: Does not deliver 'hardware-aware local Claude Code for everyone.' No hardware detection or memory-fit model recommendation - users must know which model their machine can run and configure context windows and edit formats by hand. Local open-source models frequently break Aider's SEARCH/REPLACE edit format and even fail to receive added files, so out-of-the-box local UX is fragile compared to frontier cloud models. It is not a Claude Code drop-in/router, and MCP/agentic tool use is limited versus MCP-native agents.

**sources**: - https://github.com/Aider-AI/aider<br>- https://aider.chat/docs/llms/ollama.html<br>- https://aider.chat/docs/troubleshooting/edit-errors.html<br>- https://github.com/Aider-AI/aider/issues/3010<br>- https://github.com/Aider-AI/aider/issues/1208<br>- https://github.com/Aider-AI/aider/issues/3651<br>- https://github.com/Aider-AI/aider/issues/2371<br>- https://dev.to/ryoryp/zero-cost-ai-pair-programming-mastering-aider-with-local-llms-ollama-5ae4

### Uncertain fields

- hardware_awareness
- claude_code_compat

## Athanor Lite

**name**: Athanor Lite

**category**: model-manager

**url**: https://github.com/BBALabs/athanor-lite

**license**: Source-available, NOT open source. Custom 'Athanor Lite - Source-Available License' (c) 2026 Tony Winslow / Black Box Analytics. Grants view/study/evaluate, build-from-source for personal non-commercial use, and fork-to-contribute-upstream only. Explicitly FORBIDS redistribution (source or binary) as a product/service, commercial use, and removing notices. Not an OSI-approved license; fails the OSI open-source definition (no commercial use, no free redistribution).

**pricing**: Free. Athanor Lite is the no-cost edition; the paid full 'Athanor' product (bbasecure.com/athanor) adds RAG document knowledge, MCP tool connections, multi-model compare, and fine-tuning. No subscription required for Lite.

**platforms**: Windows-only, confirmed. Windows 10/11 64-bit; requires WebView2 Runtime. Built with Tauri + Rust (MSVC toolchain) with a llama.cpp sidecar. No macOS or Linux build (Apple Silicon not supported). NVIDIA GPU recommended for acceleration; CPU-only fallback supported.

**local_model_support**: Runs models fully locally through a managed llama.cpp runtime (bundled sidecar), streaming chat. Curated catalog of verified GGUF models with exact file sizes and SHA-256 checksums; resumable, checksum-verified downloads. Can adopt an existing Ollama library in place via hard links (zero re-download). One-click 'download -> chat'.

**hardware_awareness**: This is its flagship strength. Live hardware dashboard: GPU identification (architecture, driver, CUDA), VRAM ring, CPU/mem/GPU/disk meters at 1 Hz, plus a real tokens/sec speed benchmark. Every quant of every catalog model gets a per-machine fit verdict computed from your GPU: fits fully / fits tight / needs GPU+CPU split / CPU-only / exceeds this machine, with the best pick for your hardware surfaced first. Marketed as 'honest memory math, not guesswork' and pre-flights downloads against free disk space.

**agentic_coding_features**: None. Athanor Lite is a model manager + private chat client, not a coding agent. No file editing, no tool/terminal execution, no multi-file refactors, no CLI coding mode. MCP is a feature of the paid full Athanor product, not Lite.

**popularity**: ~38 GitHub stars, ~5 forks, 0 open issues, 1 open PR, ~37 commits, latest tag v0.1.1 (github.com/BBALabs/athanor-lite, fetched 2026-07-24). Very early-stage / low traction; effectively a solo-developer project by Tony Winslow.

**pain_points**: - No genuine user complaints were found. The project is brand new (v0.1.1, ~37 commits) with 0 open and effectively no closed issues, and negligible community discussion, so no real complaint quotes exist to cite: https://github.com/BBALabs/athanor-lite/issues<br>- Structural friction (from primary sources, not user quotes): it is source-available, not open source, so commercial use and redistribution are prohibited by the LICENSE - https://github.com/BBALabs/athanor-lite/blob/main/LICENSE ; and it is Windows-only with no macOS/Linux/Apple Silicon build, per the README prerequisites - https://github.com/BBALabs/athanor-lite/blob/main/README.md

**gap_vs_vision**: Athanor Lite is the closest thing to the 'honest hardware fit-math + one-click local model' half of the vision, but it stops at private CHAT. It has no agentic coding (no file edits, tools, terminal, MCP, CLI) and no Claude Code compatibility. It is also Windows-only (excludes the large Mac/Apple Silicon local-LLM audience) and source-available rather than truly free/open, so it cannot be freely redistributed or used commercially. It solves 'which model fits my machine' beautifully but not 'local Claude Code for everyone.'

**sources**: - https://github.com/BBALabs/athanor-lite<br>- https://github.com/BBALabs/athanor-lite/blob/main/LICENSE<br>- https://github.com/BBALabs/athanor-lite/blob/main/README.md<br>- https://github.com/BBALabs/athanor-lite/issues<br>- https://bbasecure.com/athanor<br>- https://github.com/ggml-org/llama.cpp

### Uncertain fields

- claude_code_compat

## Cline / Roo Code

**name**: Cline / Roo Code

**category**: ide-extension

**url**: https://github.com/cline/cline

**license**: Apache-2.0 (both are truly open source; Roo Code is a fork of Cline, also Apache-2.0 at https://github.com/RooCodeInc/Roo-Code/blob/main/LICENSE)

**pricing**: Extensions are free/open source. No subscription to install. Cost comes entirely from the model/API you connect (cloud API keys are pay-per-token; local models via Ollama/LM Studio are free). BYO-key or BYO-local-endpoint model.

**platforms**: Cross-platform via VS Code (macOS Intel and Apple Silicon, Windows, Linux). Roo Code additionally forked for other editors but was archived May 2026. No native OS binary; runs wherever VS Code runs.

**agentic_coding_features**: Full agentic loop: multi-file editing with diff view, terminal command execution, file read/write, browser use (Cline), Plan/Act modes (Cline) and multiple modes (Roo Code), MCP server support, checkpoints. Tight VS Code integration (sidebar); no standalone CLI.

**claude_code_compat**: Not a Claude Code bridge. They are independent VS Code agents. They can consume the same local OpenAI-compatible endpoints Claude Code can, but they do not expose or emulate the Anthropic Messages API and are not used to point Claude Code at a backend.

**pain_points**: quote: every time I send a message to cline...it quickly maxes out the context or sets it to like 27K tokens for some reason ... I try to compact the conversation, and it goes right back up to around +20k, defeating the purpose. (Using qwen3-coder-30b-a3b with 32K context; Ollama logs show prompt sizes of 85K-114K tokens.) | url: https://github.com/cline/cline/issues/7048<br>quote: 'Cline is having trouble...' error loops with CodeLlama 7B, Phi4, DeepSeek R1 ... '[ERROR] You did not use a tool in your previous response!' -- tool calling failures and context window limitations causing widespread user frustration. | url: https://github.com/cline/cline/issues/4362<br>quote: Local Ollama Models Not Responsive: 'API Request, then nothing' -- selecting the Ollama provider and llama3.1:latest returns no response, though the models work fine when tested directly from bash. | url: https://github.com/RooCodeInc/Roo-Code/issues/11049<br>quote: Roo code won't connect to external Ollama server -- cannot connect to Ollama on non-localhost/LAN addresses (e.g. http://10.3.4.5:11434); model reported as unavailable. (Reopened as #11466.) | url: https://github.com/RooCodeInc/Roo-Code/issues/6589

**gap_vs_vision**: Do not deliver 'hardware-aware local Claude Code for everyone.' No hardware detection or memory-fit model recommendations; users must hand-tune Ollama context length or hit silent truncation/tool-call loops. Local-model tool-call reliability is fragile (needs 20B-30B+ agent-tuned models and 24GB+ VRAM to be dependable). They are VS Code-bound (no CLI), and Roo Code is now archived, reducing its long-term viability.

**sources**: - https://github.com/cline/cline<br>- https://github.com/cline/cline/issues/7048<br>- https://github.com/cline/cline/issues/4362<br>- https://github.com/RooCodeInc/Roo-Code<br>- https://github.com/RooCodeInc/Roo-Code/issues/11049<br>- https://github.com/RooCodeInc/Roo-Code/issues/6589<br>- https://github.com/RooCodeInc/Roo-Code/issues/11466<br>- https://github.com/RooCodeInc/Roo-Code/blob/main/LICENSE<br>- https://llmconfigurator.com/en/guides/coding-agents/cline-with-local-llms<br>- https://www.bodegaone.ai/blog/roo-code-shutdown-alternatives

### Uncertain fields

- local_model_support
- hardware_awareness
- popularity

## Continue.dev

**name**: Continue.dev

**category**: ide-extension

**url**: https://github.com/continuedev/continue

**pricing**: Open-source extension is free. Optional Continue Hub / cloud features existed but are being wound down post-acquisition. Local model usage is free; cloud model usage is BYO-key pay-per-token.

**platforms**: VS Code and JetBrains IDEs, on macOS (Intel and Apple Silicon), Windows, Linux. No standalone binary; runs inside the host IDE.

**local_model_support**: Connects to local models via Ollama, LM Studio, llama.cpp, and any OpenAI-compatible endpoint. Supports separate models for chat, autocomplete (tabAutocompleteModel), and embeddings, so users typically run a small completion model plus a larger chat model. Config via config.yaml/JSON. No bundled inference engine.

**agentic_coding_features**: Chat, inline edit, autocomplete/tab completion, @codebase and @-context providers, and an Agent mode with tool calling (run_terminal_command, file edits, grep_search, etc.) and MCP support. Strong at retrieval/autocomplete; agentic tool-calling is weaker with local models. VS Code + JetBrains integration; no dedicated CLI.

**claude_code_compat**: Not a Claude Code bridge. Independent assistant that speaks OpenAI-compatible and provider-native APIs. Does not emulate the Anthropic Messages API and is not used to point Claude Code at a backend.

**pain_points**: quote: continue tool calling with supported models not working -- 'when i am using this model [gpt-oss-20b], i am getting xml/json instead of the tool use,' plus an exclamation mark warning that the model isn't supported, despite docs listing it as supported for tool calling. A smaller 7B Qwen model did execute tool calls. | url: https://github.com/continuedev/continue/issues/9157<br>quote: Feature Request: Support Qwen3 Coder 30B Local Model for Tool Calls -- users request/report that local coder models load and respond but tool-call requests are printed literally instead of being executed. | url: https://github.com/continuedev/continue/issues/6913

**gap_vs_vision**: Does not provide 'hardware-aware local Claude Code for everyone.' No hardware auto-detection or memory-fit model recommendation (only static docs guidance). Local-model agentic tool calling is unreliable -- models emit raw XML/JSON instead of invoking tools, or are flagged unsupported. It is IDE-bound (no CLI, not a Claude Code backend), and upstream development effectively ended with the June 2026 Cursor acquisition, creating maintenance/continuity risk.

**sources**: - https://github.com/continuedev/continue<br>- https://github.com/continuedev/continue/issues/9157<br>- https://github.com/continuedev/continue/issues/6913<br>- https://docs.continue.dev/customize/deep-dives/model-capabilities<br>- https://llmhardware.io/guides/continue-dev-guide<br>- https://www.sitepoint.com/continuedev-for-developers-the-complete-local-ai-coding-assistant-setup/<br>- https://www.bodegaone.ai/blog/roo-code-shutdown-alternatives

### Uncertain fields

- license
- hardware_awareness
- popularity

## Goose (Block)

**name**: Goose (Block)

**category**: agentic-cli

**url**: https://github.com/block/goose

**license**: Apache-2.0 (SPDX: Apache-2.0), truly open source

**pricing**: Free and open source; no subscription. Bring-your-own LLM provider - pay the provider's rate, or nothing when running local models.

**local_model_support**: Works with 15+ providers including Ollama, plus OpenAI-compatible endpoints, OpenRouter, Azure, Bedrock, Anthropic, Google. Local models are configured via `goose configure` (Ollama provider). In practice local tool-calling models (Qwen 2.5/3, etc.) are needed, and reliability is a well-documented weak spot.

**agentic_coding_features**: MCP-native: connects to 70+ extensions via the Model Context Protocol. Autonomous agent that edits files, executes shell commands, uses tools/extensions, and runs multi-step tasks from CLI or desktop app. Tool use is central, which makes it especially sensitive to local models' tool-calling quality.

**popularity**: 51,607 GitHub stars (repo block/goose, resolved via GitHub API redirect, 2026-07-24).

**pain_points**: - Local models routinely emit malformed JSON and Goose hard-fails the tool call: 'the experience with local models (even capable ones like Qwen 2.5 7B/14B) is severely degraded because they frequently emit malformed JSON when attempting tool calls' and 'When a local model misses a quote, leaves a trailing comma, or includes reasoning text inside the JSON block, Goose simply fails the tool call' - making 'the local experience feel fragile and unusable compared to the robust handling of cloud providers like Anthropic.' https://github.com/block/goose/issues/6688<br>- Qwen3-coder tool calling breaks past a small tool count: works with ~5 tools or fewer, but Goose's default developer extension exposes 11 tools, and above ~5 the model 'outputs XML-formatted tool calls within the content field' instead of structured JSON, so tools never execute. https://github.com/block/goose/issues/6883<br>- Chat mode still sends tools to models that don't support them: 'Ollama streaming ignores chat mode - still sends tools to models that don't support them' (e.g. deepseek-coder:6.7b), producing errors even with tools disabled. https://github.com/block/goose/issues/6117<br>- Local Qwen models return raw XML text rather than parsed tool calls when any tool-bearing extension is enabled. https://github.com/block/goose/issues/3748<br>- General 'Unhelpful responses for Tool Calling functionality with Ollama' and 'Request failed' errors during `goose configure` with a local Ollama model. https://github.com/block/goose/issues/1817 , https://github.com/block/goose/issues/2314

**gap_vs_vision**: Being MCP-native and tool-heavy makes Goose powerful with frontier models but especially brittle with local open-source models, the opposite of 'hardware-aware local Claude Code for everyone.' No hardware/memory awareness. Local models' malformed-JSON and XML-vs-JSON tool-call failures, plus the large default tool count exceeding what small models handle, mean agentic workflows frequently fail locally; maintainers/users have proposed json-repair-style coercion that is not yet standard. Reliable use still gravitates to paid cloud APIs.

**sources**: - https://github.com/block/goose<br>- https://github.com/block/goose/issues/6688<br>- https://github.com/block/goose/issues/6883<br>- https://github.com/block/goose/issues/6117<br>- https://github.com/block/goose/issues/3748<br>- https://github.com/block/goose/issues/1817<br>- https://github.com/block/goose/issues/2314<br>- https://github.com/block/goose/discussions/1403<br>- https://goose-docs.ai/docs/troubleshooting/known-issues/

### Uncertain fields

- platforms
- hardware_awareness
- claude_code_compat

## Hardware-aware model fit tools (canirunthisllm.net, CanItRun.dev, VRAM calculators, Apple MLX / mlx-lm, Hugging Face hardware filters)

**name**: Hardware-aware model fit tools (canirunthisllm.net, CanItRun.dev, VRAM calculators, Apple MLX / mlx-lm, Hugging Face hardware filters)

**category**: model-manager

**url**: https://www.canirunthisllm.net/

**license**: Mixed across the category. canirunthisllm.net / CanItRun.dev are free hosted web tools (proprietary/closed site code). Apple MLX and mlx-lm are true open source (MIT, github.com/ml-explore/mlx, github.com/ml-explore/mlx-lm). Community VRAM calculators on Hugging Face Spaces (e.g. NyxKrage LLM-Model-VRAM-Calculator) are typically MIT/Apache open source. Hugging Face hardware filters are part of the (proprietary) HF Hub site.

**pricing**: All free. Web calculators are free-to-use hosted sites; MLX/mlx-lm and the HF Spaces calculators are free open source; HF Hub browsing/filtering is free. No subscriptions.

**platforms**: Web calculators are browser-based (any OS). They MODEL many targets: NVIDIA/AMD/Intel GPUs and Apple Silicon unified memory. Apple MLX / mlx-lm is macOS Apple-Silicon-only (M-series). HF hardware filters are web-based.

**local_model_support**: These are estimators/enablers, not runtimes (except MLX). canirunthisllm.net and CanItRun.dev tell you which open-weight LLMs and quant levels fit your VRAM/RAM and give tokens/sec + benchmark estimates. mlx-lm actually RUNS models on Apple Silicon and exposes an OpenAI-compatible server (mlx_lm.server) that Aider, Continue, Claude Code, etc. can point at. HF filters help you find models by size/library.

**hardware_awareness**: This IS the category's whole point, but honesty/automation varies. The web calculators require you to MANUALLY enter GPU/VRAM and model/quant/context; they estimate memory but are widely reported to be inaccurate at the edges (over- or under-estimating, especially KV-cache/context and training overhead). None auto-detect your actual hardware. Apple MLX has no fit-recommendation UI (you pick the model). By contrast the closest auto-detecting fit tool is Athanor Lite (separate item), which reads real GPU/VRAM and gives per-quant verdicts.

**agentic_coding_features**: Essentially none across the pure fit tools. Calculators output numbers/verdicts only. mlx-lm provides the model server but no agent; agentic coding requires bolting on a separate tool (Aider/Continue/Claude Code/OpenHands) that the user must install and wire up. Some community MLX setups (e.g. navikt/mlx-workspace) script a local server + connect coding tools, but they assume you already chose a fitting model and do not do the fit math.

**pain_points**: - VRAM calculators are widely distrusted as inaccurate: an HN commenter noted a calculator claimed a 3.77B model needs 62GB to train, yet they had trained a 14B model on 24GB with optimizations - https://news.ycombinator.com/item?id=44676961<br>- Context/KV-cache memory is poorly modeled: users question why calculators report huge VRAM for context on some models vs others and get numbers that don't match reality - https://huggingface.co/deepseek-ai/deepseek-coder-6.7b-instruct/discussions/18<br>- The tools stop at 'a number' and don't get you running: CanItRun.dev is explicitly 'strictly an informational resource for hardware-model matching' and does not set up or launch anything - https://canitrun.dev/

**gap_vs_vision**: This is the core gap the vision targets. As of mid-2026, NO tool combines honest, auto-detected hardware fit-math WITH one-command agentic coding setup. The fit calculators (canirunthisllm.net, CanItRun.dev, HF calculators) require manual specs, are often inaccurate, and end at a verdict. Apple MLX/mlx-lm runs models and serves an OpenAI-compatible API but offers no fit recommendation and no agent. Athanor Lite does auto-detected fit-math + one-click chat but no coding agent and is Windows-only/source-available. OpenHands/Aider/Claude Code do agentic coding but have zero hardware awareness. Nobody closes the loop: detect hardware -> recommend a model that truly fits -> auto-configure a working local agentic coding agent, free and no subscription.

**sources**: - https://www.canirunthisllm.net/<br>- https://canitrun.dev/<br>- https://huggingface.co/spaces/NyxKrage/LLM-Model-VRAM-Calculator<br>- https://apxml.com/tools/vram-calculator<br>- https://news.ycombinator.com/item?id=44676961<br>- https://huggingface.co/deepseek-ai/deepseek-coder-6.7b-instruct/discussions/18<br>- https://github.com/navikt/mlx-workspace<br>- https://developer.apple.com/videos/play/wwdc2026/232/<br>- https://dev.to/brunocerberus/running-local-llms-on-apple-silicon-2ecm

### Uncertain fields

- claude_code_compat
- popularity

## LM Studio

**name**: LM Studio

**category**: desktop-app

**url**: https://lmstudio.ai

**license**: Proprietary / closed source. The desktop app is not free/libre/open-source software; only some supporting SDKs and CLI pieces are open. As of July 8, 2025 it is free for both personal and commercial/workplace use (the previous commercial-license requirement was removed).

**pricing**: Free for personal and commercial use; no paid tier or subscription required. Revenue model is not usage-billed to end users.

**platforms**: macOS (Apple Silicon officially supported; Intel Mac builds exist but are effectively unsupported/legacy), Windows (x64 and ARM64), Linux (x64). macOS requires roughly macOS 13 Ventura or later. Uses Apple MLX engine on Apple Silicon plus a llama.cpp-based backend.

**local_model_support**: Runs local GGUF models via a bundled llama.cpp engine and MLX models on Apple Silicon. Built-in model search/browser pulls quantized models from Hugging Face. Provides an OpenAI-compatible local server (/v1/chat/completions, /v1/completions, /v1/embeddings) and, in newer 0.4 builds, a server-native daemon and stateful REST API.

**hardware_awareness**: Relatively strong compared to peers: the model-search UI flags whether a given model/quant is likely to fit the detected RAM/VRAM (e.g. 'full GPU offload possible' vs 'may be too large') and lets users tune GPU offload layers and context length. Detection is not perfect — users still hit OOM/'Unsupported device' situations and must manually reduce context length.

**agentic_coding_features**: Primarily a chat + local-inference GUI and server, not an agentic coding tool. It has no native file-editing, multi-file refactor, or terminal-execution agent. It gained MCP client support (can connect to MCP servers) and its OpenAI-compatible server lets external agentic coding tools (Cline, Continue, aider, etc.) use it as a backend. No first-party VS Code extension or agentic CLI.

**pain_points**: complaint: Closed-source frustration: community members 'discount LM Studio due to it not being open-sourced,' preferring transparency and auditability; a recurring r/LocalLLaMA thread asks 'Why do people say LM Studio isn't open-sourced?' and users migrate to open alternatives like Jan over the proprietary concern. | url: https://www.reddit.com/r/LocalLLaMA/comments/1cvawmz/why_do_people_say_lm_studio_isnt_opensourced/<br>complaint: Model-loading failures: users report errors when loading models (e.g. exit codes like 18446744072635812000) and 'Unsupported device' errors where LM Studio refuses to use a GPU that previously worked, sometimes only fixable by reducing context length or reinstalling GPU drivers. | url: https://discuss.huggingface.co/t/error-while-loading-a-model/140598<br>complaint: Hacker News commenters argue that 'LM Studio isn't free/libre/open source software, which misses the point' of running models locally for privacy/control, since users cannot inspect what the proprietary app does with their data. | url: https://news.ycombinator.com/item?id=47626103

**gap_vs_vision**: Does not fully realize 'hardware-aware local Claude Code for everyone, no subscription.' It nails the no-subscription and (partly) hardware-aware parts, but it is closed source (a dealbreaker for privacy/transparency-focused users), has no native agentic coding or Claude Code compatibility (OpenAI-compatible only, requires a bridge), dropped effective Intel-Mac support, and is a GUI-centric chat/server rather than an agentic CLI.

**sources**: - https://lmstudio.ai<br>- https://lmstudio.ai/docs/app/system-requirements<br>- https://simonwillison.net/2025/Jul/8/lm-studio-is-free-for-use-at-work/<br>- https://news.ycombinator.com/item?id=47626103<br>- https://www.reddit.com/r/LocalLLaMA/comments/1cvawmz/why_do_people_say_lm_studio_isnt_opensourced/<br>- https://discuss.huggingface.co/t/error-while-loading-a-model/140598<br>- https://alternativeto.net/news/2026/1/lm-studio-0-4-adds-parallel-model-requests-server-native-daemon-and-new-stateful-rest-api<br>- https://www.makeuseof.com/stopped-using-lm-studio-found-open-source-alternative/

### Uncertain fields

- claude_code_compat
- popularity

## Ollama

**name**: Ollama

**category**: local-runtime

**url**: https://github.com/ollama/ollama

**license**: MIT License (SPDX: MIT). The local runtime is genuinely open source; the newer Ollama Cloud/Turbo hosted-inference service is a proprietary paid backend layered on top.

**pricing**: Local use is free. Ollama Cloud (Turbo) adds a hosted-inference subscription with fixed tiers: Free $0, Pro $20/month (or $200/year), Max $100/month. Higher tiers add larger cloud models, more concurrency, and higher usage caps. Launched in preview August 2025.

**platforms**: macOS (Apple Silicon and Intel), Windows, Linux; official Docker image. GPU acceleration via Metal (macOS), CUDA (NVIDIA), ROCm/Vulkan (AMD), and experimental Intel iGPU/Vulkan.

**local_model_support**: Runs open-weight GGUF models pulled from the Ollama model library (Llama, Gemma, DeepSeek, Qwen, gpt-oss, etc.). Historically wraps llama.cpp; has been adding its own inference engine. Exposes a native REST API plus an OpenAI-compatible /v1 endpoint (/v1/chat/completions). Can also proxy to hosted models via Ollama Cloud.

**agentic_coding_features**: No built-in agentic coding, file editing, or terminal-execution features of its own. It functions purely as a model server/backend; agentic capabilities come from external clients (Cline, Continue, OpenClaw, Open WebUI, aider, etc.) that call its API. No native MCP host, no VS Code extension shipped by the project itself.

**popularity**: ~176.8k GitHub stars (https://github.com/ollama/ollama, observed 2026-07). One of the most-starred local-LLM projects on GitHub.

**pain_points**: complaint: No hardware-aware guidance: 'A new Ollama user faces a blank prompt with no guidance on which model to run,' leading to 'Out-of-memory crashes when VRAM is insufficient' and 'Multi-minute load times from unexpected CPU offloading.' The reporter summarizes: 'There is currently no way to ask Ollama what can my machine actually run?' (open feature request for `ollama fit`). | url: https://github.com/ollama/ollama/issues/14771<br>complaint: Memory is not released: 'all models across the board run out of memory eventually as if they we're not freeing it after generation,' persisting even in versions where a specific model fix was supposedly applied. | url: https://github.com/ollama/ollama/issues/10114<br>complaint: Inaccurate hardware/memory detection: 'Even though I have >1GB VRAM used by other applications (i.e. desktop environment, browser), ollama reports that the memory is almost unused,' causing 'graph_reserve: failed to allocate compute buffers' crashes unless the user manually pads ~3GB of overhead. | url: https://github.com/ollama/ollama/issues/13018<br>complaint: Community debate over the pivot to a paid Turbo cloud service, with users arguing it undercuts Ollama's local-first identity and pushes hosted/subscription usage. | url: https://biggo.com/news/202508060113_Ollama_Launches_Turbo_Cloud_Service

**gap_vs_vision**: Does not deliver 'hardware-aware local Claude Code for everyone, no subscription.' It has no built-in agentic coding (relies on third-party clients), no honest/automatic hardware-fit recommendation (the `fit` capability is only a proposal and memory estimation is frequently wrong), is not natively Anthropic/Claude Code compatible (needs a proxy), and its strategic direction is now steering users toward a paid cloud subscription rather than optimizing the free local experience.

**sources**: - https://github.com/ollama/ollama<br>- https://github.com/ollama/ollama/issues/14771<br>- https://github.com/ollama/ollama/issues/10114<br>- https://github.com/ollama/ollama/issues/13018<br>- https://biggo.com/news/202508060113_Ollama_Launches_Turbo_Cloud_Service<br>- https://x.com/ollama/status/2032744932633620611<br>- https://aimec.io/what-is-ollama-cloud-how-it-works/<br>- https://www.infralovers.com/blog/2025-08-13-ollama-2025-updates/

### Uncertain fields

- hardware_awareness
- claude_code_compat

## OpenCode (sst/opencode)

**name**: OpenCode (sst/opencode)

**category**: agentic-cli

**url**: https://github.com/sst/opencode

**license**: MIT (SPDX: MIT), truly open source

**pricing**: Free and open source; no subscription. Bring-your-own-provider - pay whatever the chosen LLM provider charges, or nothing when using local models.

**platforms**: Terminal (TUI) app for macOS (Apple Silicon and Intel), Linux, and Windows. Installed via Homebrew, Scoop, npm/curl script, and other package managers. Provider-agnostic client (models catalog via models.dev).

**local_model_support**: Connects to local models via OpenAI-compatible endpoints, including Ollama (baseURL http://localhost:11434/v1 configured in opencode.json) and LM Studio. Supports many providers through models.dev. In practice, reliable file operations require strong tool-calling local models (e.g. Qwen3/qwen2.5-coder); weaker models fail to actually edit files.

**agentic_coding_features**: Claude-Code-like TUI agent: read/edit/write files, run terminal commands, multi-step agentic loops, LSP integration, session/sharing, and MCP support. Client/server architecture allowing a shared server driven by TUI or other clients. Broad provider support.

**popularity**: 189,330 GitHub stars (repo sst/opencode, resolved via GitHub API redirect, 2026-07-24) - one of the most-starred agentic coding CLIs.

**pain_points**: - Tool calls appear to succeed but nothing happens on disk: 'Ollama (qwen2.5-coder): tool calls (edit/write) show as executed but no files are created/modified' - 'the JSON tool payload is printed in the output, but no files are actually created or modified on disk.' https://github.com/sst/opencode/issues/7030<br>- Local Ollama models are not agentic: 'If I use it with any Ollama model whether local or cloud, it is not able to see files' despite Ollama supporting tool calling (opencode v1.0.164). https://github.com/sst/opencode/issues/5694<br>- Local Ollama tool calling either not calling or failing outright - models think about which tool to use but never execute; tool-call JSON is printed to chat but commands don't run. https://github.com/sst/opencode/issues/1034<br>- Wrong tool names with some local models: model looks for a 'read_file' tool instead of opencode's 'read' tool, so file reads never happen (gemma running via Ollama). https://github.com/sst/opencode/issues/21354<br>- Beginners hit a documentation/setup gap for local models: 'I want to use the local model of ollama but I don't know how to do it. The API for using the good model is too expensive.' https://github.com/sst/opencode/issues/4851

**gap_vs_vision**: Despite huge popularity and a polished Claude-Code-like TUI, the local-model story is the weak point relative to 'hardware-aware local Claude Code for everyone.' No hardware/memory awareness; and with local Ollama models tool calls frequently misfire - files silently not written, models not seeing files, or emitting mismatched tool names - so agentic editing is unreliable unless a strong tool-calling model is used. Works best with frontier cloud models, which defeats the no-subscription/local goal for many users.

**sources**: - https://github.com/sst/opencode<br>- https://github.com/sst/opencode/issues/7030<br>- https://github.com/sst/opencode/issues/5694<br>- https://github.com/sst/opencode/issues/1034<br>- https://github.com/sst/opencode/issues/21354<br>- https://github.com/sst/opencode/issues/4851<br>- https://github.com/imagewize/ollama-opencode-setup

### Uncertain fields

- hardware_awareness
- claude_code_compat

## OpenHands (formerly OpenDevin)

**name**: OpenHands (formerly OpenDevin)

**category**: agentic-cli

**url**: https://github.com/OpenHands/OpenHands

**license**: MIT License (true open source). Note: the GitHub org was previously All-Hands-AI/OpenHands and now redirects to OpenHands/OpenHands.

**pricing**: Core platform is free and self-hostable. All Hands AI also offers a paid managed OpenHands Cloud with usage-based/credit pricing; running fully local against your own models is free apart from your own compute/API costs.

**platforms**: Cross-platform via Docker (Linux, macOS incl. Apple Silicon, Windows via WSL2). Runs the agent runtime in a Docker sandbox container; also available as a CLI and a VS Code-style web UI. GPU only needed if you serve a local model on the same machine.

**local_model_support**: Connects to any OpenAI-compatible endpoint via LiteLLM. Documented local paths include Ollama, LM Studio, vLLM, and SGLang. As of 2026 the docs recommend an open-weight MoE model (e.g. Qwen3.x ~30B-class) as the first local model; All Hands also ships OpenHands LM 32B (runnable on a single 24GB GPU like a 3090). Requires custom model name + base_url + a (often dummy) API key.

**hardware_awareness**: None built in. OpenHands does not detect your GPU/VRAM or recommend a model that fits your machine. Model selection is entirely manual; docs give rough guidance (>=8GB RAM if using cloud APIs; GPU recommended for local models) but the app performs no honest memory-fit math.

**agentic_coding_features**: Full autonomous agent: reads/edits files, runs shell commands in a sandboxed runtime, browses the web, writes and runs code, does multi-file refactors, and opens pull requests. Supports MCP servers/tools, a CLI headless mode, a web GUI, and GitHub/GitLab integrations. Micro-agents and custom agent configs supported.

**popularity**: ~82,000 GitHub stars, ~10,500 forks, ~134 open issues (github.com/OpenHands/OpenHands, fetched 2026-07-24). One of the most-starred OSS coding-agent projects; All Hands AI raised an $18.8M Series A.

**pain_points**: - Local models are dramatically slower through OpenHands than standalone: 'When I run it with openDevin, the request and response are extremely slow and I get devin output every 30 minutes!' (llama2 was fast via `ollama run llama2` directly) - https://github.com/OpenHands/OpenHands/issues/1253<br>- Slow local models trip the default timeout with no useful feedback: 'long generations from local models can exceed the default timeout. This causes OpenHands to disconnect before the response is ready, resulting in a loop of retry attempts with no clear explanation or feedback.' - https://github.com/OpenHands/OpenHands/issues/8768<br>- Local/timeout failures manifest as opaque LiteLLM errors: '[Bug]: Using local OpenHands model requests timeout "litellm.exceptions.Timeout: litellm.Timeout: APITimeoutError"' - https://github.com/OpenHands/OpenHands/issues/7716<br>- Users repeatedly struggle to get any local LLM working well and find small models too weak for the agent loop (thread of people trying many local models) - https://github.com/OpenHands/OpenHands/issues/1336 and https://github.com/OpenHands/OpenHands/issues/6918

**gap_vs_vision**: OpenHands nails the agentic-coding half but leaves the 'hardware-aware, works-on-my-machine' half entirely to the user: no GPU/VRAM detection, no honest fit math, no curated 'this model runs on your box' recommendation. Getting a good local experience requires a beefy GPU (24GB+ for the 32B model) and manual endpoint wiring; small models produce poor results and timeouts. It is powerful but not a turnkey 'local Claude Code for everyone, no subscription' on modest hardware.

**sources**: - https://github.com/OpenHands/OpenHands<br>- https://docs.openhands.dev/openhands/usage/llms/local-llms<br>- https://github.com/OpenHands/OpenHands/issues/1253<br>- https://github.com/OpenHands/OpenHands/issues/8768<br>- https://github.com/OpenHands/OpenHands/issues/7716<br>- https://github.com/OpenHands/OpenHands/issues/1336<br>- https://github.com/OpenHands/OpenHands/issues/6918<br>- https://huggingface.co/OpenHands/openhands-lm-32b-v0.1<br>- https://dev.to/udiko/how-to-run-openhands-with-a-local-llm-using-lm-studio-41j6

### Uncertain fields

- claude_code_compat

## claude-code-router (and Claude Code with local models via ANTHROPIC_BASE_URL / y-router / LiteLLM)

**name**: claude-code-router (and Claude Code with local models via ANTHROPIC_BASE_URL / y-router / LiteLLM)

**category**: bridge/router

**url**: https://github.com/musistudio/claude-code-router

**pricing**: Router software is free/open source. No subscription for the router. You still supply backends: local models are free; cloud backends (OpenRouter, DeepSeek, etc.) are pay-per-token. Claude Code CLI is free to install; pointing it at a non-Anthropic backend means you are not consuming an Anthropic subscription for those calls.

**platforms**: claude-code-router: macOS (Apple Silicon + Intel), Windows, Linux; CLI via npm (Node.js 22+) and Docker. As a router it runs anywhere Node/Docker runs. Claude Code CLI itself: macOS, Linux, Windows (WSL).

**hardware_awareness**: None. Routers/bridges do no hardware detection and give no memory-fit model recommendations -- they are pure request plumbing. Whether a model fits VRAM/RAM is entirely the user's responsibility on the backing inference server. Community guidance repeatedly notes 32K context is the floor and 64K the sweet spot for Claude-Code-style agentic use, but nothing enforces or recommends this automatically.

**agentic_coding_features**: Inherits all of Claude Code's agentic features (file edit, terminal execution, multi-file work, MCP, subagents) because Claude Code remains the front end -- the router only swaps the model backend. The hard part is tool-call fidelity: Claude Code emits Anthropic-format tool_use blocks that must be translated to/from the backend's tool schema, and local models frequently ignore tools or emit malformed calls. LiteLLM/claude-code-router can inject tool definitions into prompts for models lacking native tool support (issue #685).

**pain_points**: quote: Issue with local Ollama (gpt-oss:20b) -- model called but not using tools: 'the model responds, but completely ignores tool calls (as if they were not available or it can't invoke them),' despite receiving tool definitions in requests. | url: https://github.com/musistudio/claude-code-router/issues/790<br>quote: Runtime error that the local LLM does not support tools -- 'registry.ollama.ai/library/codeqwen:latest does not support tools' -- when trying to use a single local model with ccr. | url: https://github.com/musistudio/claude-code-router/issues/121<br>quote: Feature request to 'add support for simulating tool calling capability by injecting tool definitions into prompts for non-tool calling models' (like LiteLLM), because many local models lack native tool calling and break Claude Code's agent loop. | url: https://github.com/musistudio/claude-code-router/issues/685<br>quote: Users formally asked whether it is 'permissible under Anthropic's ToS to use the ANTHROPIC_BASE_URL environment variable to route SDK/API requests to custom models... and publish adapters or code on GitHub that enables others to use ANTHROPIC_BASE_URL to connect to non-Anthropic models' -- issue closed with no clear public affirmative answer. | url: https://github.com/anthropics/claude-code/issues/5577

**gap_vs_vision**: Closest architecture to 'local Claude Code without subscription,' but still not the full vision. Zero hardware awareness -- no detection or model-fit recommendation; the user must size models to their machine manually. Tool-call fidelity with local models is the dominant failure mode: local models ignore or malform Anthropic-style tool_use, breaking multi-step agentic tasks, so prompt-injection shims are needed. Setup (env vars, proxy config, per-provider transformers) is non-trivial for non-experts. And there is unresolved Terms-of-Service ambiguity about routing Claude Code to non-Anthropic backends, which is a legal/adoption risk the vision would need to clear.

**sources**: - https://github.com/musistudio/claude-code-router<br>- https://github.com/musistudio/claude-code-router/issues/790<br>- https://github.com/musistudio/claude-code-router/issues/121<br>- https://github.com/musistudio/claude-code-router/issues/685<br>- https://github.com/anthropics/claude-code/issues/5577<br>- https://code.claude.com/docs/en/legal-and-compliance<br>- https://huggingface.co/blog/ggml-org/anthropic-messages-api-in-llamacpp<br>- https://renezander.com/guides/claude-code-local-llm-anthropic-base-url/<br>- https://www.kdnuggets.com/pairing-claude-code-with-local-models

### Uncertain fields

- license
- local_model_support
- claude_code_compat
- popularity

## llama.cpp / llama-server

**name**: llama.cpp / llama-server

**category**: local-runtime

**url**: https://github.com/ggml-org/llama.cpp

**license**: MIT License (SPDX: MIT). Fully open source.

**pricing**: Free and open source; no tiers, no subscription. Users bear only their own hardware/compute costs.

**platforms**: Cross-platform: macOS (Apple Silicon and Intel) with Metal GPU acceleration, Linux, Windows; also Android, embedded/CPU-only. GPU backends include Metal, CUDA, ROCm/HIP, Vulkan, SYCL. Distributed as source plus prebuilt binaries; the HTTP server ships as the `llama-server` binary.

**local_model_support**: The core GGUF inference engine. Runs quantized GGUF models directly; underlies many downstream tools (Ollama, LM Studio, Jan, etc.). `llama-server` provides a lightweight HTTP server with a built-in web UI plus a native API and OpenAI-compatible endpoints.

**agentic_coding_features**: None built in. It is an inference engine/server, not an agent; it has no file editing, multi-file refactor, or terminal-execution features. Agentic behavior comes from external clients (aider, Cline, OpenCode, Continue) that call llama-server. Tool/function calling is supported at the API level (via the OpenAI-compatible endpoint and Jinja chat templates) but is reported to be fragile with some models.

**popularity**: ~121.5k GitHub stars (https://github.com/ggml-org/llama.cpp, observed 2026-07). The foundational engine behind most consumer local-LLM tooling.

**pain_points**: complaint: Missing OpenAI Responses API blocks drop-in agent use: 'The llama.cpp OpenAI-compatible server currently supports endpoints like /v1/chat/completions, but does not support the newer OpenAI Responses API (/v1/responses).' The requester adds: 'I want to use ClaudeCode with llama-server offline, but it currently don't support necessary endpoints.' | url: https://github.com/ggml-org/llama.cpp/issues/19138<br>complaint: Tool calling breaks under long context: with a tool that has multiple optional parameters, past ~30k tokens 'it repeatedly calls the same tool [and] the call is almost correct, but one optional parameter is missing.' The failure only stops when optional parameters are made required, indicating a schema-handling bug rather than user error. | url: https://github.com/ggml-org/llama.cpp/issues/20164<br>complaint: Discoverability/usability: the llama-server binary and its OpenAI-compatible serving are under-documented, with users unsure how compatible the endpoints are with OpenAI and requesting the server be properly documented as an OpenAI-compatible backend. | url: https://github.com/microsoft/BitNet/issues/432

**gap_vs_vision**: As a raw engine it is the opposite end of 'Claude Code for everyone': powerful and free but not turnkey. It offers no built-in agentic coding, no automatic hardware-aware model recommendation (manual layer/quant tuning required), an incomplete OpenAI-compatibility surface (no /v1/responses) and no native Anthropic API, so acting as an offline Claude Code backend needs a proxy. Its CLI/flag-heavy UX and thin server docs make it inaccessible to non-expert users without a wrapper.

**sources**: - https://github.com/ggml-org/llama.cpp<br>- https://github.com/ggml-org/llama.cpp/blob/master/tools/server/README.md<br>- https://github.com/ggml-org/llama.cpp/issues/19138<br>- https://github.com/ggml-org/llama.cpp/issues/20164<br>- https://github.com/microsoft/BitNet/issues/432<br>- https://github.com/ggml-org/llama.cpp/discussions/3683

### Uncertain fields

- hardware_awareness
- claude_code_compat
