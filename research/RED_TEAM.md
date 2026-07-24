# Red Team — attacking the pivoted AgentDyno thesis

Two adversarial passes ran against this project. Both are recorded here so the
objections stay visible in the final package (nothing swept under the rug).

## Pass 1 — SKEPTIC.md (independent agent, on the ORIGINAL thesis)

Verdict: PIVOT. It falsified the original "nobody occupies the intersection"
claim by finding AlexsJones/llmfit (30.6k stars, verified via GitHub API) and
luongnv89/ccl, and showed Ollama >= 0.14 already speaks the Anthropic API. The
"fit + launch + connect" idea was already built. This is why the product moved
from "fit" to "verification/trust." Full detail in research/SKEPTIC.md.

## Pass 2 — attacking the SURVIVING thesis ("fit is solved, trust is not")

These are the strongest objections I can make against the pivoted product,
with honest rebuttals and residual risk. Where an objection wins, it is marked
UNRESOLVED.

### O1 (strongest): demand for verification specifically is unproven. UNRESOLVED.
The skeptic's own evidence cuts here: the fit tool has ~30k stars; the
connect-automation tool has ~37. People demonstrably want "what fits." Nobody
has shown they will adopt a separate "does it actually work" exam rather than
just trying the model in their agent and eyeballing it. My pain evidence proves
the FAILURES are real (Goose #6688, OpenCode #7030, etc.); it does NOT prove
users want a benchmarking step before use. This is a genuine go-to-market risk,
not a solved problem. Mitigation (partial): fold the exam into the same one
command that fits+serves, so verification is free rather than a chore. Whether
that converts is untested. Honest status: this is the bet, and it could be wrong.

### O2: a 5-probe, single-run grade is a small, potentially noisy sample.
Rebuttal: probes run at temperature 0 for determinism, and the rubric keys on
mechanism (loop vs quality), not a fragile numeric score. But one run is one
data point; a model near a boundary could flip B/C between runs. Residual risk:
real. Roadmap: repeat-N with a stability flag. Not in MVP — logged as a cut.

### O3: my own P5 was a false negative until I fixed max_tokens (D-012).
This is the sharpest self-inflicted wound: a tool whose entire value is
trustworthy measurement shipped a probe that lied on first run. Rebuttal: it
was caught by adversarial self-verification BEFORE release, the fix is covered
by a unit test, and it demonstrates exactly the failure mode (truncation) the
tool exists to expose. But it proves probe design is delicate and must be
treated as a tested, versioned artifact forever. Accepted as an ongoing cost.

### O4: value shrinks as hardware grows. Partly conceded.
On a 96 GB machine, most models that fit also work, so the "fits but fails"
band is narrow. Rebuttal: the mass market is 8-16 GB laptops (this M4 is the
median case), exactly where the band is widest; and even big machines hit the
band at long context or with large tool sets. Net: strongest for the biggest
audience, weakest for power users — acceptable positioning.

### O5: llmfit (or Ollama) could add a "verify" subcommand and absorb this.
Conceded as a real platform risk. Rebuttal: the defensible asset is the probe
battery + mechanism-based rubric + reproducible certificate, not the plumbing;
and being the honest, agent-agnostic OSS reference for "does it work" is a
position a runtime vendor is structurally reluctant to occupy (it makes their
own models look bad). Thin moat, honestly. Community trust is the only real one.

### O6: P4 (the escaped-backslash probe) may be arbitrarily harsh.
A model dropping one backslash in a pathological string is graded a quality
failure; some would call that unfair. Rebuttal: the result is invalid code,
which is a real agentic-edit failure, and P4 is a QUALITY probe (costs a letter,
never causes an F). Kept deliberately; a reasonable person could dispute the
severity. Documented so users can judge.

## Bottom line

The pain is real and verified. The plumbing works and is demonstrated on this
machine (F vs B, same laptop). The unresolved question is O1 — whether "verify
before you trust" is a behavior people adopt or a vitamin they skip. A fair
reader should walk away convinced the TECH is honest and working, and
appropriately skeptical about the GO-TO-MARKET until real users validate O1.
That is the most truthful state of this project, and it is stated plainly in
recap.html rather than hidden.
