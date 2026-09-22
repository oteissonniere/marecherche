import { test } from "node:test";
import assert from "node:assert/strict";
import { probe } from "../src/lib/probe.js";
import { normalizeConfig } from "../src/lib/config.js";

const config = normalizeConfig({ probeTimeoutMs: 200 });

test("a resolved fetch means reachable, with a no-cors GET on the probe url", async () => {
  let seen;
  const reachable = await probe(config, async (url, init) => { seen = { url, init }; return {}; });
  assert.equal(reachable, true);
  assert.equal(seen.url, "http://192.168.1.158:8092/healthz");
  assert.equal(seen.init.method, "GET");
  assert.equal(seen.init.mode, "no-cors");
  assert.equal(seen.init.credentials, "omit");
});

test("an explicit timeout overrides the configured one", async () => {
  const slow = (url, { signal }) => new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, 600);
    signal.addEventListener("abort", () => { clearTimeout(timer); reject(new Error("aborted")); });
  });
  assert.equal(await probe(config, slow), false);        // 200 ms configured
  assert.equal(await probe(config, slow, 1500), true);   // explicit 1.5 s
});

test("a rejected fetch means unreachable", async () => {
  assert.equal(await probe(config, async () => { throw new TypeError("network"); }), false);
});

test("a fetch slower than the timeout is aborted and counts as unreachable", async () => {
  const slow = (url, { signal }) => new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, 5000);
    signal.addEventListener("abort", () => { clearTimeout(timer); reject(new Error("aborted")); });
  });
  const started = Date.now();
  assert.equal(await probe(config, slow), false);
  assert.ok(Date.now() - started < 1000);
});
