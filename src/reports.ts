// Shared storage for saved doctor exam reports (~/.magix-box/reports/*.json).
// Used by both the CLI and the API server so there is exactly one reader/writer.

import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { HOME } from "./catalog.js";
import type { ExamReport } from "./probes.js";

export const REPORTS_DIR = join(HOME, "reports");

export function saveReport(r: ExamReport): void {
  mkdirSync(REPORTS_DIR, { recursive: true });
  writeFileSync(join(REPORTS_DIR, `${r.modelId}.json`), JSON.stringify(r, null, 2));
}

export function loadReport(modelId: string): ExamReport | null {
  const p = join(REPORTS_DIR, `${modelId}.json`);
  return existsSync(p) ? (JSON.parse(readFileSync(p, "utf8")) as ExamReport) : null;
}

export function loadAllReports(): Record<string, ExamReport | undefined> {
  if (!existsSync(REPORTS_DIR)) return {};
  const out: Record<string, ExamReport | undefined> = {};
  for (const f of readdirSync(REPORTS_DIR)) {
    if (!f.endsWith(".json")) continue;
    const id = f.slice(0, -5);
    out[id] = JSON.parse(readFileSync(join(REPORTS_DIR, f), "utf8")) as ExamReport;
  }
  return out;
}
