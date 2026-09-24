import { browser } from "./lib/browser.js";
import { CONFIG_KEY, loadConfig, saveConfig, loadState, saveState, validateConfig } from "./lib/config.js";
import { buildRules, allRuleIds } from "./lib/rules.js";
import { probe } from "./lib/probe.js";
import { decideTarget, needsConfirmation, confirmationTimeout } from "./lib/decision.js";
import {
  extractPrivateQuery, extractPublicQuery, extractInterceptedQuery, buildPrivateUrl, buildPublicUrl
} from "./lib/url.js";

const ALARM_NAME = "probe";
const storage = browser.storage.local;

// Serializes every operation that touches the DNR rules or the runtime state, so that
// concurrent triggers (alarm, config change, popup) never interleave.
let queue = Promise.resolve();
function enqueue(task) {
  const result = queue.then(task);
  queue = result.catch((error) => console.error("[marecherche]", error));
  return result;
}

// Apply rules for a target and persist activeTarget.
async function applyRules(config, target) {
  await browser.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: allRuleIds(),
    addRules: buildRules(config, target)
  });
  await saveState(storage, { activeTarget: target });
}

// Probe, decide, apply. Returns the new state.
async function refresh(reason, { forceApply = false } = {}) {
  const config = await loadConfig(storage);
  const { activeTarget } = await loadState(storage);
  let reachable = await probe(config);
  if (needsConfirmation(config, activeTarget, reachable)) {
    reachable = await probe(config, fetch, confirmationTimeout(config));
    if (reachable) console.log(`[marecherche] refresh(${reason}) transient probe failure ignored`);
  }
  const target = decideTarget(config, reachable);
  const previous = await saveState(storage, { reachable, checkedAt: Date.now() });
  if (forceApply || previous.activeTarget !== target) await applyRules(config, target);
  console.log(`[marecherche] refresh(${reason}) reachable=${reachable} target=${target}`);
  return loadState(storage);
}

// Ensure the periodic alarm exists (idempotent: create replaces an alarm of the same name).
async function ensureAlarm() {
  const config = await loadConfig(storage);
  await browser.alarms.create(ALARM_NAME, { periodInMinutes: config.probeIntervalMin });
}

// A failed probe while Safari is busy loading the very same instance is not proof of
// unreachability: confirm with a second, more patient probe before bouncing the user.
async function confirmedUnreachable(config) {
  if (await probe(config)) return false;
  return !(await probe(config, fetch, confirmationTimeout(config)));
}

// Redirect a tab that is heading to the unreachable private engine.
// Rules are switched BEFORE navigating, otherwise a public engine that is also an
// intercepted one would be redirected straight back to the private engine.
async function fallBackToPublic(config, tabId, encodedQuery, reason) {
  console.warn(`[marecherche] falling back to public (${reason})`);
  await saveState(storage, { reachable: false, checkedAt: Date.now() });
  await applyRules(config, "public");
  await browser.tabs.update(tabId, { url: buildPublicUrl(config, encodedQuery) });
}

// Upgrade: a search is heading to the public engine but the private engine may be back.
// On iOS the background is suspended and alarms are unreliable, so the search itself is
// the only dependable signal that the network may have changed (e.g. back on home Wi-Fi).
async function tryUpgradeToPrivate(config, tabId, encodedQuery, timeoutMs, reason) {
  if (config.mode !== "auto") return;
  const { activeTarget } = await loadState(storage);
  if (activeTarget !== "public") return;
  const reachable = await probe(config, fetch, timeoutMs);
  await saveState(storage, { reachable, checkedAt: Date.now() });
  if (!reachable) return;
  console.log(`[marecherche] private engine back, upgrading (${reason})`);
  await applyRules(config, "private");
  await browser.tabs.update(tabId, { url: buildPrivateUrl(config, encodedQuery) });
}

// Lifecycle.
browser.runtime.onInstalled.addListener(() => enqueue(async () => {
  await ensureAlarm();
  await refresh("installed", { forceApply: true });
}));
browser.runtime.onStartup.addListener(() => enqueue(async () => {
  await ensureAlarm();
  await refresh("startup", { forceApply: true });
}));
browser.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === ALARM_NAME) enqueue(() => refresh("alarm"));
});

// Config changes (settings page, popup mode switch): re-arm the alarm and re-apply the
// rules even if the target is unchanged, because the templates may have changed.
browser.storage.onChanged.addListener((changes, area) => {
  if (area !== "local" || !changes[CONFIG_KEY]) return;
  enqueue(async () => {
    await browser.alarms.clear(ALARM_NAME);
    await ensureAlarm();
    await refresh("config", { forceApply: true });
  });
});

// Self-healing: a navigation to the private engine while it is unreachable.
// Registered without a URL filter (the private URL can change); the handler checks the origin.
browser.webNavigation.onBeforeNavigate.addListener((details) => {
  if (details.frameId !== 0) return;
  enqueue(async () => {
    const config = await loadConfig(storage);
    const outbound = extractPublicQuery(config, details.url) ?? extractInterceptedQuery(config, details.url);
    if (outbound !== null) {
      // Before (intercepted engine URL) or after (public engine URL) the DNR redirect.
      await tryUpgradeToPrivate(config, details.tabId, outbound, config.probeTimeoutMs, "onBeforeNavigate");
      return;
    }
    if (config.mode === "force-private") return;
    const query = extractPrivateQuery(config, details.url);
    if (query === null) return;
    if (!(await confirmedUnreachable(config))) {
      await saveState(storage, { reachable: true, checkedAt: Date.now() });
      return;
    }
    await fallBackToPublic(config, details.tabId, query, "onBeforeNavigate");
  });
});

// Second safety net: a navigation to the private engine reported an error. Safari also
// reports errors for navigations it merely cancelled (e.g. superseded by a redirect), so
// this never acts without a confirmed failed probe.
browser.webNavigation.onErrorOccurred?.addListener((details) => {
  if (details.frameId !== 0) return;
  enqueue(async () => {
    const config = await loadConfig(storage);
    const outbound = extractPublicQuery(config, details.url);
    if (outbound !== null) {
      // The public engine failed to load, typically while the network is switching.
      // The patient timeout gives a Wi-Fi that is still associating a chance to answer.
      console.log(`[marecherche] onErrorOccurred ${details.url}: ${details.error}`);
      await tryUpgradeToPrivate(config, details.tabId, outbound, confirmationTimeout(config), "public engine error");
      return;
    }
    if (config.mode === "force-private") return;
    const query = extractPrivateQuery(config, details.url);
    if (query === null) return;
    console.log(`[marecherche] onErrorOccurred ${details.url}: ${details.error}`);
    if (!(await confirmedUnreachable(config))) return;
    await fallBackToPublic(config, details.tabId, query, `onErrorOccurred: ${details.error}`);
  });
});

// Messages from popup/settings.
browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  (async () => {
    switch (message?.type) {
      case "getStatus":
        return { config: await loadConfig(storage), state: await loadState(storage) };
      case "probeNow":
        return { state: await enqueue(() => refresh("manual")) };
      case "setMode": {
        const candidate = validateConfig({ ...(await loadConfig(storage)), mode: message.mode });
        if (!candidate.ok) return { error: candidate.errors.join(",") };
        // storage.onChanged also re-applies the rules; refresh here so the popup gets fresh state.
        await saveConfig(storage, candidate.config);
        return { state: await enqueue(() => refresh("mode", { forceApply: true })) };
      }
      default:
        return { error: "unknown message" };
    }
  })().then(sendResponse, (error) => sendResponse({ error: String(error) }));
  return true; // keep the channel open for the async response
});
