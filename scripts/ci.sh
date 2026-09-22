#!/usr/bin/env bash
# Runs the JS unit tests, then builds both platforms without code signing.
set -euo pipefail
cd "$(dirname "$0")/.."

(cd webext && npm test)
./scripts/check_regexes.sh

xcodegen generate

xcodebuild -project MaRecherche.xcodeproj -scheme "MaRecherche (macOS)" \
  -configuration Debug -destination "generic/platform=macOS" \
  CODE_SIGNING_ALLOWED=NO build

xcodebuild -project MaRecherche.xcodeproj -scheme "MaRecherche (iOS)" \
  -configuration Debug -destination "generic/platform=iOS Simulator" \
  CODE_SIGNING_ALLOWED=NO build
