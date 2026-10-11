import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const manifest = JSON.parse(readFileSync(join(root, "webext", "src", "manifest.json"), "utf8"));
const project = readFileSync(join(root, "project.yml"), "utf8");

// The app and the extension are released together: one version number for both.
test("the manifest version matches MARKETING_VERSION in project.yml", () => {
  const marketing = /MARKETING_VERSION: "([^"]+)"/.exec(project)?.[1];
  assert.equal(manifest.version, marketing);
});
