import { INTERCEPTED_ENGINES, publicTemplate, privateTemplate } from "./engines.js";
import { regexFiltersFor } from "./rules.js";

// Pure. Origin (scheme://host[:port]) of the private engine.
export function privateOrigin(config) {
  return new URL(config.privateEngine.url).origin;
}

// Splits a {q}-template such as "https://www.qwant.com/?q={q}" into
// { origin, pathname, param }, or null when no query parameter holds {q}.
function parseTemplate(template) {
  let url;
  try {
    url = new URL(template);
  } catch {
    return null;
  }
  for (const [name, value] of url.searchParams) {
    if (value === "{q}") return { origin: url.origin, pathname: url.pathname, param: name };
  }
  return null;
}

// If `url` is a search built from `template`, returns its query re-encoded with
// encodeURIComponent (URLSearchParams decodes), else null.
function extractFromTemplate(template, url) {
  const parts = parseTemplate(template);
  if (!parts) return null;
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  if (parsed.origin !== parts.origin || parsed.pathname !== parts.pathname) return null;
  const value = parsed.searchParams.get(parts.param);
  return value === null ? null : encodeURIComponent(value);
}

// Pure. If `url` is a search on the private engine, returns the encoded query or null.
export function extractPrivateQuery(config, url) {
  return extractFromTemplate(privateTemplate(config), url);
}

// Pure. If `url` is a search on the public engine, returns the encoded query or null.
export function extractPublicQuery(config, url) {
  return extractFromTemplate(publicTemplate(config), url);
}

// Pure. If `url` is a search on one of the intercepted engines that the redirect rules
// would match (address-bar signature included when onlyAddressBar is on), returns the
// raw query exactly as captured by the rule, or null.
export function extractInterceptedQuery(config, url) {
  for (const engineId of config.interceptedEngineIds) {
    const engine = INTERCEPTED_ENGINES[engineId];
    if (!engine) continue;
    for (const { regexFilter } of regexFiltersFor(engine, config.onlyAddressBar)) {
      const match = new RegExp(regexFilter).exec(url);
      if (match) return match[1];
    }
  }
  return null;
}

// Pure. Builds the private target URL for a raw (encoded) query.
export function buildPrivateUrl(config, encodedQuery) {
  return privateTemplate(config).replace("{q}", encodedQuery);
}

// Pure. Builds the public target URL for a raw (encoded) query.
export function buildPublicUrl(config, encodedQuery) {
  return publicTemplate(config).replace("{q}", encodedQuery);
}
