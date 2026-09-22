// Pure. Returns "private" | "public".
export function decideTarget(config, reachable) {
  if (config.mode === "force-private") return "private";
  if (config.mode === "force-public") return "public";
  return reachable === true ? "private" : "public";
}

// Pure. True if the cached state is fresh enough to be trusted without a new probe.
export function isFresh(state, nowMs, maxAgeMs) {
  return state.reachable !== null && nowMs - state.checkedAt <= maxAgeMs;
}
