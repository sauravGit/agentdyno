// Catalog loading + paths.

import { readFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import os from "node:os";
import type { CatalogModel } from "./types.js";

export const HOME = join(os.homedir(), ".magix-box");
export const MODELS_DIR = join(HOME, "models");
export const RUNTIME_DIR = join(HOME, "runtime");
export const LOGS_DIR = join(HOME, "logs");
export const PORT = 8402;

export function ensureDirs(): void {
  for (const d of [HOME, MODELS_DIR, RUNTIME_DIR, LOGS_DIR]) {
    mkdirSync(d, { recursive: true });
  }
}

export function loadCatalog(): CatalogModel[] {
  // Compiled to dist/src/, catalog.json stays in src/ (shipped in the package).
  const candidates = [
    new URL("../../src/catalog.json", import.meta.url).pathname,
    new URL("../src/catalog.json", import.meta.url).pathname,
  ];
  for (const p of candidates) {
    try {
      return (JSON.parse(readFileSync(p, "utf8")) as { models: CatalogModel[] }).models;
    } catch {}
  }
  throw new Error("catalog.json not found; reinstall magix-box");
}

export function findModel(models: CatalogModel[], idOrPrefix: string): CatalogModel {
  const exact = models.find((m) => m.id === idOrPrefix);
  if (exact) return exact;
  const matches = models.filter((m) => m.id.startsWith(idOrPrefix));
  if (matches.length === 1) return matches[0];
  if (matches.length === 0) {
    throw new Error(
      `no model matching "${idOrPrefix}"; try: ${models.map((m) => m.id).join(", ")}`
    );
  }
  throw new Error(
    `ambiguous "${idOrPrefix}": ${matches.map((m) => m.id).join(", ")}`
  );
}
