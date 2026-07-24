// Hardware detection. Honest budgets, per platform.
//
// Apple Silicon: unified memory; the kernel caps GPU-wired allocations at a
// default of ~65% of RAM on <=36 GB machines when iogpu.wired_limit_mb is 0.
// Intel macOS: treated as CPU-only (no practical Metal LLM budget).
// Linux: NVIDIA VRAM via nvidia-smi when present, else CPU-only.
// Windows: experimental (untested) — WMI via PowerShell.

import { execFileSync } from "node:child_process";
import { statfsSync } from "node:fs";
import os from "node:os";
import type { HardwareReport } from "./types.js";

const APPLE_GPU_DEFAULT_FRACTION = 0.65;
const CPU_RAM_FRACTION = 0.5;

function run(cmd: string, args: string[]): string | null {
  try {
    return execFileSync(cmd, args, { encoding: "utf8", timeout: 10_000 }).trim();
  } catch {
    return null;
  }
}

function sysctl(name: string): string | null {
  return run("/usr/sbin/sysctl", ["-n", name]);
}

export function diskFree(path: string): number {
  try {
    const s = statfsSync(path);
    return s.bavail * s.bsize;
  } catch {
    return 0;
  }
}

export function scanHardware(modelsDir: string): HardwareReport {
  const platform = os.platform() as HardwareReport["os"];
  const arch = (os.arch() === "arm64" ? "arm64" : "x64") as "arm64" | "x64";
  const ramBytes = os.totalmem();
  const notes: string[] = [];

  let gpuBudgetBytes = 0;
  let accel: HardwareReport["accel"] = "cpu";
  let gpuName: string | null = null;
  let cpuBrand = os.cpus()[0]?.model ?? "unknown";

  if (platform === "darwin") {
    cpuBrand = sysctl("machdep.cpu.brand_string") ?? cpuBrand;
    if (arch === "arm64") {
      accel = "metal";
      gpuName = cpuBrand + " (unified memory)";
      const limitMb = Number(sysctl("iogpu.wired_limit_mb") ?? "0");
      if (limitMb > 0) {
        gpuBudgetBytes = limitMb * 1024 * 1024;
        notes.push(`GPU wired limit raised by user: ${limitMb} MiB`);
      } else {
        gpuBudgetBytes = Math.floor(ramBytes * APPLE_GPU_DEFAULT_FRACTION);
        notes.push(
          `Apple Silicon default GPU budget modeled at ${Math.round(
            APPLE_GPU_DEFAULT_FRACTION * 100
          )}% of unified RAM`
        );
      }
    } else {
      notes.push("Intel Mac: no practical Metal LLM acceleration; CPU budget only");
    }
  } else if (platform === "linux") {
    const smi = run("nvidia-smi", [
      "--query-gpu=name,memory.total,memory.used",
      "--format=csv,noheader,nounits",
    ]);
    if (smi) {
      const [name, totalMb, usedMb] = smi.split("\n")[0].split(",").map((s) => s.trim());
      gpuName = name;
      accel = "cuda";
      gpuBudgetBytes = Math.max(0, (Number(totalMb) - Number(usedMb)) * 1024 * 1024);
      notes.push(`NVIDIA VRAM budget = total - in-use (${usedMb} MiB in use)`);
    } else {
      notes.push("No NVIDIA GPU detected (nvidia-smi absent); CPU budget only");
    }
  } else if (platform === "win32") {
    notes.push("Windows support is EXPERIMENTAL and untested in this release");
    const smi = run("nvidia-smi", [
      "--query-gpu=name,memory.total,memory.used",
      "--format=csv,noheader,nounits",
    ]);
    if (smi) {
      const [name, totalMb, usedMb] = smi.split("\n")[0].split(",").map((s) => s.trim());
      gpuName = name;
      accel = "cuda";
      gpuBudgetBytes = Math.max(0, (Number(totalMb) - Number(usedMb)) * 1024 * 1024);
    }
  }

  return {
    os: platform,
    arch,
    cpuBrand,
    cores: os.cpus().length,
    ramBytes,
    gpuBudgetBytes,
    ramBudgetBytes: Math.floor(ramBytes * CPU_RAM_FRACTION),
    accel,
    gpuName,
    diskFreeBytes: diskFree(modelsDir),
    notes,
  };
}

export function formatBytes(b: number): string {
  if (b >= 1024 ** 3) return (b / 1024 ** 3).toFixed(1) + " GiB";
  if (b >= 1024 ** 2) return (b / 1024 ** 2).toFixed(0) + " MiB";
  return b + " B";
}
