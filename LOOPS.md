# Project loops

## Documentation sync loop

Audits every doc against the actual current implementation, fixes what's stale, re-verifies by re-running what's documented, and stops by opening a pull request — never touches source code, only docs.

Prompt:
> Review the whole codebase against README.md, ONBOARDING.md, BUILD_LOG.md, site/*.html, and recap.html. For each doc claim (commands, versions, file paths, output examples), re-run or re-check it against real current behavior. Fix stale docs only — never source code. After each fix, re-verify against real behavior and run `npm test`. Repeat until no more stale items are found, then open a pull request with the changes. Ask before merging.

Saved: 2026-07-31
Trigger: GitHub Action, push to main touching `src/**` or `package.json` (`.github/workflows/doc-sync-loop.yml`). Requires an `ANTHROPIC_API_KEY` repo secret.

## Realistic-scenario testing streak

Runs one real end-to-end AgentDyno scenario at a time, and on any failure documents it, adds a regression test plus the observed timing/behavior as a benchmark baseline, fixes the bug, verifies the fix, and restarts the streak at zero — stopping only after 10 consecutive real successes.

Prompt:
> Test one realistic AgentDyno scenario at a time via real CLI/dashboard/VS Code runs, not mocks. On failure: document what happened, add a regression test and record the observed timing/behavior as a benchmark baseline, fix the bug, rebuild and re-run `npm test` to confirm the fix, then restart the streak at 0. On success, increment the streak. Stop after 10 consecutive successes.

Saved: 2026-07-31
Trigger: GitHub Action, on release tag push `v*.*.*` (`.github/workflows/test-streak-loop.yml`), before npm-publish.yml's own build/test gate. Requires an `ANTHROPIC_API_KEY` repo secret. Scoped in CI to real CLI behavior only (no GPU/Metal, no downloaded models) — not a full pull+serve+doctor run.
