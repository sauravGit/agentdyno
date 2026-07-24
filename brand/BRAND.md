# AgentDyno — Brand Guidelines

A stranger should be able to make a new on-brand asset from this file alone.

## Idea

AgentDyno is a measurement instrument, not an assistant. The brand voice and
visuals borrow from the dynamometer garage and the flight-test hangar: numbers
you can trust, printed on a machine that does not flatter you.

## Name and usage

- Product: AgentDyno (one word, capital A and D). CLI binary: `dyno`.
  npm package: `agentdyno`. Never "Agent Dyno", never "the Dyno".
- Tagline (primary): Don't trust "it fits." Measure it.
- Tagline (secondary): The dyno bench for local coding agents.

## Voice

- Instrument, not salesman. State measurements, name failure modes, cite
  sources. Never promise "blazing fast" or "magical".
- Honest about limits: a grade C is printed as proudly as a grade A. The brand
  asset IS the willingness to say "this model cannot drive tools on your
  machine".
- Plain text, no emojis, no exclamation marks in product output.
- Verbs of measurement: scan, fit, probe, grade, prove, measure, verify.
- Words we never use: revolutionary, supercharge, unleash, blazing, magic.

## Color

Dark-first (a garage at night, instrument glow). All colors as CSS tokens:

- --bg        #0B0E11  near-black blue (panel steel)
- --surface   #151A21  raised panel
- --line      #232B35  hairline borders
- --text      #E8EDF2  primary text
- --muted     #8A97A6  secondary text
- --accent    #3DDC97  dyno-green: the needle, PASS states, links
- --warn      #E8C547  tachometer amber: warnings, grade B/C
- --fail      #E4604E  redline: FAIL states, grade F
- Light theme: same hues on #F7F9FA background, text #14181D; accent
  darkens to #1E9E68 for contrast (WCAG AA on white).

Rule: accent green is earned — only PASS/grade-A/interactive elements. Never
decorate with it.

## Type

- Headings + numbers: a monospace face (system stack: "SF Mono", "JetBrains
  Mono", "Cascadia Code", ui-monospace, monospace). Measurements ALWAYS in
  monospace — numbers are the product.
- Body: system sans (-apple-system, "Segoe UI", Inter, sans-serif).
- Scale: 40/28/20/16/14. Line height 1.5 body, 1.1 headings.

## Motifs

- The grade stamp: a boxed monospace letter (A/B/C/F) with 2px border in the
  grade's color, rotated -3deg, like an inspection stamp.
- The probe table: five rows, PASS/FAIL in caps, tok/s right-aligned.
- The needle arc: a 240-degree gauge arc, needle at the measured value; used
  as logo mark (an abstract gauge forming a "D").
- ASCII-friendly: every motif must degrade to plain terminal text.

## Logo

Wordmark: `agentdyno` lowercase monospace, with the "y" descender extended
into a gauge needle. Mark-only: circular gauge with needle at ~80%.
Clear space: one "o"-width around wordmark. Never stretch, recolor to
non-token colors, or add gradients.

## Layout

- Max content width 72ch for prose, 960px for panels.
- Panels: --surface background, 1px --line border, 8px radius, 24px padding.
- Generous whitespace; the page should feel like a calibration certificate,
  not a landing page.
