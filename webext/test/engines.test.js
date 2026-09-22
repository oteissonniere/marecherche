import { test } from "node:test";
import assert from "node:assert/strict";
import {
  INTERCEPTED_ENGINES, PUBLIC_ENGINES, publicTemplate, privateTemplate, publicInterceptedId
} from "../src/lib/engines.js";
import { normalizeConfig } from "../src/lib/config.js";

test("every intercepted engine has the expected shape", () => {
  for (const [key, engine] of Object.entries(INTERCEPTED_ENGINES)) {
    assert.equal(engine.id, key);
    for (const field of ["nameKey", "hostPattern", "path", "queryParam"]) {
      assert.equal(typeof engine[field], "string", `${key}.${field}`);
    }
    assert.ok(engine.path.startsWith("/"));
    assert.ok(Array.isArray(engine.signatures));
    assert.doesNotThrow(() => new RegExp(engine.hostPattern));
  }
});

test("every public engine url contains {q} exactly once and is https", () => {
  for (const [key, engine] of Object.entries(PUBLIC_ENGINES)) {
    assert.equal(engine.id, key);
    assert.equal(engine.url.split("{q}").length - 1, 1, key);
    assert.ok(engine.url.startsWith("https://"), key);
    if (engine.interceptedId !== null) assert.ok(INTERCEPTED_ENGINES[engine.interceptedId], key);
  }
});

test("publicTemplate resolves catalog and custom engines", () => {
  assert.equal(publicTemplate(normalizeConfig({})), "https://www.qwant.com/?q={q}");
  const custom = normalizeConfig({ publicEngineId: "custom", publicCustomUrl: "https://example.com/s?q={q}" });
  assert.equal(publicTemplate(custom), "https://example.com/s?q={q}");
});

test("privateTemplate joins base url and search path", () => {
  assert.equal(privateTemplate(normalizeConfig({})), "http://192.168.1.158:8092/search?q={q}");
});

test("publicInterceptedId maps public engines to intercepted ones", () => {
  assert.equal(publicInterceptedId(normalizeConfig({ publicEngineId: "google" })), "google");
  assert.equal(publicInterceptedId(normalizeConfig({ publicEngineId: "qwant" })), null);
  assert.equal(publicInterceptedId(normalizeConfig({ publicEngineId: "custom" })), null);
});
