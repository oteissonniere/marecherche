import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { INTERCEPTED_ENGINES, PUBLIC_ENGINES } from "../src/lib/engines.js";

const src = join(dirname(fileURLToPath(import.meta.url)), "..", "src");
const localesDir = join(src, "_locales");
const locale = (code) => JSON.parse(readFileSync(join(localesDir, code, "messages.json"), "utf8"));
// Every locale shipped in the extension; English is the reference.
const codes = readdirSync(localesDir).filter((name) => statSync(join(localesDir, name)).isDirectory());
const locales = codes.map((code) => [code, locale(code)]);
const en = locale("en");

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

test("English and French are shipped", () => {
  assert.ok(codes.includes("en") && codes.includes("fr"), codes.join(","));
});

test("every locale defines exactly the same keys as English", () => {
  for (const [code, messages] of locales) {
    assert.deepEqual(Object.keys(messages).sort(), Object.keys(en).sort(), code);
  }
});

// A translation that drops or renames $ENGINE$ would show a broken sentence.
test("every locale keeps the placeholders of English", () => {
  const tokens = (text) => [...text.matchAll(/\$[A-Za-z]+\$|\{q\}/g)].map((match) => match[0]).sort();
  for (const [code, messages] of locales) {
    for (const [key, entry] of Object.entries(en)) {
      assert.deepEqual(tokens(messages[key].message), tokens(entry.message), `${code}.${key}`);
      assert.deepEqual(messages[key].placeholders, entry.placeholders, `${code}.${key} placeholders`);
    }
  }
});

// App Store Connect rejects the upload otherwise ("Invalid messages file").
test("the extension description is at most 112 characters", () => {
  for (const [code, messages] of locales) {
    const { length } = messages.extension_description.message;
    assert.ok(length <= 112, `${code}: ${length} characters`);
  }
});

test("every message is a non-empty string", () => {
  for (const [code, messages] of locales) {
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
