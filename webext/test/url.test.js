import { test } from "node:test";
import assert from "node:assert/strict";
import { extractPrivateQuery, buildPublicUrl, privateOrigin } from "../src/lib/url.js";
import { normalizeConfig } from "../src/lib/config.js";

const config = normalizeConfig({});

test("privateOrigin keeps scheme, host and port", () => {
  assert.equal(privateOrigin(config), "http://192.168.1.158:8092");
});

test("extractPrivateQuery returns the encoded query of a private search", () => {
  assert.equal(extractPrivateQuery(config, "http://192.168.1.158:8092/search?q=hello+world"), "hello%20world");
  assert.equal(extractPrivateQuery(config, "http://192.168.1.158:8092/search?language=fr&q=chat"), "chat");
  assert.equal(extractPrivateQuery(config, "http://192.168.1.158:8092/search?q="), "");
});

test("extractPrivateQuery ignores everything else", () => {
  assert.equal(extractPrivateQuery(config, "https://www.google.com/search?q=chat"), null);
  assert.equal(extractPrivateQuery(config, "http://192.168.1.158:8092/preferences?q=chat"), null);
  assert.equal(extractPrivateQuery(config, "http://192.168.1.158:8092/search"), null);
  assert.equal(extractPrivateQuery(config, "http://192.168.1.158:9999/search?q=chat"), null);
  assert.equal(extractPrivateQuery(config, "not a url"), null);
});

test("accents and reserved characters stay percent-encoded", () => {
  const q = extractPrivateQuery(config, "http://192.168.1.158:8092/search?q=caf%C3%A9+%26+th%C3%A9%3F");
  assert.equal(q, "caf%C3%A9%20%26%20th%C3%A9%3F");
  assert.equal(decodeURIComponent(q), "café & thé?");
});

test("a private engine hosted under a sub-path is supported", () => {
  const nested = normalizeConfig({ privateEngine: { url: "https://home.example/searx" } });
  assert.equal(extractPrivateQuery(nested, "https://home.example/searx/search?q=chat"), "chat");
  assert.equal(extractPrivateQuery(nested, "https://home.example/search?q=chat"), null);
});

test("buildPublicUrl substitutes {q} once", () => {
  assert.equal(buildPublicUrl(config, "caf%C3%A9"), "https://www.qwant.com/?q=caf%C3%A9");
});
