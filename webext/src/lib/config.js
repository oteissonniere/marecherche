import { INTERCEPTED_ENGINES, PUBLIC_ENGINES, CUSTOM_ENGINE_ID } from "./engines.js";

export const CONFIG_KEY = "config";
export const STATE_KEY = "runtimeState";

export const DEFAULT_CONFIG = Object.freeze({
  schemaVersion: 1,
  privateEngine: Object.freeze({
    url: "http://192.168.1.158:8092", // base URL, no trailing slash
    searchPath: "/search?q={q}",
    probePath: "/healthz" // SearXNG liveness endpoint
  }),
  publicEngineId: "qwant", // id from PUBLIC_ENGINES, or "custom"
  publicCustomUrl: "", // used only when publicEngineId === "custom"; must contain {q}
  interceptedEngineIds: Object.freeze(["google", "bing", "duckduckgo", "yahoo", "ecosia"]),
  onlyAddressBar: true,
  mode: "auto", // "auto" | "force-private" | "force-public"
  probeTimeoutMs: 800,
  probeIntervalMin: 1
});

export const DEFAULT_STATE = Object.freeze({
  reachable: null, // true | false | null (never probed)
  checkedAt: 0, // epoch ms
  activeTarget: "public" // "private" | "public" — what the DNR rules currently point to
});

const MODES = ["auto", "force-private", "force-public"];

function countPlaceholder(text) {
  return text.split("{q}").length - 1;
}

function stripTrailingSlash(url) {
  return url.replace(/\/+$/, "");
}

// Pure. Merges a stored (possibly partial / older) object onto DEFAULT_CONFIG.
// Unknown keys are dropped.
export function normalizeConfig(stored) {
  const source = stored && typeof stored === "object" ? stored : {};
  const privateSource = source.privateEngine && typeof source.privateEngine === "object"
    ? source.privateEngine : {};
  const config = {
    schemaVersion: DEFAULT_CONFIG.schemaVersion,
    privateEngine: {
      url: privateSource.url ?? DEFAULT_CONFIG.privateEngine.url,
      searchPath: privateSource.searchPath ?? DEFAULT_CONFIG.privateEngine.searchPath,
      probePath: privateSource.probePath ?? DEFAULT_CONFIG.privateEngine.probePath
    },
    publicEngineId: source.publicEngineId ?? DEFAULT_CONFIG.publicEngineId,
    publicCustomUrl: source.publicCustomUrl ?? DEFAULT_CONFIG.publicCustomUrl,
    interceptedEngineIds: Array.isArray(source.interceptedEngineIds)
      ? [...source.interceptedEngineIds] : [...DEFAULT_CONFIG.interceptedEngineIds],
    onlyAddressBar: source.onlyAddressBar ?? DEFAULT_CONFIG.onlyAddressBar,
    mode: source.mode ?? DEFAULT_CONFIG.mode,
    probeTimeoutMs: source.probeTimeoutMs ?? DEFAULT_CONFIG.probeTimeoutMs,
    probeIntervalMin: source.probeIntervalMin ?? DEFAULT_CONFIG.probeIntervalMin
  };
  if (typeof config.privateEngine.url === "string") {
    config.privateEngine.url = stripTrailingSlash(config.privateEngine.url.trim());
  }
  return config;
}

// Pure. Returns { ok: true, config } or { ok: false, errors: [string] }.
// Error strings are stable identifiers the UI maps to localized messages.
export function validateConfig(candidate) {
  const config = normalizeConfig(candidate);
  const errors = [];

  let privateUrl = null;
  try {
    privateUrl = new URL(config.privateEngine.url);
  } catch {
    errors.push("privateEngine.url:invalid");
  }
  if (privateUrl) {
    if (privateUrl.protocol !== "http:" && privateUrl.protocol !== "https:") {
      errors.push("privateEngine.url:protocol");
    }
    if (privateUrl.search !== "" || privateUrl.hash !== "" || config.privateEngine.url.includes("?")
        || config.privateEngine.url.includes("#")) {
      errors.push("privateEngine.url:no-query");
    }
  }

  const { searchPath, probePath } = config.privateEngine;
  if (typeof searchPath !== "string" || !searchPath.startsWith("/") || countPlaceholder(searchPath) !== 1) {
    errors.push("privateEngine.searchPath:invalid");
  }
  if (typeof probePath !== "string" || !probePath.startsWith("/")) {
    errors.push("privateEngine.probePath:invalid");
  }

  if (config.publicEngineId === CUSTOM_ENGINE_ID) {
    let custom = null;
    try {
      custom = new URL(config.publicCustomUrl);
    } catch {
      errors.push("publicCustomUrl:invalid");
    }
    if (custom && (custom.protocol !== "https:" || countPlaceholder(config.publicCustomUrl) !== 1)) {
      errors.push("publicCustomUrl:invalid");
    }
  } else if (!Object.hasOwn(PUBLIC_ENGINES, config.publicEngineId)) {
    errors.push("publicEngineId:unknown");
  }

  const ids = config.interceptedEngineIds;
  if (ids.length === 0) errors.push("interceptedEngineIds:empty");
  if (new Set(ids).size !== ids.length) errors.push("interceptedEngineIds:duplicate");
  if (ids.some((id) => !Object.hasOwn(INTERCEPTED_ENGINES, id))) errors.push("interceptedEngineIds:unknown");

  if (typeof config.onlyAddressBar !== "boolean") errors.push("onlyAddressBar:invalid");
  if (!MODES.includes(config.mode)) errors.push("mode:invalid");

  if (!Number.isInteger(config.probeTimeoutMs) || config.probeTimeoutMs < 200 || config.probeTimeoutMs > 5000) {
    errors.push("probeTimeoutMs:range");
  }
  if (!Number.isInteger(config.probeIntervalMin) || config.probeIntervalMin < 1 || config.probeIntervalMin > 60) {
    errors.push("probeIntervalMin:range");
  }

  return errors.length === 0 ? { ok: true, config } : { ok: false, errors };
}

// Browser-bound helpers (take `storage` = browser.storage.local as parameter).

// Normalize + validate; on invalid stored data, fall back to defaults.
export async function loadConfig(storage) {
  const stored = await storage.get(CONFIG_KEY);
  const result = validateConfig(stored?.[CONFIG_KEY]);
  return result.ok ? result.config : normalizeConfig({});
}

export async function saveConfig(storage, config) {
  await storage.set({ [CONFIG_KEY]: normalizeConfig(config) });
}

export async function loadState(storage) {
  const stored = await storage.get(STATE_KEY);
  return { ...DEFAULT_STATE, ...(stored?.[STATE_KEY] ?? {}) };
}

// Shallow-merge patch onto existing state.
export async function saveState(storage, patch) {
  const state = { ...(await loadState(storage)), ...patch };
  await storage.set({ [STATE_KEY]: state });
  return state;
}
