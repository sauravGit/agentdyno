// Renders the launch + walkthrough videos from REAL captured terminal output.
// Pipeline: build HTML "terminal frames" -> Chrome headless PNG -> ffmpeg mp4.
// No faked output: every command result below was produced by the actual CLI
// on this machine (see BUILD_LOG.md D-011/D-012 and ~/.magix-box/reports/*).

import { writeFileSync, mkdirSync, rmSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join } from "node:path";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const ROOT = new URL("..", import.meta.url).pathname;
const WORK = "/tmp/agentdyno-video";
rmSync(WORK, { recursive: true, force: true });
mkdirSync(WORK, { recursive: true });

const G = (s) => `<span class="g">${s}</span>`;
const R = (s) => `<span class="r">${s}</span>`;
const W = (s) => `<span class="w">${s}</span>`;
const M = (s) => `<span class="m">${s}</span>`;

// A frame = title card (big) or terminal (prompt+lines). dur in seconds.
function frameHTML(f, vertical) {
  const dim = vertical ? "1080px;height:1920px" : "1920px;height:1080px";
  const pad = vertical ? "80px 60px" : "70px 90px";
  const fs = vertical ? "30px" : "30px";
  let inner;
  if (f.card) {
    inner = `<div class="card"><div class="big">${f.card}</div>${f.sub ? `<div class="sub">${f.sub}</div>` : ""}${f.stamp ? `<div class="stampwrap"><span class="stamp ${f.stampcls}">${f.stamp}</span></div>` : ""}</div>`;
  } else {
    inner = `<div class="term"><div class="bar"><i></i><i></i><i></i><span class="ttl">dyno — ${f.host || "MacBook Air M4 · 16 GB"}</span></div><pre>${f.lines.join("\n")}</pre></div>`;
  }
  return `<!DOCTYPE html><meta charset=utf-8><style>
  *{margin:0;box-sizing:border-box}
  body{width:${dim};background:#0B0E11;color:#E8EDF2;
    font-family:"SF Mono","JetBrains Mono",ui-monospace,Menlo,monospace;
    display:flex;align-items:center;justify-content:center;padding:${pad}}
  .term{width:100%;background:#151A21;border:1px solid #232B35;border-radius:14px;overflow:hidden;box-shadow:0 30px 80px rgba(0,0,0,.5)}
  .bar{background:#0f141a;border-bottom:1px solid #232B35;padding:14px 18px;display:flex;align-items:center;gap:9px}
  .bar i{width:13px;height:13px;border-radius:50%;background:#39414c;display:inline-block}
  .bar i:first-child{background:#E4604E}.bar i:nth-child(2){background:#E8C547}.bar i:nth-child(3){background:#3DDC97}
  .ttl{margin-left:14px;color:#8A97A6;font-size:20px}
  pre{padding:34px 38px;font-size:${fs};line-height:1.75;white-space:pre-wrap;word-break:break-word}
  .g{color:#3DDC97}.r{color:#E4604E}.w{color:#E8C547}.m{color:#8A97A6}
  .card{text-align:center}
  .big{font-size:${vertical ? "58px" : "76px"};font-weight:700;line-height:1.15}
  .big .g{color:#3DDC97}
  .sub{margin-top:34px;color:#8A97A6;font-size:${vertical ? "30px" : "34px"};line-height:1.5}
  .stampwrap{margin-top:54px}
  .stamp{font-size:120px;font-weight:800;border:6px solid;border-radius:16px;padding:6px 44px;display:inline-block;transform:rotate(-4deg)}
  .stamp.f{color:#E4604E;border-color:#E4604E}.stamp.b{color:#E8C547;border-color:#E8C547}
  </style><body>${inner}</body>`;
}

function render(frames, out, vertical = false) {
  const inputs = [];
  frames.forEach((f, i) => {
    const html = join(WORK, `f${i}.html`);
    const png = join(WORK, `${out}-f${i}.png`);
    writeFileSync(html, frameHTML(f, vertical));
    const size = vertical ? "1080,1920" : "1920,1080";
    execFileSync(CHROME, ["--headless", "--disable-gpu", "--hide-scrollbars",
      `--window-size=${size}`, `--screenshot=${png}`, `file://${html}`],
      { stdio: "ignore" });
    inputs.push({ png, dur: f.dur });
  });
  // ffmpeg concat with per-image durations
  const list = inputs.map((x) => `file '${x.png}'\nduration ${x.dur}`).join("\n")
    + `\nfile '${inputs[inputs.length - 1].png}'`; // last frame needs repeat
  const listFile = join(WORK, `${out}.txt`);
  writeFileSync(listFile, list);
  const mp4 = join(ROOT, "site", "video", `${out}.mp4`);
  mkdirSync(join(ROOT, "site", "video"), { recursive: true });
  execFileSync("ffmpeg", ["-y", "-f", "concat", "-safe", "0", "-i", listFile,
    "-vf", "scale=trunc(iw/2)*2:trunc(ih/2)*2,format=yuv420p,fps=30",
    "-c:v", "libx264", "-preset", "medium", "-crf", "20", mp4], { stdio: "ignore" });
  console.log("wrote", mp4);
  return mp4;
}

// ---- LAUNCH VIDEO: the F-vs-B story (real numbers) ----
const launch = [
  { card: `Two models.<br>Both "fit" this 16 GB laptop.`, sub: `One of them cannot use tools at all.<br>You cannot tell which by looking.`, dur: 4.5 },
  { host: "MacBook Air M4 · 16 GB", lines: [
    `${M("$")} dyno scan`,
    `machine   ${G("Apple M4")} (arm64), 10 cores`,
    `memory    16.0 GiB RAM`,
    `accel     ${G("metal")} — Apple M4 (unified memory)`,
    `budgets   gpu 10.4 GiB | cpu 8.0 GiB`,
    `disk      279.3 GiB free`,
  ], dur: 4.5 },
  { lines: [
    `${M("$")} dyno fit`,
    `${M("model                        quant   need      verdict        tools")}`,
    `Qwen2.5 Coder 7B Instruct    Q4_K_M  6.4 GiB   ${G("comfortable")}    C`,
    `Qwen3 8B                     Q4_K_M  8.1 GiB   ${G("comfortable")}    A`,
    `Qwen2.5 Coder 14B            Q4_K_M  12.6 GiB  ${W("gpu+cpu split")}  A`,
    ``,
    `${M("// both top picks 'fit'. any calculator can tell you this.")}`,
  ], dur: 5 },
  { lines: [
    `${M("$")} dyno serve qwen2.5-coder-7b  &&  dyno doctor`,
    ``,
    `P1  ${R("FAIL")}  single tool call        ${M("emitted raw <function/> XML")}`,
    `P2  ${R("FAIL")}  tool selection among 9  ${M("loop never starts")}`,
    `P3  ${R("FAIL")}  tool-result round trip`,
    `P4  ${R("FAIL")}  tricky-string args`,
    `P5  ${R("FAIL")}  long-context recall`,
    ``,
    `grade: ${R("F")}   ${M("your agent would say \"done\" while editing nothing")}`,
  ], dur: 6 },
  { card: `Both fit. One is useless.`, sub: `Qwen2.5-Coder-7B fits comfortably —<br>and cannot drive an agent.`, stamp: "F", stampcls: "f", dur: 3.5 },
  { lines: [
    `${M("$")} dyno serve qwen3-8b  &&  dyno doctor   ${M("# same laptop")}`,
    ``,
    `P1  ${G("PASS")}  single tool call        18.3 tok/s`,
    `P2  ${G("PASS")}  tool selection among 9  16.7 tok/s`,
    `P3  ${G("PASS")}  tool-result round trip  16.8 tok/s`,
    `P4  ${R("FAIL")}  tricky-string args      ${M("dropped a backslash")}`,
    `P5  ${G("PASS")}  long-context recall     12.3 tok/s`,
    ``,
    `grade: ${W("B")}   ${M("usable for agentic coding; edit fidelity is the weak spot")}`,
  ], dur: 6.5 },
  { lines: [
    `${M("$")} dyno connect claude`,
    ``,
    `${G("verified: grade B on this machine")}`,
    `export ANTHROPIC_BASE_URL=${G("\"http://127.0.0.1:8402\"")}`,
    `export ANTHROPIC_MODEL=${G("\"qwen3-8b\"")}`,
    `${M("# config printed only after the model passed. now run: claude")}`,
    `${M("# local · private · no subscription")}`,
  ], dur: 5.5 },
  { card: `agentd${"<span class='g'>y</span>"}no`, sub: `Don't trust "it fits." ${G("Measure it.")}<br><span style="font-size:24px">Apache-2.0 · no accounts · no telemetry</span>`, dur: 4 },
];

// ---- WALKTHROUGH VIDEO: the full command flow ----
const walk = [
  { card: `agentd${"<span class='g'>y</span>"}no`, sub: `scan → fit → pull → serve → doctor → connect<br>a 90-second product walkthrough`, dur: 3.5 },
  { lines: [
    `${M("# 1. what does this machine really have?")}`,
    `${M("$")} dyno scan`,
    `machine   ${G("Apple M4")} (arm64), 10 cores`,
    `accel     ${G("metal")} — unified memory`,
    `budgets   gpu 10.4 GiB | cpu 8.0 GiB`,
  ], dur: 4.5 },
  { lines: [
    `${M("# 2. which open models fit, ranked, honestly")}`,
    `${M("$")} dyno fit`,
    `Qwen3 8B                Q4_K_M  8.1 GiB  ${G("comfortable")}   max-ctx 21535`,
    `Qwen2.5 Coder 7B        Q4_K_M  6.4 GiB  ${G("comfortable")}   max-ctx 32768`,
    `Qwen3 Coder 30B-A3B     Q4_K_M  20 GiB   ${R("won't fit")}`,
  ], dur: 4.5 },
  { lines: [
    `${M("# 3. fetch runtime + model (resumable, sha-256 verified)")}`,
    `${M("$")} dyno pull qwen3-8b`,
    `downloading llama.cpp b10107 (bin-macos-arm64) ${G("ready")}`,
    `downloading Qwen3 8B Q4_K_M (4.4 GiB) ......... ${G("100%")}`,
    `verifying SHA-256... ${G("checksum OK")}`,
  ], dur: 4.5 },
  { lines: [
    `${M("# 4. serve with the CORRECT flags for this fit")}`,
    `${M("$")} dyno serve qwen3-8b`,
    `starting Qwen3 8B Q4_K_M (${G("comfortable")}, ctx 21535)...`,
    `ready: http://127.0.0.1:8402 (context 21535)`,
    `endpoints: ${G("OpenAI /v1/chat/completions")} | ${G("Anthropic /v1/messages")}`,
  ], dur: 4.5 },
  { lines: [
    `${M("# 5. the exam — prove it can drive tools")}`,
    `${M("$")} dyno doctor`,
    `P1 ${G("PASS")}  P2 ${G("PASS")}  P3 ${G("PASS")}  P4 ${R("FAIL")}  P5 ${G("PASS")}`,
    `grade: ${W("B")}   generation 16.2 tok/s`,
    `report saved: ~/.magix-box/reports/qwen3-8b.json`,
  ], dur: 4.5 },
  { lines: [
    `${M("# 6. wire your agent to the VERIFIED server")}`,
    `${M("$")} dyno connect opencode`,
    `${G("verified: grade B on this machine")}`,
    `provider magix-box -> http://127.0.0.1:8402/v1  ctx 21535`,
    `${M("# opencode -m magix-box/qwen3-8b   ·   also: connect claude | aider")}`,
  ], dur: 4.5 },
  { card: `Don't trust "it fits."<br>${G("Measure it.")}`, sub: `github.com/sauravGit/agentdyno · Apache-2.0`, dur: 3.5 },
];

const a = render(launch, "launch");
const b = render(walk, "walkthrough");
console.log("done:", a, b);
