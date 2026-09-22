import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { INTERCEPTED_ENGINES, PUBLIC_ENGINES } from "../src/lib/engines.js";

const src = join(dirname(fileURLToPath(import.meta.url)), "..", "src");
const locale = (code) => JSON.parse(readFileSync(join(src, "_locales", code, "messages.json"), "utf8"));
const en = locale("en");
const fr = locale("fr");

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

test("en and fr define exactly the same keys", () => {
  assert.deepEqual(Object.keys(fr).sort(), Object.keys(en).sort());
});

test("every message is a non-empty string", () => {
  for (const [code, messages] of [["en", en], ["fr", fr]]) {
    for (const [key, entry] of Object.entries(messages)) {
      assert.ok(typeof entry.message === "string" && entry.message.length > 0, `${code}.${key}`);
    }
  }
});

test("every key referenced from HTML, JS and the manifest exists", () => {
  const used = new Set();
  for (const file of walk(src)) {
    if (!/\.(html|js|json)$/.test(file) || file.includes("_locales")) continue;
    const text = readFileSync(file, "utf8");
    for (const match of text.matchAll(/data-i18n="([a-z_]+)"/g)) used.add(match[1]);
    for (const match of text.matchAll(/\bt\("([a-z_]+)"/g)) used.add(match[1]);
    for (const match of text.matchAll(/__MSG_([a-z_]+)__/g)) used.add(match[1]);
    for (const match of text.matchAll(/"(settings_error_[a-z_]+)"/g)) used.add(match[1]);
  }
  for (const engine of [...Object.values(INTERCEPTED_ENGINES), ...Object.values(PUBLIC_ENGINES)]) {
    used.add(engine.nameKey);
  }
  assert.ok(used.size > 20, "the scan found suspiciously few keys");
  for (const key of used) assert.ok(en[key], `missing locale key: ${key}`);
});
