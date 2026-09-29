import { test } from "node:test";
import assert from "node:assert/strict";
import { allRuleIds, regexFiltersFor, buildRules } from "../src/lib/rules.js";
import { INTERCEPTED_ENGINES, PUBLIC_ENGINES } from "../src/lib/engines.js";
import { normalizeConfig } from "../src/lib/config.js";

// First capture among the engine's filters, or null when none matches.
function capture(engine, onlyAddressBar, url) {
  for (const { regexFilter } of regexFiltersFor(engine, onlyAddressBar)) {
    const match = new RegExp(regexFilter).exec(url);
    if (match) return match[1];
  }
  return null;
}

test("allRuleIds has no duplicates", () => {
  const ids = allRuleIds();
  assert.equal(new Set(ids).size, ids.length);
});

test("allRuleIds covers every id buildRules can emit", () => {
  const known = new Set(allRuleIds());
  for (const onlyAddressBar of [true, false]) {
    for (const target of ["private", "public"]) {
      for (const publicEngineId of Object.keys(PUBLIC_ENGINES)) {
        const config = normalizeConfig({ onlyAddressBar, publicEngineId });
        for (const rule of buildRules(config, target)) assert.ok(known.has(rule.id), `id ${rule.id}`);
      }
    }
  }
});

test("rule ids are unique within a rule set", () => {
  const rules = buildRules(normalizeConfig({}), "private");
  assert.equal(new Set(rules.map((r) => r.id)).size, rules.length);
});

test("google address-bar searches are captured", () => {
  const google = INTERCEPTED_ENGINES.google;
  const cases = [
    ["https://www.google.com/search?q=hello+world&ie=UTF-8&client=safari", "hello+world"],
    ["https://www.google.com/search?q=hello+world&client=safari&hl=fr", "hello+world"],
    ["https://www.google.com/search?client=safari&q=hello+world", "hello+world"],
    ["https://www.google.com/search?client=safari&hl=fr&q=caf%C3%A9&x=1", "caf%C3%A9"],
    ["https://www.google.com/search?q=&client=safari", ""],
    ["https://www.google.fr/search?q=x&client=safari", "x"]
  ];
  for (const [url, expected] of cases) assert.equal(capture(google, true, url), expected, url);
});

test("google non address-bar URLs are left alone", () => {
  const google = INTERCEPTED_ENGINES.google;
  for (const url of [
    "https://www.google.com/search?q=hello+world",
    "https://www.google.com/maps?q=x&client=safari",
    "https://www.google.com/search?hq=x&client=safari"
  ]) assert.equal(capture(google, true, url), null, url);
});

test("onlyAddressBar=false emits one rule matching without signature", () => {
  const filters = regexFiltersFor(INTERCEPTED_ENGINES.google, false);
  assert.equal(filters.length, 1);
  assert.equal(capture(INTERCEPTED_ENGINES.google, false, "https://www.google.com/search?q=hello"), "hello");
});

test("engine without signatures falls back to the signature-less rule", () => {
  const engine = { ...INTERCEPTED_ENGINES.ecosia, signatures: [] };
  assert.equal(regexFiltersFor(engine, true).length, 1);
});

test("yahoo uses p= and duckduckgo matches the root path", () => {
  assert.equal(capture(INTERCEPTED_ENGINES.yahoo, true, "https://fr.search.yahoo.com/search?p=chat&fr=aaplw"), "chat");
  assert.equal(capture(INTERCEPTED_ENGINES.yahoo, true, "https://search.yahoo.com/search?q=chat&fr=aaplw"), null);
  assert.equal(capture(INTERCEPTED_ENGINES.duckduckgo, true, "https://duckduckgo.com/?q=a+b&t=osx"), "a+b");
});

test("iPhone address-bar URLs captured on device are intercepted", () => {
  // Captured on an iPhone with the extension disabled (docs/engine-signatures.md).
  assert.equal(capture(INTERCEPTED_ENGINES.ecosia, true,
    "https://www.ecosia.org/search?q=hello+world&tts=st_asaf_iphone"), "hello+world");
  assert.equal(capture(INTERCEPTED_ENGINES.yahoo, true,
    "https://fr.search.yahoo.com/search?p=hello+world&fr=iphone&.tsrc=apple"), "hello+world");
  assert.equal(capture(INTERCEPTED_ENGINES.duckduckgo, true,
    "https://duckduckgo.com/?q=hello+world&t=iphone&ia=web"), "hello+world");
  assert.equal(capture(INTERCEPTED_ENGINES.bing, true,
    "https://www.bing.com/search?q=hello+world&form=APIPH1&PC=APPL"), "hello+world");
  assert.equal(capture(INTERCEPTED_ENGINES.google, true,
    "https://www.google.com/search?q=hello+world&ie=UTF-8&oe=UTF-8&hl=fr-fr&client=safari"), "hello+world");
});

test("macOS address-bar signatures are still intercepted", () => {
  assert.equal(capture(INTERCEPTED_ENGINES.ecosia, true,
    "https://www.ecosia.org/search?tts=st_asaf_macos&q=safari+themes"), "safari+themes");
  assert.equal(capture(INTERCEPTED_ENGINES.yahoo, true,
    "https://search.yahoo.com/search?p=chat&fr=aaplw"), "chat");
});

test("loop guard: public target never redirects an engine to itself", () => {
  const config = normalizeConfig({ publicEngineId: "google" });
  const googleIds = new Set(regexFiltersFor(INTERCEPTED_ENGINES.google, true).map((f) => f.id));
  assert.ok(!buildRules(config, "public").some((r) => googleIds.has(r.id)));
  assert.ok(buildRules(config, "private").some((r) => googleIds.has(r.id)));
});

test("regexSubstitution points at the decided target", () => {
  const config = normalizeConfig({});
  assert.equal(buildRules(config, "private")[0].action.redirect.regexSubstitution,
    "http://192.168.1.158:8092/search?q=\\1");
  assert.equal(buildRules(config, "public")[0].action.redirect.regexSubstitution,
    "https://www.qwant.com/?q=\\1");
});

test("rules only target top-level navigations", () => {
  for (const rule of buildRules(normalizeConfig({}), "private")) {
    assert.deepEqual(rule.condition.resourceTypes, ["main_frame"]);
    assert.equal(rule.action.type, "redirect");
  }
});

test("no regex uses alternation or lookaround (rejected by Safari)", () => {
  for (const engine of Object.values(INTERCEPTED_ENGINES)) {
    for (const onlyAddressBar of [true, false]) {
      for (const { regexFilter } of regexFiltersFor(engine, onlyAddressBar)) {
        assert.ok(!regexFilter.includes("|"), regexFilter);
        assert.ok(!regexFilter.includes("(?=") && !regexFilter.includes("(?<") && !regexFilter.includes("(?!"));
      }
    }
  }
});

test("only intercepted engines from the config produce rules", () => {
  const config = normalizeConfig({ interceptedEngineIds: ["bing"] });
  const bingIds = new Set(regexFiltersFor(INTERCEPTED_ENGINES.bing, true).map((f) => f.id));
  const rules = buildRules(config, "private");
  assert.ok(rules.length > 0 && rules.every((r) => bingIds.has(r.id)));
});
