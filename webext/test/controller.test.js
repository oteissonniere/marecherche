import { test } from "node:test";
import assert from "node:assert/strict";
import { createController, ALARM_NAME } from "../src/lib/controller.js";
import { CONFIG_KEY, STATE_KEY, normalizeConfig } from "../src/lib/config.js";

const PRIVATE_SEARCH = "http://192.168.1.158:8092/search?q=chat";
const QWANT_SEARCH = "https://www.qwant.com/?q=chat";
const GOOGLE_ADDRESS_BAR = "https://www.google.com/search?q=chat&client=safari";
const silent = { log() {}, warn() {}, error() {} };

// In-memory WebExtension API that records what the controller does.
function fakeBrowser({ config = {}, state = {} } = {}) {
  const data = {
    [CONFIG_KEY]: normalizeConfig(config),
    [STATE_KEY]: { reachable: null, checkedAt: 0, activeTarget: "private", ...state }
  };
  const listeners = {};
  const event = (name) => ({ addListener(fn) { listeners[name] = fn; } });
  const calls = { rules: [], tabs: [], alarms: [], order: [] };
  return {
    data, listeners, calls,
    storage: {
      local: {
        async get(key) { return key in data ? { [key]: structuredClone(data[key]) } : {}; },
        async set(items) { Object.assign(data, structuredClone(items)); }
      },
      onChanged: event("storageChanged")
    },
    declarativeNetRequest: {
      async updateDynamicRules(update) { calls.rules.push(update); calls.order.push("rules"); }
    },
    tabs: {
      async update(tabId, props) { calls.tabs.push({ tabId, ...props }); calls.order.push("tab"); }
    },
    alarms: {
      async create(name, options) { calls.alarms.push(["create", name, options]); },
      async clear(name) { calls.alarms.push(["clear", name]); },
      onAlarm: event("alarm")
    },
    runtime: { onInstalled: event("installed"), onStartup: event("startup"), onMessage: event("message") },
    webNavigation: { onBeforeNavigate: event("beforeNavigate"), onErrorOccurred: event("errorOccurred") }
  };
}

// fetch stand-in answering each probe in turn (true = the instance answers). A probe
// beyond the scripted ones fails the test, so the number of probes is checked too.
function probes(...outcomes) {
  const remaining = [...outcomes];
  const fetchImpl = async (url) => {
    if (remaining.length === 0) throw new assert.AssertionError({ message: `unexpected probe of ${url}` });
    if (!remaining.shift()) throw new TypeError("network error");
    return {};
  };
  fetchImpl.remaining = () => remaining.length;
  return fetchImpl;
}

function setup({ config, state, fetchImpl = probes() } = {}) {
  const browser = fakeBrowser({ config, state });
  const controller = createController({ browser, fetchImpl, now: () => 1000, log: silent });
  return { browser, controller, fetchImpl };
}

// Where the last installed rules send searches: "private", "public", or null if none.
function rulesTarget(browser) {
  const last = browser.calls.rules.at(-1);
  if (!last) return null;
  const substitution = last.addRules[0]?.action.redirect.regexSubstitution ?? "";
  return substitution.startsWith("http://192.168.1.158:8092/") ? "private" : "public";
}

const navigation = (url, extra = {}) => ({ frameId: 0, tabId: 7, url, ...extra });

// Regression: after landing on the instance, the tab bounced to Qwant.

test("a transient probe failure during a private search does not bounce the tab", async () => {
  const { browser, controller, fetchImpl } = setup({ fetchImpl: probes(false, true) });
  await controller.onBeforeNavigate(navigation(PRIVATE_SEARCH));
  assert.deepEqual(browser.calls.tabs, []);
  assert.deepEqual(browser.calls.rules, []);
  assert.equal(browser.data[STATE_KEY].reachable, true);
  assert.equal(fetchImpl.remaining(), 0);
});

test("a navigation error on the private engine never falls back without a failed probe", async () => {
  const { browser, controller } = setup({ fetchImpl: probes(true) });
  await controller.onErrorOccurred(navigation(PRIVATE_SEARCH, { error: "net::ERR_ABORTED" }));
  assert.deepEqual(browser.calls.tabs, []);
  assert.deepEqual(browser.calls.rules, []);
});

test("a confirmed unreachable private engine falls back, switching the rules first", async () => {
  const { browser, controller } = setup({ fetchImpl: probes(false, false) });
  await controller.onBeforeNavigate(navigation(PRIVATE_SEARCH));
  assert.equal(rulesTarget(browser), "public");
  assert.deepEqual(browser.calls.tabs, [{ tabId: 7, url: QWANT_SEARCH }]);
  assert.deepEqual(browser.calls.order, ["rules", "tab"]);
  assert.equal(browser.data[STATE_KEY].activeTarget, "public");
});

// Regression: the target flapped between Qwant and SearXNG when Wi-Fi came back.

test("periodic refresh: a single failure does not leave the private engine", async () => {
  const { browser, controller, fetchImpl } = setup({ fetchImpl: probes(false, true) });
  await controller.onAlarm({ name: ALARM_NAME });
  assert.deepEqual(browser.calls.rules, []);
  assert.equal(browser.data[STATE_KEY].activeTarget, "private");
  assert.equal(fetchImpl.remaining(), 0);
});

test("periodic refresh: a confirmed failure switches to the public engine", async () => {
  const { browser, controller } = setup({ fetchImpl: probes(false, false) });
  await controller.onAlarm({ name: ALARM_NAME });
  assert.equal(rulesTarget(browser), "public");
  assert.equal(browser.data[STATE_KEY].activeTarget, "public");
});

test("periodic refresh: one success is enough to return to the private engine", async () => {
  const { browser, controller } = setup({ state: { activeTarget: "public" }, fetchImpl: probes(true) });
  await controller.onAlarm({ name: ALARM_NAME });
  assert.equal(rulesTarget(browser), "private");
});

test("other alarms are ignored", () => {
  const { controller } = setup();
  assert.equal(controller.onAlarm({ name: "something-else" }), undefined);
});

// Regression: back home, it took three searches to reach SearXNG.

test("back on the home network, a search heading to the public engine upgrades", async () => {
  const { browser, controller } = setup({ state: { activeTarget: "public" }, fetchImpl: probes(true) });
  await controller.onBeforeNavigate(navigation(QWANT_SEARCH));
  assert.equal(rulesTarget(browser), "private");
  assert.deepEqual(browser.calls.tabs, [{ tabId: 7, url: PRIVATE_SEARCH }]);
  assert.deepEqual(browser.calls.order, ["rules", "tab"]);
});

test("the upgrade also triggers on the address-bar URL, before the redirect", async () => {
  const { browser, controller } = setup({ state: { activeTarget: "public" }, fetchImpl: probes(true) });
  await controller.onBeforeNavigate(navigation(GOOGLE_ADDRESS_BAR));
  assert.deepEqual(browser.calls.tabs, [{ tabId: 7, url: PRIVATE_SEARCH }]);
});

test("a public engine load error upgrades when the private engine answers", async () => {
  const { browser, controller } = setup({ state: { activeTarget: "public" }, fetchImpl: probes(true) });
  await controller.onErrorOccurred(navigation(QWANT_SEARCH, { error: "net::ERR_NETWORK_CHANGED" }));
  assert.deepEqual(browser.calls.tabs, [{ tabId: 7, url: PRIVATE_SEARCH }]);
});

test("no upgrade while the private engine still does not answer", async () => {
  const { browser, controller } = setup({ state: { activeTarget: "public" }, fetchImpl: probes(false) });
  await controller.onBeforeNavigate(navigation(QWANT_SEARCH));
  assert.deepEqual(browser.calls.tabs, []);
  assert.deepEqual(browser.calls.rules, []);
  assert.equal(browser.data[STATE_KEY].reachable, false);
});

test("no upgrade probe when the rules already point to the private engine", async () => {
  const { browser, controller } = setup({ state: { activeTarget: "private" } });
  await controller.onBeforeNavigate(navigation(QWANT_SEARCH));
  assert.deepEqual(browser.calls.tabs, []);
});

// Forced modes, frames and unrelated navigations.

test("force-private never falls back and never probes", async () => {
  const { browser, controller } = setup({ config: { mode: "force-private" } });
  await controller.onBeforeNavigate(navigation(PRIVATE_SEARCH));
  await controller.onErrorOccurred(navigation(PRIVATE_SEARCH, { error: "net::ERR_TIMED_OUT" }));
  assert.deepEqual(browser.calls.tabs, []);
});

test("force-public never upgrades and never probes", async () => {
  const { browser, controller } = setup({ config: { mode: "force-public" }, state: { activeTarget: "public" } });
  await controller.onBeforeNavigate(navigation(QWANT_SEARCH));
  assert.deepEqual(browser.calls.tabs, []);
});

test("sub-frames and unrelated pages are ignored", async () => {
  const { browser, controller } = setup();
  assert.equal(controller.onBeforeNavigate(navigation(PRIVATE_SEARCH, { frameId: 3 })), undefined);
  await controller.onBeforeNavigate(navigation("https://fr.wikipedia.org/wiki/Chat"));
  await controller.onErrorOccurred(navigation("https://example.com/", { error: "net::ERR_FAILED" }));
  assert.deepEqual(browser.calls.tabs, []);
});

// Lifecycle, configuration and popup messages.

test("install arms the alarm and applies the rules even when the target is unchanged", async () => {
  const { browser, controller } = setup({ fetchImpl: probes(true) });
  await controller.onInstalled();
  assert.deepEqual(browser.calls.alarms, [["create", ALARM_NAME, { periodInMinutes: 1 }]]);
  assert.equal(rulesTarget(browser), "private");
});

test("a configuration change re-arms the alarm and re-applies the rules", async () => {
  const { browser, controller } = setup({ fetchImpl: probes(true) });
  await controller.onStorageChanged({ [CONFIG_KEY]: {} }, "local");
  assert.deepEqual(browser.calls.alarms.map(([action]) => action), ["clear", "create"]);
  assert.equal(browser.calls.rules.length, 1);
  assert.equal(controller.onStorageChanged({ [STATE_KEY]: {} }, "local"), undefined);
  assert.equal(controller.onStorageChanged({ [CONFIG_KEY]: {} }, "sync"), undefined);
});

test("setMode applies the new mode and returns the fresh state", async () => {
  const { browser, controller } = setup({ fetchImpl: probes(true) });
  const response = await controller.handleMessage({ type: "setMode", mode: "force-public" });
  assert.equal(browser.data[CONFIG_KEY].mode, "force-public");
  assert.equal(response.state.activeTarget, "public");
  assert.equal(rulesTarget(browser), "public");
});

test("setMode with an invalid mode is refused and keeps the configuration", async () => {
  const custom = { privateEngine: { url: "https://searx.example" } };
  const { browser, controller } = setup({ config: custom });
  const response = await controller.handleMessage({ type: "setMode", mode: "bogus" });
  assert.match(response.error, /mode:invalid/);
  assert.equal(browser.data[CONFIG_KEY].privateEngine.url, "https://searx.example");
});

test("getStatus and unknown messages", async () => {
  const { controller } = setup();
  const status = await controller.handleMessage({ type: "getStatus" });
  assert.equal(status.config.publicEngineId, "qwant");
  assert.equal(status.state.activeTarget, "private");
  assert.deepEqual(await controller.handleMessage({ type: "nope" }), { error: "unknown message" });
});

test("concurrent events are serialized: one refresh finishes before the next starts", async () => {
  const events = [];
  const slowFetch = (url, { signal }) => new Promise((resolve) => {
    events.push("probe-start");
    setTimeout(() => { events.push("probe-end"); resolve({}); }, 20);
    signal.addEventListener("abort", () => resolve({}));
  });
  const { controller } = setup({ fetchImpl: slowFetch });
  await Promise.all([controller.onAlarm({ name: ALARM_NAME }), controller.handleMessage({ type: "probeNow" })]);
  assert.deepEqual(events, ["probe-start", "probe-end", "probe-start", "probe-end"]);
});

test("register wires every listener, and messages keep the channel open", async () => {
  const { browser, controller } = setup();
  controller.register();
  assert.deepEqual(Object.keys(browser.listeners).sort(),
    ["alarm", "beforeNavigate", "errorOccurred", "installed", "message", "startup", "storageChanged"]);
  const reply = await new Promise((resolve) => {
    assert.equal(browser.listeners.message({ type: "getStatus" }, {}, resolve), true);
  });
  assert.equal(reply.state.activeTarget, "private");
});
