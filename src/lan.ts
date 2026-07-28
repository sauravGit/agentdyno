// LAN / remote mode: let a second machine on the same WiFi/network discover
// and use a running AgentDyno server, from its own VS Code or CLI, "as if it
// were local."
//
// SECURITY MODEL (this is the load-bearing decision, read before changing):
// - Default ("local mode") is unchanged: everything binds to 127.0.0.1 only,
//   no auth, zero friction — exactly the existing "loopback only by
//   construction" posture.
// - Opt-in "LAN mode" (`dyno dashboard --lan`) binds the control-plane API
//   server (api.ts, port 8403) to 0.0.0.0 and requires a bearer token on
//   every /api/* route except a small public identity endpoint. The token is
//   generated once, persisted, and never transmitted over mDNS — a human
//   copies it from the host machine to the client once (a pairing code, not
//   an auto-shared secret).
// - The raw inference port (llama-server 8402 / Ollama 11434) is NEVER bound
//   to the LAN directly — llama-server itself has no authentication, so
//   exposing it on a shared network unauthenticated would hand out
//   unrestricted model access to every device on that WiFi. Instead, the
//   authenticated API server proxies inference requests
//   (see api.ts's /v1/* proxy route) so exactly one port, the auth-gated
//   one, is ever reachable from the network.
// - mDNS advertises PRESENCE only (hostname, port) — never the token.

import { randomBytes } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import os from "node:os";
import { HOME } from "./catalog.js";

const TOKEN_PATH = join(HOME, "lan-token");
const SERVICE_TYPE = "agentdyno";
const REMOTE_CONFIG_PATH = join(HOME, "remote.json");

export function getOrCreateLanToken(): string {
  if (existsSync(TOKEN_PATH)) {
    const existing = readFileSync(TOKEN_PATH, "utf8").trim();
    if (existing) return existing;
  }
  mkdirSync(HOME, { recursive: true });
  const token = randomBytes(24).toString("hex");
  writeFileSync(TOKEN_PATH, token, { mode: 0o600 });
  return token;
}

export interface DiscoveredServer {
  name: string;
  host: string;
  addresses: string[];
  port: number;
}

/** Advertise this server on the LAN via mDNS/Bonjour. Presence only — no secrets. */
export async function advertiseLan(port: number): Promise<() => void> {
  const { default: Bonjour } = await import("bonjour-service");
  const bonjour = new Bonjour();
  const service = bonjour.publish({
    name: `agentdyno-${os.hostname()}`,
    type: SERVICE_TYPE,
    port,
    txt: { host: os.hostname() }, // presence hint only, never the token
  });
  service.start();
  return () => {
    bonjour.unpublishAll(() => bonjour.destroy());
  };
}

/** Browse the LAN for advertised AgentDyno servers for `timeoutMs`, then return what was found. */
export async function discoverLan(timeoutMs = 3000): Promise<DiscoveredServer[]> {
  const { default: Bonjour } = await import("bonjour-service");
  const bonjour = new Bonjour();
  const found: DiscoveredServer[] = [];
  const browser = bonjour.find({ type: SERVICE_TYPE }, (service) => {
    found.push({
      name: service.name,
      host: service.host,
      addresses: service.addresses ?? [],
      port: service.port,
    });
  });
  await new Promise((resolve) => setTimeout(resolve, timeoutMs));
  browser.stop();
  bonjour.destroy();
  return found;
}

export interface RemoteConfig {
  baseUrl: string;
  token: string;
}

export function saveRemoteConfig(cfg: RemoteConfig): void {
  mkdirSync(HOME, { recursive: true });
  writeFileSync(REMOTE_CONFIG_PATH, JSON.stringify(cfg, null, 2), { mode: 0o600 });
}

export function loadRemoteConfig(): RemoteConfig | null {
  if (!existsSync(REMOTE_CONFIG_PATH)) return null;
  try {
    return JSON.parse(readFileSync(REMOTE_CONFIG_PATH, "utf8"));
  } catch {
    return null;
  }
}

export function clearRemoteConfig(): void {
  if (existsSync(REMOTE_CONFIG_PATH)) writeFileSync(REMOTE_CONFIG_PATH, "");
}
