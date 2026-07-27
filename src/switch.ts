// The model switcher: one ranked list, one command to activate the top pick.
//
// Ranking rule (as specified): a model that has been through `dyno doctor` on
// THIS machine (a "verified" result) always outranks one that hasn't, no
// matter how good its catalog prior or external benchmark score looks — we
// proved priors can be wrong (Qwen2.5-Coder-7B was cataloged grade A until a
// real run showed it can't emit a tool call at all; see BUILD_LOG.md D-011).
// Within the same verification band, rank by grade, then by external
// leaderboard score IF a real match exists (most laptop-sized models have
// none — see leaderboard.ts), then by comfort of fit, then by size.

import type { CatalogModel, HardwareReport, QuantFit } from "./types.js";
import { DEFAULT_CONTEXT, rankFits } from "./fit.js";
import type { ExamReport } from "./probes.js";
import type { ExternalMatch, LeaderboardEntry } from "./leaderboard.js";
import { matchExternalScore } from "./leaderboard.js";

const GRADE_RANK: Record<"A" | "B" | "C" | "F", number> = { A: 0, B: 1, C: 2, F: 3 };

export interface SwitchCandidate {
  fit: QuantFit;
  verified: boolean;
  gradeLabel: string; // "A" (verified) or "A?" (unverified prior)
  gradeRank: number;
  external: ExternalMatch;
  activatable: boolean; // false for wont-fit
}

export function rankForSwitch(
  models: CatalogModel[],
  hw: HardwareReport,
  reports: Record<string, ExamReport | undefined>,
  leaderboard: LeaderboardEntry[],
  context: number = DEFAULT_CONTEXT
): SwitchCandidate[] {
  const fits = rankFits(models, hw, context);
  const candidates: SwitchCandidate[] = fits.map((fit) => {
    const report = reports[fit.model.id];
    // A report proves the model works up to the tokens it was examined at;
    // that covers any smaller context request, but does not extrapolate to a
    // LARGER one (long-context recall specifically gets harder as context grows).
    const verified = report !== undefined && report.context >= fit.evaluatedContext;
    const gradeRank = verified ? GRADE_RANK[report!.grade] : GRADE_RANK[fit.model.toolCallGrade];
    const gradeLabel = verified ? report!.grade : `${fit.model.toolCallGrade}?`;
    return {
      fit,
      verified,
      gradeLabel,
      gradeRank,
      external: matchExternalScore(fit.model, leaderboard),
      activatable: fit.mode !== "wont-fit",
    };
  });

  return candidates.sort((a, b) => {
    if (a.activatable !== b.activatable) return a.activatable ? -1 : 1;
    if (a.verified !== b.verified) return a.verified ? -1 : 1; // verified always wins
    if (a.gradeRank !== b.gradeRank) return a.gradeRank - b.gradeRank;
    const ea = a.external.matched ? a.external.entry.passRate2 : -1;
    const eb = b.external.matched ? b.external.entry.passRate2 : -1;
    if (ea !== eb) return eb - ea;
    const MODE_RANK: Record<string, number> = {
      comfortable: 0, tight: 1, "partial-offload": 2, "cpu-only": 3, "wont-fit": 4,
    };
    const ma = MODE_RANK[a.fit.mode], mb = MODE_RANK[b.fit.mode];
    if (ma !== mb) return ma - mb;
    return b.fit.quant.sizeBytes - a.fit.quant.sizeBytes;
  });
}
