// Pure. Returns "private" | "public".
export function decideTarget(config, reachable) {
  if (config.mode === "force-private") return "private";
  if (config.mode === "force-public") return "public";
  return reachable === true ? "private" : "public";
}

// Pure. Hysteresis: leaving the private engine on a single failed probe makes the target
// flap while a network comes back up (Wi-Fi reassociation, DHCP). A failure only counts
// once a second, more patient probe confirms it. Moving back to private needs one success.
export function needsConfirmation(config, activeTarget, reachable) {
  return config.mode === "auto" && activeTarget === "private" && reachable === false;
}

// Pure. Timeout of the confirmation probe: three times the normal one, capped at 5 s.
export function confirmationTimeout(config) {
  return Math.min(config.probeTimeoutMs * 3, 5000);
}

// Pure. True if the cached state is fresh enough to be trusted without a new probe.
export function isFresh(state, nowMs, maxAgeMs) {
  return state.reachable !== null && nowMs - state.checkedAt <= maxAgeMs;
}
