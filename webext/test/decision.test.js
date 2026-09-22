import { test } from "node:test";
import assert from "node:assert/strict";
import { decideTarget, isFresh } from "../src/lib/decision.js";

test("auto follows reachability", () => {
  assert.equal(decideTarget({ mode: "auto" }, true), "private");
  assert.equal(decideTarget({ mode: "auto" }, false), "public");
  assert.equal(decideTarget({ mode: "auto" }, null), "public");
});

test("forced modes override reachability", () => {
  assert.equal(decideTarget({ mode: "force-private" }, false), "private");
  assert.equal(decideTarget({ mode: "force-public" }, true), "public");
});

test("isFresh boundaries", () => {
  assert.equal(isFresh({ reachable: true, checkedAt: 1000 }, 1500, 500), true);
  assert.equal(isFresh({ reachable: true, checkedAt: 1000 }, 1501, 500), false);
  assert.equal(isFresh({ reachable: false, checkedAt: 1000 }, 1000, 500), true);
  assert.equal(isFresh({ reachable: null, checkedAt: 1000 }, 1000, 500), false);
});
