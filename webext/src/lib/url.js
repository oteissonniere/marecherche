import { publicTemplate } from "./engines.js";

// Pure. Origin (scheme://host[:port]) of the private engine.
export function privateOrigin(config) {
  return new URL(config.privateEngine.url).origin;
}

// Splits "/search?q={q}" into { pathname: "/search", param: "q" }.
function parseSearchPath(config) {
  const base = new URL(config.privateEngine.url);
  const full = new URL(base.pathname.replace(/\/$/, "") + config.privateEngine.searchPath, base.origin);
  for (const [name, value] of full.searchParams) {
    if (value === "{q}") return { pathname: full.pathname, param: name };
  }
  return null;
}

// Pure. If `url` is a search on the private engine, returns the raw query string value
// (percent-encoded) or null.
export function extractPrivateQuery(config, url) {
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  if (parsed.origin !== privateOrigin(config)) return null;
  const search = parseSearchPath(config);
  if (!search || parsed.pathname !== search.pathname) return null;
  const value = parsed.searchParams.get(search.param);
  if (value === null) return null;
  // searchParams decodes; re-encode to stay consistent with DNR captures.
  return encodeURIComponent(value);
}

// Pure. Builds the public target URL for a raw (encoded) query.
export function buildPublicUrl(config, encodedQuery) {
  return publicTemplate(config).replace("{q}", encodedQuery);
}
