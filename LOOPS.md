# Project loops

## Documentation sync loop

Audits every doc against the actual current implementation, fixes what's stale, re-verifies by re-running what's documented, and commits fixes directly to the open PR — never touches source code, only docs.

Prompt:
> Review the whole codebase against README.md, ONBOARDING.md, BUILD_LOG.md, site/*.html, and recap.html. For each doc claim (commands, versions, file paths, output examples), re-run or re-check it against real current behavior. Fix stale docs only — never source code. After each fix, re-verify against real behavior and run `npm test`. Repeat until no more stale items are found, then commit the fixes to the PR branch and comment describing what changed.

Saved: 2026-07-31
Trigger: GitHub Action, on every PR touching `src/**` or `package.json` (`.github/workflows/doc-sync-loop.yml`), plus manual `workflow_dispatch`. Runs on the PR's own branch. Checks a bounded checklist (version numbers, command names, file paths, vsix version) rather than an open-ended full audit, and a separate deterministic shell step commits/pushes any fixes — the agent only edits files, never runs git itself. Requires a `CLAUDE_CODE_OAUTH_TOKEN` secret (from `claude setup-token`, a Claude Pro/Max subscription) scoped to the "main" GitHub Environment — switched from a metered `ANTHROPIC_API_KEY` after two real runs cost ~$6 combined without completing. Also needs `github_token: ${{ secrets.GITHUB_TOKEN }}` passed explicitly (the action's default GitHub-App-based auth requires installing the Claude Code GitHub App, which this repo doesn't have) and `id-token: write` in job permissions. Revised after two real runs hit `error_max_turns` with unexplained permission denials under a broader, agent-driven-git design.

## Realistic-scenario testing streak

Runs one real end-to-end AgentDyno scenario at a time, and on any failure documents it, adds a regression test plus the observed timing/behavior as a benchmark baseline, fixes the bug, verifies the fix, and restarts the streak at zero — stopping only after 10 consecutive real successes.

Prompt:
> Test one realistic AgentDyno scenario at a time via real CLI/dashboard/VS Code runs, not mocks. On failure: document what happened, add a regression test and record the observed timing/behavior as a benchmark baseline, fix the bug, rebuild and re-run `npm test` to confirm the fix, then restart the streak at 0. On success, increment the streak. Stop after 10 consecutive successes.

Saved: 2026-07-31
Trigger: GitHub Action, on release tag push `v*.*.*` (`.github/workflows/test-streak-loop.yml`), before npm-publish.yml's own build/test gate. Requires a `CLAUDE_CODE_OAUTH_TOKEN` secret scoped to the "main" GitHub Environment, plus `github_token: ${{ secrets.GITHUB_TOKEN }}` and `id-token: write` (same reasons as the doc-sync loop). Scoped in CI to real CLI behavior only (no GPU/Metal, no downloaded models) — not a full pull+serve+doctor run. The agent only edits files; a separate deterministic step opens the PR if anything changed.
