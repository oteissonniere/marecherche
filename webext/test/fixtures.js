import { normalizeConfig } from "../src/lib/config.js";

// The default config has no private engine; most tests need one.
export const PRIVATE_URL = "http://192.168.1.10:8080";

export function configured(overrides = {}) {
  return normalizeConfig({
    ...overrides,
    privateEngine: { url: PRIVATE_URL, ...overrides.privateEngine }
  });
}
