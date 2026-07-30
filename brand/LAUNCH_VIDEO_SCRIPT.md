# AgentDyno — Launch Video Script (60-75 s)

Format: terminal-first screen video, monospace title cards, real command output
only (no mockups). Voice: measured, dry, instrument-like. No music swells,
no exclamation marks. All output shown is from a real run on a MacBook Air M4,
16 GB — the exact transcript is in the repo.

---

CARD 1 (0:00-0:06, black background, mono type)
  Two models. Both "fit" this laptop.
  One of them cannot use tools at all.
  You can't tell which by looking.

SCENE 1 (0:06-0:16) — terminal
  $ dyno scan
  -> shows M4, 16 GB, gpu budget 10.4 GiB
  VO: "This is a 16-gig MacBook Air. AgentDyno starts by telling you what it
  really has — unified memory, honest budgets, no vendor math."

SCENE 2 (0:16-0:28) — terminal
  $ dyno fit
  -> ranked table, comfortable/tight/won't-fit, max context column
  VO: "It ranks open coding models by what actually fits, with the max agent
  context each one can hold. So far, any fit calculator can do this."

SCENE 3 (0:28-0:50) — terminal, the heart
  $ dyno doctor        (Qwen2.5 Coder 7B)
  -> P1 FAIL raw XML ... grade: F  "cannot drive tools"
  VO: "Here's what they can't do. Qwen2.5 Coder fits comfortably — and fails
  the exam. It answers in XML instead of calling tools. Your agent would have
  said 'done' while editing nothing."
  $ dyno doctor        (Qwen3 8B, same machine)
  -> probes PASS ... grade + tok/s
  VO: "Same laptop, different model: passes. Now you know before you wire
  anything up."

SCENE 4 (0:50-1:02) — terminal
  $ dyno connect goose   / connect cline
  -> env vars + VERIFIED banner
  VO: "Connect prints a config only after the model has passed on your
  machine — for Goose or Cline, the two open-source agents AgentDyno
  battle-tests. Local, private, no subscription."

CARD 2 (1:02-1:10)
  agentdyno
  Don't trust "it fits." Measure it.
  brew install sauravGit/agentdyno/agentdyno
  Apache-2.0 - no accounts - no telemetry

---

Production notes
- Record with macOS screen capture or render terminal frames to video via
  ffmpeg; 1920x1080 and 1080x1920 (vertical crop of the terminal) exports.
- Type at human speed (use a scripted typer), pause 1.5 s on grades.
- The F grade is the emotional peak; let it sit on screen for 2 s before VO.
