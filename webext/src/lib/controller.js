import { CONFIG_KEY, isPrivateConfigured, loadConfig, saveConfig, loadState, saveState, validateConfig } from "./config.js";
import { buildRules, allRuleIds } from "./rules.js";
import { probe } from "./probe.js";
import { decideTarget, needsConfirmation, confirmationTimeout } from "./decision.js";
import {
  extractPrivateQuery, extractPublicQuery, extractInterceptedQuery, buildPrivateUrl, buildPublicUrl
} from "./url.js";

export const ALARM_NAME = "probe";

// The background logic, with its dependencies injected so it can run under Node tests:
// `browser` is the WebExtension API, `fetchImpl` is used by the reachability probe.
// background.js creates one controller and calls register().
export function createController({ browser, fetchImpl = globalThis.fetch, now = Date.now, log = console }) {
  const storage = browser.storage.local;

  // Serializes every operation that touches the DNR rules or the runtime state, so that
  // concurrent triggers (alarm, config change, popup, navigation) never interleave.
  let queue = Promise.resolve();
  function enqueue(task) {
    const result = queue.then(task);
    queue = result.catch((error) => log.error("[marecherche]", error));
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
    // Nothing to probe until a private engine is configured: reachability stays unknown.
    let reachable = null;
    if (isPrivateConfigured(config)) {
      reachable = await probe(config, fetchImpl);
      if (needsConfirmation(config, activeTarget, reachable)) {
        reachable = await probe(config, fetchImpl, confirmationTimeout(config));
        if (reachable) log.log(`[marecherche] refresh(${reason}) transient probe failure ignored`);
      }
    }
    const target = decideTarget(config, reachable);
    const previous = await saveState(storage, { reachable, checkedAt: reachable === null ? 0 : now() });
    if (forceApply || previous.activeTarget !== target) await applyRules(config, target);
    log.log(`[marecherche] refresh(${reason}) reachable=${reachable} target=${target}`);
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
    if (await probe(config, fetchImpl)) return false;
    return !(await probe(config, fetchImpl, confirmationTimeout(config)));
  }

  // Redirect a tab that is heading to the unreachable private engine.
  // Rules are switched BEFORE navigating, otherwise a public engine that is also an
  // intercepted one would be redirected straight back to the private engine.
  async function fallBackToPublic(config, tabId, encodedQuery, reason) {
    log.warn(`[marecherche] falling back to public (${reason})`);
    await saveState(storage, { reachable: false, checkedAt: now() });
    await applyRules(config, "public");
    await browser.tabs.update(tabId, { url: buildPublicUrl(config, encodedQuery) });
  }

  // Upgrade: a search is heading to the public engine but the private engine may be back.
  // On iOS the background is suspended and alarms are unreliable, so the search itself is
  // the only dependable signal that the network may have changed (e.g. back on home Wi-Fi).
  async function tryUpgradeToPrivate(config, tabId, encodedQuery, timeoutMs, reason) {
    if (config.mode !== "auto" || !isPrivateConfigured(config)) return;
    const { activeTarget } = await loadState(storage);
    if (activeTarget !== "public") return;
    const reachable = await probe(config, fetchImpl, timeoutMs);
    await saveState(storage, { reachable, checkedAt: now() });
    if (!reachable) return;
    log.log(`[marecherche] private engine back, upgrading (${reason})`);
    await applyRules(config, "private");
    await browser.tabs.update(tabId, { url: buildPrivateUrl(config, encodedQuery) });
  }

  // Event handlers. Each returns the queued promise so tests can await it.

  function onInstalled() {
    return enqueue(async () => {
      await ensureAlarm();
      await refresh("installed", { forceApply: true });
    });
  }

  function onStartup() {
    return enqueue(async () => {
      await ensureAlarm();
      await refresh("startup", { forceApply: true });
    });
  }

  function onAlarm(alarm) {
    if (alarm.name !== ALARM_NAME) return undefined;
    return enqueue(() => refresh("alarm"));
  }

  // Config changes (settings page, popup mode switch): re-arm the alarm and re-apply the
  // rules even if the target is unchanged, because the templates may have changed.
  function onStorageChanged(changes, area) {
    if (area !== "local" || !changes[CONFIG_KEY]) return undefined;
    return enqueue(async () => {
      await browser.alarms.clear(ALARM_NAME);
      await ensureAlarm();
      await refresh("config", { forceApply: true });
    });
  }

  // Self-healing: a navigation to the private engine while it is unreachable, and upgrade
  // when a search heads to the public engine. Registered without a URL filter (the private
  // URL can change); the handler checks the URL.
  function onBeforeNavigate(details) {
    if (details.frameId !== 0) return undefined;
    return enqueue(async () => {
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
        await saveState(storage, { reachable: true, checkedAt: now() });
        return;
      }
      await fallBackToPublic(config, details.tabId, query, "onBeforeNavigate");
    });
  }

  // Second safety net: a navigation reported an error. Safari also reports errors for
  // navigations it merely cancelled (e.g. superseded by a redirect), so this never acts
  // without a confirmed failed probe.
  function onErrorOccurred(details) {
    if (details.frameId !== 0) return undefined;
    return enqueue(async () => {
      const config = await loadConfig(storage);
      const outbound = extractPublicQuery(config, details.url);
      if (outbound !== null) {
        // The public engine failed to load, typically while the network is switching.
        // The patient timeout gives a Wi-Fi that is still associating a chance to answer.
        log.log(`[marecherche] onErrorOccurred ${details.url}: ${details.error}`);
        await tryUpgradeToPrivate(config, details.tabId, outbound, confirmationTimeout(config), "public engine error");
        return;
      }
      if (config.mode === "force-private") return;
      const query = extractPrivateQuery(config, details.url);
      if (query === null) return;
      log.log(`[marecherche] onErrorOccurred ${details.url}: ${details.error}`);
      if (!(await confirmedUnreachable(config))) return;
      await fallBackToPublic(config, details.tabId, query, `onErrorOccurred: ${details.error}`);
    });
  }

  // Messages from the popup and the settings page. Resolves to the response object.
  async function handleMessage(message) {
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
  }

  function register() {
    browser.runtime.onInstalled.addListener(onInstalled);
    browser.runtime.onStartup.addListener(onStartup);
    browser.alarms.onAlarm.addListener(onAlarm);
    browser.storage.onChanged.addListener(onStorageChanged);
    browser.webNavigation.onBeforeNavigate.addListener(onBeforeNavigate);
    browser.webNavigation.onErrorOccurred?.addListener(onErrorOccurred);
    browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
      handleMessage(message).then(sendResponse, (error) => sendResponse({ error: String(error) }));
      return true; // keep the channel open for the async response
    });
  }

  return {
    register, onInstalled, onStartup, onAlarm, onStorageChanged,
    onBeforeNavigate, onErrorOccurred, handleMessage
  };
}
