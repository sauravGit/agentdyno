// The agentic readiness exam. Each probe targets a researched failure mode:
//   P1 single-tool     — malformed/absent tool calls (Continue #9157 raw XML)
//   P2 tool-selection  — degradation past ~5 tools (Goose #6883)
//   P3 round-trip      — "says done, did nothing" (OpenCode #7030)
//   P4 arg-fidelity    — mangled JSON args with tricky strings (Aider #1208)
//   P5 long-context    — recall of early facts near the context ceiling
// Speed is measured from llama-server timings on every probe.

import { BASE_URL } from "./serve.js";

export interface ProbeResult {
  id: string;
  name: string;
  pass: boolean;
  detail: string;
  tokensPerSec: number | null;
  ms: number;
}

export const GRADE_MEANING: Record<"A" | "B" | "C" | "F", string> = {
  A: "agent-ready on this machine at this context — loop solid, edits and long-context recall verified",
  B: "usable for agentic coding; one quality dimension (edit fidelity or long-context recall) is unreliable",
  C: "runs the agent loop but corrupts edits AND loses long context — expect silent breakage",
  F: "cannot drive the agent loop (tool calls malformed, wrong, or ignored); do not wire an agent to this",
};

export interface ExamReport {
  modelId: string;
  context: number;
  when: string;
  results: ProbeResult[];
  grade: "A" | "B" | "C" | "F";
  genTokensPerSec: number | null;
}

type Msg = { role: string; content: string | null; tool_calls?: ToolCall[]; tool_call_id?: string };
interface ToolCall {
  id: string;
  function: { name: string; arguments: string };
}

interface ChatResponse {
  choices: { message: Msg; finish_reason: string }[];
  timings?: { predicted_per_second?: number };
}

const TOOL = (name: string, desc: string, props: Record<string, unknown>, req: string[]) => ({
  type: "function",
  function: {
    name,
    description: desc,
    parameters: { type: "object", properties: props, required: req },
  },
});

const WRITE_FILE = TOOL(
  "write_file",
  "Write content to a file at the given path, replacing it if it exists.",
  { path: { type: "string" }, content: { type: "string" } },
  ["path", "content"]
);

const DISTRACTORS = [
  TOOL("read_file", "Read a file's contents.", { path: { type: "string" } }, ["path"]),
  TOOL("list_dir", "List directory entries.", { path: { type: "string" } }, ["path"]),
  TOOL("run_command", "Run a shell command.", { command: { type: "string" } }, ["command"]),
  TOOL("search_code", "Search the codebase for a pattern.", { pattern: { type: "string" } }, ["pattern"]),
  TOOL("git_diff", "Show the current git diff.", {}, []),
  TOOL("rename_symbol", "Rename a symbol across the project.", { from: { type: "string" }, to: { type: "string" } }, ["from", "to"]),
  TOOL("http_get", "Fetch a URL.", { url: { type: "string" } }, ["url"]),
  TOOL("ask_user", "Ask the user a clarifying question.", { question: { type: "string" } }, ["question"]),
];

async function chat(
  messages: Msg[],
  tools: unknown[],
  maxTokens = 512
): Promise<ChatResponse> {
  const res = await fetch(`${BASE_URL}/v1/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "local",
      messages,
      tools,
      temperature: 0,
      max_tokens: maxTokens,
      timings_per_token: false,
    }),
    signal: AbortSignal.timeout(300_000),
  });
  if (!res.ok) throw new Error(`chat failed: ${res.status} ${await res.text()}`);
  return (await res.json()) as ChatResponse;
}

function firstToolCall(r: ChatResponse): ToolCall | null {
  return r.choices[0]?.message?.tool_calls?.[0] ?? null;
}

function parseArgs(tc: ToolCall): Record<string, unknown> | null {
  try {
    return JSON.parse(tc.function.arguments);
  } catch {
    return null;
  }
}

async function timed(
  id: string,
  name: string,
  fn: () => Promise<{ pass: boolean; detail: string; tps: number | null }>
): Promise<ProbeResult> {
  const t0 = Date.now();
  try {
    const { pass, detail, tps } = await fn();
    return { id, name, pass, detail, tokensPerSec: tps, ms: Date.now() - t0 };
  } catch (e) {
    return {
      id,
      name,
      pass: false,
      detail: `error: ${(e as Error).message.slice(0, 200)}`,
      tokensPerSec: null,
      ms: Date.now() - t0,
    };
  }
}

const tps = (r: ChatResponse) => r.timings?.predicted_per_second ?? null;

/**
 * Mechanism-based rubric. The agent LOOP is P1 (emits a well-formed tool call),
 * P2 (selects the right tool under load), P3 (consumes a real tool result) —
 * fail any of these and the model literally cannot drive an agent. P4 (edit
 * fidelity) and P5 (long-context recall) are QUALITY dimensions: a loop-capable
 * model that fails them is usable but will occasionally corrupt an edit or lose
 * context. A also requires usable speed.
 */
export function gradeFromProbes(
  results: Pick<ProbeResult, "id" | "pass">[],
  genTokensPerSec: number | null,
  minTpsForA = 15
): ExamReport["grade"] {
  const by = Object.fromEntries(results.map((r) => [r.id, r.pass]));
  const loopOk = by.P1 && by.P2 && by.P3;
  const qualityPasses = (by.P4 ? 1 : 0) + (by.P5 ? 1 : 0);
  if (!loopOk) return "F";
  if (qualityPasses === 2 && (genTokensPerSec ?? 0) >= minTpsForA) return "A";
  if (qualityPasses >= 1) return "B";
  return "C";
}

export async function runExam(modelId: string, context: number): Promise<ExamReport> {
  const results: ProbeResult[] = [];

  // P1: single tool, must produce a well-formed call with exact content.
  results.push(
    await timed("P1", "single tool call", async () => {
      const r = await chat(
        [
          { role: "system", content: "You are a coding agent. Use tools to act. Do not describe; act." },
          { role: "user", content: 'Create the file hello.txt containing exactly: magic-42' },
        ],
        [WRITE_FILE]
      );
      const tc = firstToolCall(r);
      if (!tc) return { pass: false, detail: `no tool call (content: ${String(r.choices[0]?.message?.content).slice(0, 80)})`, tps: tps(r) };
      const args = parseArgs(tc);
      if (!args) return { pass: false, detail: "unparseable JSON arguments", tps: tps(r) };
      const ok = tc.function.name === "write_file" && String(args.content).includes("magic-42");
      return { pass: ok, detail: ok ? "correct call + args" : `wrong call: ${tc.function.name}(${tc.function.arguments.slice(0, 80)})`, tps: tps(r) };
    })
  );

  // P2: 9 tools available; task requires rename_symbol specifically.
  results.push(
    await timed("P2", "tool selection among 9", async () => {
      const r = await chat(
        [
          { role: "system", content: "You are a coding agent. Use tools to act." },
          { role: "user", content: "Rename the function fetchUser to getUser everywhere in the project." },
        ],
        [WRITE_FILE, ...DISTRACTORS]
      );
      const tc = firstToolCall(r);
      if (!tc) return { pass: false, detail: "no tool call with 9 tools present", tps: tps(r) };
      const args = parseArgs(tc);
      const ok = tc.function.name === "rename_symbol" && args?.from === "fetchUser" && args?.to === "getUser";
      return { pass: ok, detail: ok ? "picked rename_symbol correctly" : `picked ${tc.function.name}(${tc.function.arguments.slice(0, 60)})`, tps: tps(r) };
    })
  );

  // P3: round-trip — tool result comes back; model must use it, not hallucinate.
  results.push(
    await timed("P3", "tool-result round trip", async () => {
      const messages: Msg[] = [
        { role: "system", content: "You are a coding agent. Use tools to act." },
        { role: "user", content: "Read config.json and then write its \"port\" value into port.txt." },
      ];
      const tools = [WRITE_FILE, DISTRACTORS[0]];
      const r1 = await chat(messages, tools);
      const tc1 = firstToolCall(r1);
      if (!tc1 || tc1.function.name !== "read_file") {
        return { pass: false, detail: tc1 ? `expected read_file, got ${tc1.function.name}` : "no tool call", tps: tps(r1) };
      }
      messages.push(r1.choices[0].message);
      messages.push({ role: "tool", tool_call_id: tc1.id, content: '{"port": 7311, "host": "0.0.0.0"}' });
      const r2 = await chat(messages, tools);
      const tc2 = firstToolCall(r2);
      if (!tc2 || tc2.function.name !== "write_file") {
        return { pass: false, detail: tc2 ? `expected write_file, got ${tc2.function.name}` : "no second tool call", tps: tps(r2) };
      }
      const args = parseArgs(tc2);
      const ok = String(args?.content ?? "").includes("7311");
      return { pass: ok, detail: ok ? "used real tool result (7311)" : `wrote ${JSON.stringify(args).slice(0, 80)}`, tps: tps(r2) };
    })
  );

  // P4: argument fidelity with quotes/newlines/braces.
  results.push(
    await timed("P4", "tricky-string arg fidelity", async () => {
      const payload = 'console.log("a\\"b", `x${y}`);\n// done';
      const r = await chat(
        [
          { role: "system", content: "You are a coding agent. Use tools to act." },
          { role: "user", content: `Write a file snippet.js whose content is exactly this code (preserve every character):\n\`\`\`\n${payload}\n\`\`\`` },
        ],
        [WRITE_FILE]
      );
      const tc = firstToolCall(r);
      const args = tc && parseArgs(tc);
      if (!tc || !args) return { pass: false, detail: "no parseable tool call", tps: tps(r) };
      const got = String(args.content ?? "");
      const ok = got.includes('a\\"b') && got.includes("${y}");
      return { pass: ok, detail: ok ? "special chars survived JSON encoding" : `content degraded: ${JSON.stringify(got.slice(0, 60))}`, tps: tps(r) };
    })
  );

  // P5: long context — bury a constant early, fill to ~60% of context, recall.
  results.push(
    await timed("P5", "long-context recall", async () => {
      const filler = "function pad_%i(x){ return x + %i; } // filler line\n";
      // Cap the probe prompt: prefill on laptop hardware runs ~100 tok/s, so a
      // full 32K-context probe would take minutes. 8K of filler still catches
      // the recall failure mode while keeping the exam under ~2 minutes.
      const targetTokens = Math.min(Math.floor(context * 0.6), 8192);
      const lines = Math.max(50, Math.floor(targetTokens / 14)); // ~14 tok/line
      let body = "// PROJECT CONSTANT: BUILD_ID = 90125\n";
      for (let i = 0; i < lines; i++) body += filler.replaceAll("%i", String(i));
      // maxTokens must leave room for a short preamble + the whole tool call:
      // at 256 tokens some models (e.g. Qwen3) get truncated mid-call and
      // finish_reason=length yields no parseable call — a false negative.
      const r = await chat(
        [
          { role: "system", content: "You are a coding agent. Use tools to act." },
          { role: "user", content: `Here is utils.js:\n${body}\nWrite the BUILD_ID value (just the number) to build_id.txt.` },
        ],
        [WRITE_FILE],
        512
      );
      const tc = firstToolCall(r);
      const args = tc && parseArgs(tc);
      if (!tc || !args) return { pass: false, detail: "no parseable tool call", tps: tps(r) };
      const ok = String(args.content ?? "").includes("90125");
      return { pass: ok, detail: ok ? "recalled constant from context start" : `wrote ${JSON.stringify(args.content).slice(0, 40)}`, tps: tps(r) };
    })
  );

  const speeds = results.map((r) => r.tokensPerSec).filter((x): x is number => x !== null);
  const genTps = speeds.length ? speeds.reduce((a, b) => a + b, 0) / speeds.length : null;
  const grade = gradeFromProbes(results, genTps);

  return {
    modelId,
    context,
    when: new Date().toISOString(),
    results,
    grade,
    genTokensPerSec: genTps,
  };
}
