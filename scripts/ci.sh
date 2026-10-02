#!/usr/bin/env bash
# Runs the JS unit tests, then builds both platforms without code signing.
set -euo pipefail
cd "$(dirname "$0")/.."

(cd webext && npm test)
./scripts/check_regexes.sh

xcodegen generate

# Build into a throwaway directory. An unsigned copy of the macOS app left on disk gets
# registered by macOS next to the installed one (same bundle identifier); Safari may then
# load the wrong copy and turn the extension off.
DERIVED="$(mktemp -d)"
trap 'rm -rf "$DERIVED"' EXIT

xcodebuild -project MaRecherche.xcodeproj -scheme "MaRecherche (macOS)" \
  -configuration Debug -destination "generic/platform=macOS" \
  -derivedDataPath "$DERIVED" CODE_SIGNING_ALLOWED=NO build

xcodebuild -project MaRecherche.xcodeproj -scheme "MaRecherche (iOS)" \
  -configuration Debug -destination "generic/platform=iOS Simulator" \
  -derivedDataPath "$DERIVED" CODE_SIGNING_ALLOWED=NO build
