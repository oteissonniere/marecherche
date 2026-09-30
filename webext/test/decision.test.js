import { test } from "node:test";
import assert from "node:assert/strict";
import { decideTarget, isFresh, needsConfirmation, confirmationTimeout } from "../src/lib/decision.js";
import { normalizeConfig } from "../src/lib/config.js";
import { configured } from "./fixtures.js";

test("auto follows reachability", () => {
  assert.equal(decideTarget(configured({ mode: "auto" }), true), "private");
  assert.equal(decideTarget(configured({ mode: "auto" }), false), "public");
  assert.equal(decideTarget(configured({ mode: "auto" }), null), "public");
});

test("forced modes override reachability", () => {
  assert.equal(decideTarget(configured({ mode: "force-private" }), false), "private");
  assert.equal(decideTarget(configured({ mode: "force-public" }), true), "public");
});

test("without a private engine the target is always public", () => {
  assert.equal(decideTarget(normalizeConfig({}), true), "public");
  assert.equal(decideTarget(normalizeConfig({ mode: "force-private" }), true), "public");
});

test("only a failure while on the private target needs confirmation (hysteresis)", () => {
  const auto = { mode: "auto" };
  assert.equal(needsConfirmation(auto, "private", false), true);
  assert.equal(needsConfirmation(auto, "private", true), false);
  assert.equal(needsConfirmation(auto, "public", false), false);  // already public
  assert.equal(needsConfirmation(auto, "public", true), false);   // going up: one success is enough
  assert.equal(needsConfirmation({ mode: "force-private" }, "private", false), false);
  assert.equal(needsConfirmation({ mode: "force-public" }, "private", false), false);
});

test("confirmation timeout is three times the probe timeout, capped at 5 s", () => {
  assert.equal(confirmationTimeout({ probeTimeoutMs: 800 }), 2400);
  assert.equal(confirmationTimeout({ probeTimeoutMs: 4000 }), 5000);
});

test("isFresh boundaries", () => {
  assert.equal(isFresh({ reachable: true, checkedAt: 1000 }, 1500, 500), true);
  assert.equal(isFresh({ reachable: true, checkedAt: 1000 }, 1501, 500), false);
  assert.equal(isFresh({ reachable: false, checkedAt: 1000 }, 1000, 500), true);
  assert.equal(isFresh({ reachable: null, checkedAt: 1000 }, 1000, 500), false);
});
