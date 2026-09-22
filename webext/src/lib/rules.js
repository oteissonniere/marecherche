import { INTERCEPTED_ENGINES, publicTemplate, privateTemplate, publicInterceptedId } from "./engines.js";

// Rule id scheme: engineIndex * 10 + variant, where engineIndex is the position of the
// engine id in Object.keys(INTERCEPTED_ENGINES) starting at 1, and variant is
//   0              = no signature required,
//   1 + sigIndex*2 = query-before-signature for signature sigIndex,
//   2 + sigIndex*2 = signature-before-query for signature sigIndex.
// Up to 4 signatures per engine fit below the next engine's id range.
const MAX_SIGNATURES = 4;

function escapeRegex(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function engineIndex(engineId) {
  return Object.keys(INTERCEPTED_ENGINES).indexOf(engineId) + 1;
}

// Every id buildRules can ever emit, so updateDynamicRules can remove them wholesale.
export function allRuleIds() {
  const ids = [];
  for (const engineId of Object.keys(INTERCEPTED_ENGINES)) {
    const base = engineIndex(engineId) * 10;
    for (let variant = 0; variant <= MAX_SIGNATURES * 2; variant++) ids.push(base + variant);
  }
  return ids;
}

// Builds regexFilter strings for one engine. Safari's compiler rejects alternation (`|`)
// and lookaround, so the signature is not anchored at its end: a longer value sharing the
// same prefix (e.g. `client=safarix`) would also match, which is harmless.
// Returns [{ id, regexFilter }].
export function regexFiltersFor(engine, onlyAddressBar) {
  const base = engineIndex(engine.id) * 10;
  const prefix = `^https?://${engine.hostPattern}${escapeRegex(engine.path)}\\?(?:.*&)?`;
  const qp = escapeRegex(engine.queryParam);

  if (!onlyAddressBar || engine.signatures.length === 0) {
    return [{ id: base, regexFilter: `${prefix}${qp}=([^&#]*)` }];
  }

  const filters = [];
  engine.signatures.slice(0, MAX_SIGNATURES).forEach((signature, sigIndex) => {
    const sig = escapeRegex(signature);
    filters.push({
      id: base + 1 + sigIndex * 2,
      regexFilter: `${prefix}${qp}=([^&#]*)(?:&.*)?&${sig}`
    });
    filters.push({
      id: base + 2 + sigIndex * 2,
      regexFilter: `${prefix}${sig}(?:&.*)?&${qp}=([^&#]*)`
    });
  });
  return filters;
}

// Returns the full array of DNR rules to install for the given config and target
// ("private" | "public").
export function buildRules(config, target) {
  const template = target === "private" ? privateTemplate(config) : publicTemplate(config);
  const regexSubstitution = template.replace("{q}", "\\1");
  const skippedEngineId = target === "public" ? publicInterceptedId(config) : null;

  const rules = [];
  for (const engineId of config.interceptedEngineIds) {
    if (engineId === skippedEngineId) continue; // loop guard (R4)
    const engine = INTERCEPTED_ENGINES[engineId];
    if (!engine) continue;
    for (const { id, regexFilter } of regexFiltersFor(engine, config.onlyAddressBar)) {
      rules.push({
        id,
        priority: 1,
        action: { type: "redirect", redirect: { regexSubstitution } },
        condition: { regexFilter, resourceTypes: ["main_frame"] }
      });
    }
  }
  return rules;
}
