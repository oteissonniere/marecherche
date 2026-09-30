import { test } from "node:test";
import assert from "node:assert/strict";
import {
  extractPrivateQuery, extractPublicQuery, extractInterceptedQuery, buildPrivateUrl, buildPublicUrl, privateOrigin
} from "../src/lib/url.js";
import { configured } from "./fixtures.js";

const config = configured();

test("privateOrigin keeps scheme, host and port", () => {
  assert.equal(privateOrigin(config), "http://192.168.1.10:8080");
});

test("extractPrivateQuery returns the encoded query of a private search", () => {
  assert.equal(extractPrivateQuery(config, "http://192.168.1.10:8080/search?q=hello+world"), "hello%20world");
  assert.equal(extractPrivateQuery(config, "http://192.168.1.10:8080/search?language=fr&q=chat"), "chat");
  assert.equal(extractPrivateQuery(config, "http://192.168.1.10:8080/search?q="), "");
});

test("extractPrivateQuery ignores everything else", () => {
  assert.equal(extractPrivateQuery(config, "https://www.google.com/search?q=chat"), null);
  assert.equal(extractPrivateQuery(config, "http://192.168.1.10:8080/preferences?q=chat"), null);
  assert.equal(extractPrivateQuery(config, "http://192.168.1.10:8080/search"), null);
  assert.equal(extractPrivateQuery(config, "http://192.168.1.158:9999/search?q=chat"), null);
  assert.equal(extractPrivateQuery(config, "not a url"), null);
});

test("accents and reserved characters stay percent-encoded", () => {
  const q = extractPrivateQuery(config, "http://192.168.1.10:8080/search?q=caf%C3%A9+%26+th%C3%A9%3F");
  assert.equal(q, "caf%C3%A9%20%26%20th%C3%A9%3F");
  assert.equal(decodeURIComponent(q), "café & thé?");
});

test("a private engine hosted under a sub-path is supported", () => {
  const nested = configured({ privateEngine: { url: "https://home.example/searx" } });
  assert.equal(extractPrivateQuery(nested, "https://home.example/searx/search?q=chat"), "chat");
  assert.equal(extractPrivateQuery(nested, "https://home.example/search?q=chat"), null);
});

test("buildPublicUrl substitutes {q} once", () => {
  assert.equal(buildPublicUrl(config, "caf%C3%A9"), "https://www.qwant.com/?q=caf%C3%A9");
});

test("extractPublicQuery recognises the configured public engine only", () => {
  assert.equal(extractPublicQuery(config, "https://www.qwant.com/?q=caf%C3%A9"), "caf%C3%A9");
  assert.equal(extractPublicQuery(config, "https://www.qwant.com/?t=web&q=chat"), "chat");
  assert.equal(extractPublicQuery(config, "https://www.qwant.com/maps?q=chat"), null);
  assert.equal(extractPublicQuery(config, "https://duckduckgo.com/?q=chat"), null);
  const custom = configured({ publicEngineId: "custom", publicCustomUrl: "https://s.example/find?query={q}" });
  assert.equal(extractPublicQuery(custom, "https://s.example/find?query=chat"), "chat");
});

test("extractInterceptedQuery matches what the redirect rules match", () => {
  assert.equal(extractInterceptedQuery(config, "https://www.google.com/search?q=hello+world&client=safari"), "hello+world");
  assert.equal(extractInterceptedQuery(config, "https://www.google.com/search?q=hello+world"), null); // no signature
  const everything = configured({ onlyAddressBar: false });
  assert.equal(extractInterceptedQuery(everything, "https://www.google.com/search?q=hello"), "hello");
  const bingOnly = configured({ interceptedEngineIds: ["bing"] });
  assert.equal(extractInterceptedQuery(bingOnly, "https://www.google.com/search?q=x&client=safari"), null);
});

test("buildPrivateUrl substitutes {q} into the private template", () => {
  assert.equal(buildPrivateUrl(config, "caf%C3%A9"), "http://192.168.1.10:8080/search?q=caf%C3%A9");
});
