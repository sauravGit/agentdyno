// Resumable, SHA-256-verified downloads for models and the llama.cpp runtime.

import { createHash } from "node:crypto";
import {
  createReadStream,
  createWriteStream,
  existsSync,
  renameSync,
  statSync,
  unlinkSync,
} from "node:fs";
import { join } from "node:path";
import { pipeline } from "node:stream/promises";
import { Readable } from "node:stream";
import { execFileSync } from "node:child_process";
import { MODELS_DIR, RUNTIME_DIR, ensureDirs } from "./catalog.js";
import { diskFree, formatBytes } from "./scan.js";
import type { CatalogModel, QuantEntry } from "./types.js";

export async function sha256File(path: string): Promise<string> {
  const hash = createHash("sha256");
  await pipeline(createReadStream(path), hash);
  return hash.digest("hex");
}

/** Download url to dest with HTTP Range resume and progress line. */
export async function download(url: string, dest: string, expectBytes?: number): Promise<void> {
  const part = dest + ".part";
  let offset = 0;
  if (existsSync(part)) offset = statSync(part).size;
  const headers: Record<string, string> = { "User-Agent": "magix-box" };
  if (offset > 0) headers.Range = `bytes=${offset}-`;

  const res = await fetch(url, { headers, redirect: "follow" });
  if (res.status === 416) {
    // Fully downloaded part file
  } else if (!res.ok || !res.body) {
    throw new Error(`download failed: ${res.status} ${res.statusText}`);
  } else {
    const resumed = res.status === 206;
    if (!resumed && offset > 0) offset = 0; // server ignored Range; restart
    const total = expectBytes ?? offset + Number(res.headers.get("content-length") ?? 0);
    const out = createWriteStream(part, { flags: resumed ? "a" : "w" });
    let done = offset;
    let lastPrint = 0;
    const body = Readable.fromWeb(res.body as any);
    body.on("data", (chunk: Buffer) => {
      done += chunk.length;
      const now = Date.now();
      if (now - lastPrint > 500) {
        lastPrint = now;
        const pct = total ? ((done / total) * 100).toFixed(1) : "?";
        process.stderr.write(`\r  ${formatBytes(done)} / ${formatBytes(total)} (${pct}%)   `);
      }
    });
    await pipeline(body, out);
    process.stderr.write("\n");
  }
  renameSync(part, dest);
}

export async function pullModel(model: CatalogModel, quant: QuantEntry): Promise<string> {
  ensureDirs();
  const dest = join(MODELS_DIR, quant.filename);
  if (existsSync(dest)) {
    console.log(`already downloaded: ${quant.filename} — verifying checksum...`);
    const sum = await sha256File(dest);
    if (sum === quant.sha256) {
      console.log("checksum OK");
      return dest;
    }
    console.log("checksum MISMATCH — re-downloading");
    unlinkSync(dest);
  }
  const free = diskFree(MODELS_DIR);
  if (free < quant.sizeBytes * 1.05) {
    throw new Error(
      `not enough disk: need ${formatBytes(quant.sizeBytes)}, free ${formatBytes(free)}`
    );
  }
  console.log(`downloading ${model.displayName} ${quant.quant} (${formatBytes(quant.sizeBytes)})`);
  await download(quant.url, dest, quant.sizeBytes);
  console.log("verifying SHA-256...");
  const sum = await sha256File(dest);
  if (sum !== quant.sha256) {
    unlinkSync(dest);
    throw new Error(`SHA-256 mismatch for ${quant.filename}: got ${sum}, want ${quant.sha256}`);
  }
  console.log("checksum OK");
  return dest;
}

interface GhAsset { name: string; browser_download_url: string; size: number }

/** Fetch the right llama.cpp prebuilt server for this OS/arch. */
export async function pullRuntime(): Promise<string> {
  ensureDirs();
  const serverBin = join(RUNTIME_DIR, "build", "bin", "llama-server");
  if (existsSync(serverBin)) return serverBin;

  const rel = await (
    await fetch("https://api.github.com/repos/ggml-org/llama.cpp/releases/latest", {
      headers: { "User-Agent": "magix-box" },
    })
  ).json() as { tag_name: string; assets: GhAsset[] };

  const plat = process.platform;
  const arch = process.arch === "arm64" ? "arm64" : "x64";
  let pattern: RegExp;
  if (plat === "darwin") pattern = new RegExp(`bin-macos-${arch}\\.tar\\.gz$`);
  else if (plat === "linux") pattern = new RegExp(`bin-ubuntu-${arch}\\.tar\\.gz$`);
  else if (plat === "win32") pattern = /bin-win-cpu-x64\.zip$/;
  else throw new Error(`unsupported platform ${plat}`);

  const asset = rel.assets.find((a) => pattern.test(a.name));
  if (!asset) throw new Error(`no llama.cpp asset matching ${pattern} in ${rel.tag_name}`);

  const archive = join(RUNTIME_DIR, asset.name);
  console.log(`downloading llama.cpp ${rel.tag_name} (${asset.name}, ${formatBytes(asset.size)})`);
  await download(asset.browser_download_url, archive, asset.size);

  if (archive.endsWith(".tar.gz")) {
    execFileSync("tar", ["xzf", archive, "-C", RUNTIME_DIR]);
  } else {
    execFileSync("unzip", ["-o", archive, "-d", RUNTIME_DIR]);
  }
  if (!existsSync(serverBin)) {
    throw new Error(`llama-server not found after extraction (looked at ${serverBin})`);
  }
  console.log(`runtime ready: ${serverBin}`);
  return serverBin;
}
