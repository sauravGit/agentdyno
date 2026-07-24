// Renders an exam report (~/.magix-box/reports/<model>.json) into a printable
// calibration-certificate HTML. Usage:
//   node dist/tools/certificate.js <model-id> [out.html]

import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import os from "node:os";
import { execSync } from "node:child_process";

const modelId = process.argv[2];
if (!modelId) {
  console.error("usage: certificate <model-id> [out.html]");
  process.exit(1);
}
const reportPath = join(os.homedir(), ".magix-box", "reports", `${modelId}.json`);
const r = JSON.parse(readFileSync(reportPath, "utf8"));
const out = process.argv[3] ?? `certificate-${modelId}.html`;

let hwLine = "";
try {
  hwLine = execSync("sysctl -n machdep.cpu.brand_string", { encoding: "utf8" }).trim();
} catch {
  hwLine = `${os.cpus()[0]?.model ?? "unknown"}`;
}
const ramGb = Math.round(os.totalmem() / 1024 ** 3);

const gradeColor: Record<string, string> = { A: "#3DDC97", B: "#E8C547", C: "#E8C547", F: "#E4604E" };
const meaning: Record<string, string> = {
  A: "agent-ready on this machine at the examined context",
  B: "usable for agentic coding; long-context recall or speed is limited",
  C: "unreliable for agents — chat use only",
  F: "cannot drive tools; do not wire an agent to this",
};

const rows = r.results
  .map(
    (p: any) => `<tr>
      <td class="mono">${p.id}</td><td>${p.name}</td>
      <td class="mono ${p.pass ? "pass" : "fail"}">${p.pass ? "PASS" : "FAIL"}</td>
      <td class="mono num">${p.tokensPerSec ? p.tokensPerSec.toFixed(1) + " tok/s" : "—"}</td>
      <td class="detail">${String(p.detail).replace(/</g, "&lt;")}</td></tr>`
  )
  .join("\n");

const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>AgentDyno certificate — ${modelId}</title>
<style>
:root{--bg:#0B0E11;--surface:#151A21;--line:#232B35;--text:#E8EDF2;--muted:#8A97A6;
--mono:"SF Mono","JetBrains Mono",ui-monospace,Menlo,monospace}
body{background:var(--bg);color:var(--text);font-family:var(--mono);max-width:820px;margin:40px auto;padding:0 20px;line-height:1.6}
.cert{border:1px solid var(--line);border-radius:10px;padding:36px;background:var(--surface)}
h1{font-size:18px;letter-spacing:.12em;text-transform:uppercase;color:var(--muted);font-weight:500}
.model{font-size:28px;margin:8px 0 4px}
.sub{color:var(--muted);font-size:14px}
.stamp{float:right;font-size:64px;font-weight:700;border:4px solid ${gradeColor[r.grade]};color:${gradeColor[r.grade]};border-radius:10px;padding:4px 26px;transform:rotate(-4deg)}
table{border-collapse:collapse;width:100%;margin-top:28px;font-size:13px}
th,td{text-align:left;padding:8px 10px;border-bottom:1px solid var(--line);vertical-align:top}
th{color:var(--muted);font-weight:500;text-transform:uppercase;font-size:11px;letter-spacing:.08em}
.pass{color:#3DDC97}.fail{color:#E4604E}.num{text-align:right}.detail{color:var(--muted);font-size:12px}
.mono{font-family:var(--mono)}
.foot{margin-top:28px;color:var(--muted);font-size:12px;border-top:1px solid var(--line);padding-top:14px}
@media print{body{background:#fff;color:#111}.cert{background:#fff;border-color:#ccc}}
</style></head><body>
<div class="cert">
  <div class="stamp">${r.grade}</div>
  <h1>AgentDyno — agentic readiness certificate</h1>
  <div class="model">${modelId}</div>
  <div class="sub">examined ${r.when} · context ${r.context.toLocaleString()} tokens</div>
  <div class="sub">machine: ${hwLine}, ${ramGb} GB RAM (${os.platform()}/${os.arch()})</div>
  <table>
    <tr><th>probe</th><th>name</th><th>result</th><th>speed</th><th>detail</th></tr>
    ${rows}
  </table>
  <p style="margin-top:20px">verdict: <strong style="color:${gradeColor[r.grade]}">${r.grade}</strong> — ${meaning[r.grade]}${r.genTokensPerSec ? ` · mean generation ${r.genTokensPerSec.toFixed(1)} tok/s` : ""}</p>
  <div class="foot">Grades measure tool-driving reliability on THIS machine only; they are not
  a general model ranking. Reproduce: dyno serve ${modelId} && dyno doctor. AgentDyno · Apache-2.0.</div>
</div>
</body></html>`;

writeFileSync(out, html);
console.log(`wrote ${out} (grade ${r.grade})`);
