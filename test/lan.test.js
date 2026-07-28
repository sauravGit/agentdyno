// Unit tests for LAN mode's token/remote-config plumbing. The mDNS
// advertise/discover functions and the API server's auth gate were verified
// LIVE against a real network interface (see BUILD_LOG.md D-026) — those
// need a real socket/multicast environment and aren't re-tested here;
// this file locks the pure logic that IS unit-testable in isolation.
import { test } from "node:test";
import assert from "node:assert";

// catalog.ts's HOME is derived from os.homedir() at import time, so to test
// token/remote-config persistence in isolation we point HOME at a scratch
// dir via an env var some tests already rely on... simplest robust approach:
// exercise the real ~/.magix-box paths (matches how every other test in this
// suite already touches ~/.magix-box for reports) but clean up afterward.
const { getOrCreateLanToken, saveRemoteConfig, loadRemoteConfig, clearRemoteConfig } = await import("../dist/src/lan.js");

test("getOrCreateLanToken persists and returns the SAME token across calls", () => {
  const a = getOrCreateLanToken();
  const b = getOrCreateLanToken();
  assert.equal(a, b);
  assert.equal(a.length, 48); // 24 random bytes, hex-encoded
});

test("remote config round-trips through save/load/clear", () => {
  clearRemoteConfig();
  assert.equal(loadRemoteConfig(), null);

  saveRemoteConfig({ baseUrl: "http://192.168.1.50:8403", token: "abc123" });
  const loaded = loadRemoteConfig();
  assert.deepEqual(loaded, { baseUrl: "http://192.168.1.50:8403", token: "abc123" });

  clearRemoteConfig();
  assert.equal(loadRemoteConfig(), null);
});

test("loadRemoteConfig returns null (not a throw) for a corrupt file", () => {
  clearRemoteConfig(); // clearRemoteConfig writes an empty file, which is invalid JSON
  assert.equal(loadRemoteConfig(), null);
});
