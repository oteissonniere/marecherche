#!/usr/bin/env bash
# Feeds every regexFilter the extension can generate to WebKit's content-extension
# compiler (macOS only). Catches constructs Safari rejects, such as alternation.
set -euo pipefail
cd "$(dirname "$0")/.."

node --input-type=module -e '
import { INTERCEPTED_ENGINES } from "./webext/src/lib/engines.js";
import { regexFiltersFor } from "./webext/src/lib/rules.js";
for (const engine of Object.values(INTERCEPTED_ENGINES))
  for (const onlyAddressBar of [true, false])
    for (const { regexFilter } of regexFiltersFor(engine, onlyAddressBar)) console.log(regexFilter);
' | swift scripts/check_regexes.swift
