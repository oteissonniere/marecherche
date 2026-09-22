// Returns true if the private engine answered anything at all within timeoutMs
// (`timeoutMs` overrides config.probeTimeoutMs). `fetchImpl` is injected for tests.
// GET rather than HEAD: /healthz is tiny, and some servers answer HEAD with 405.
// Uses no-cors so no CORS config is needed on SearXNG: a resolved promise (even an
// opaque response) means the host is reachable; a rejected promise means it is not.
export async function probe(config, fetchImpl = fetch, timeoutMs = config.probeTimeoutMs) {
  const url = config.privateEngine.url + config.privateEngine.probePath;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    await fetchImpl(url, {
      method: "GET", mode: "no-cors", cache: "no-store",
      credentials: "omit", redirect: "manual", signal: controller.signal
    });
    return true;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}
