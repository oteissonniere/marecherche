import { test } from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_CONFIG, DEFAULT_STATE, CONFIG_KEY, STATE_KEY,
  normalizeConfig, validateConfig, loadConfig, saveConfig, loadState, saveState
} from "../src/lib/config.js";

// Minimal in-memory stand-in for browser.storage.local.
function fakeStorage(initial = {}) {
  const data = { ...initial };
  return {
    data,
    async get(key) { return key in data ? { [key]: data[key] } : {}; },
    async set(items) { Object.assign(data, items); }
  };
}

test("normalizeConfig({}) equals defaults", () => {
  assert.deepEqual(normalizeConfig({}), JSON.parse(JSON.stringify(DEFAULT_CONFIG)));
  assert.deepEqual(normalizeConfig(undefined), JSON.parse(JSON.stringify(DEFAULT_CONFIG)));
});

test("normalizeConfig drops unknown keys and merges partial privateEngine", () => {
  const config = normalizeConfig({ bogus: 1, privateEngine: { url: "https://searx.home/", extra: true } });
  assert.equal(config.bogus, undefined);
  assert.equal(config.privateEngine.extra, undefined);
  assert.equal(config.privateEngine.url, "https://searx.home");
  assert.equal(config.privateEngine.searchPath, "/search?q={q}");
});

test("normalizeConfig never aliases the frozen defaults", () => {
  const config = normalizeConfig({});
  config.interceptedEngineIds.push("x");
  assert.equal(DEFAULT_CONFIG.interceptedEngineIds.length, 5);
});

test("defaults are valid", () => {
  assert.equal(validateConfig({}).ok, true);
});

test("validateConfig rejects bad values", () => {
  const bad = [
    [{ privateEngine: { url: "http://host/?a=1" } }, "privateEngine.url:no-query"],
    [{ privateEngine: { url: "ftp://host" } }, "privateEngine.url:protocol"],
    [{ privateEngine: { url: "nope" } }, "privateEngine.url:invalid"],
    [{ privateEngine: { searchPath: "/search" } }, "privateEngine.searchPath:invalid"],
    [{ privateEngine: { searchPath: "search?q={q}" } }, "privateEngine.searchPath:invalid"],
    [{ privateEngine: { searchPath: "/s?q={q}&r={q}" } }, "privateEngine.searchPath:invalid"],
    [{ privateEngine: { probePath: "health" } }, "privateEngine.probePath:invalid"],
    [{ publicEngineId: "altavista" }, "publicEngineId:unknown"],
    [{ publicEngineId: "custom" }, "publicCustomUrl:invalid"],
    [{ publicEngineId: "custom", publicCustomUrl: "http://x.com/?q={q}" }, "publicCustomUrl:invalid"],
    [{ publicEngineId: "custom", publicCustomUrl: "https://x.com/" }, "publicCustomUrl:invalid"],
    [{ interceptedEngineIds: [] }, "interceptedEngineIds:empty"],
    [{ interceptedEngineIds: ["google", "google"] }, "interceptedEngineIds:duplicate"],
    [{ interceptedEngineIds: ["lycos"] }, "interceptedEngineIds:unknown"],
    [{ mode: "manual" }, "mode:invalid"],
    [{ probeTimeoutMs: 100 }, "probeTimeoutMs:range"],
    [{ probeTimeoutMs: 800.5 }, "probeTimeoutMs:range"],
    [{ probeIntervalMin: 0 }, "probeIntervalMin:range"],
    [{ onlyAddressBar: "yes" }, "onlyAddressBar:invalid"]
  ];
  for (const [candidate, expected] of bad) {
    const result = validateConfig(candidate);
    assert.equal(result.ok, false, JSON.stringify(candidate));
    assert.ok(result.errors.includes(expected), `${JSON.stringify(candidate)} -> ${result.errors}`);
  }
});

test("validateConfig accepts a custom https engine", () => {
  const result = validateConfig({ publicEngineId: "custom", publicCustomUrl: "https://x.com/?q={q}" });
  assert.equal(result.ok, true);
});

test("loadConfig falls back to defaults on invalid stored data", async () => {
  const storage = fakeStorage({ [CONFIG_KEY]: { mode: "bogus" } });
  assert.equal((await loadConfig(storage)).mode, "auto");
});

test("saveConfig then loadConfig round-trips", async () => {
  const storage = fakeStorage();
  await saveConfig(storage, { ...normalizeConfig({}), publicEngineId: "brave", mode: "force-public" });
  const loaded = await loadConfig(storage);
  assert.equal(loaded.publicEngineId, "brave");
  assert.equal(loaded.mode, "force-public");
});

test("saveState shallow-merges onto the existing state", async () => {
  const storage = fakeStorage();
  assert.deepEqual(await loadState(storage), { ...DEFAULT_STATE });
  await saveState(storage, { reachable: true, checkedAt: 42 });
  await saveState(storage, { activeTarget: "private" });
  assert.deepEqual(storage.data[STATE_KEY], { reachable: true, checkedAt: 42, activeTarget: "private" });
});
