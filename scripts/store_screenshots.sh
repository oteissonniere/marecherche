#!/bin/bash
# Composes the App Store screenshots from the raw captures in docs/app-store/screenshots/raw
# (named <device>-<lang>-<scene>.png) into docs/app-store/screenshots/<device>/<lang>-<n>.png.
# Devices whose raw captures are missing are skipped.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SHOTS="$ROOT/docs/app-store/screenshots"
BIN="$(mktemp -d)/compose"
trap 'rm -rf "$(dirname "$BIN")"' EXIT
swiftc -O "$ROOT/scripts/compose_screenshot.swift" -o "$BIN"

# Output size per device (App Store Connect: iPhone 6.9", iPad 13", Mac 16:10).
size() {
  case "$1" in
    iphone) echo "1320 2868" ;;
    ipad) echo "2064 2752" ;;
    mac) echo "2880 1800" ;;
  esac
}

# Scene order and captions.
SCENES=(popup-private popup-public results settings app)
caption() {
  case "$1-$2" in
    fr-popup-private) echo "Vos recherches, sur votre moteur privé" ;;
    fr-popup-public) echo "Hors de portée ? Bascule automatique" ;;
    fr-results) echo "Directement depuis la barre d'adresse" ;;
    fr-settings) echo "Votre instance, votre moteur de secours" ;;
    fr-app) echo "Prête en quatre étapes" ;;
    en-popup-private) echo "Your searches, on your private engine" ;;
    en-popup-public) echo "Out of reach? It switches by itself" ;;
    en-results) echo "Straight from Safari's address bar" ;;
    en-settings) echo "Your instance, your fallback engine" ;;
    en-app) echo "Ready in four steps" ;;
  esac
}

for device in iphone ipad mac; do
  read -r width height <<< "$(size "$device")"
  for lang in en fr; do
    n=0
    for scene in "${SCENES[@]}"; do
      raw="$SHOTS/raw/$device-$lang-$scene.png"
      [[ -f "$raw" ]] || continue
      n=$((n + 1))
      mkdir -p "$SHOTS/$device"
      "$BIN" "$raw" "$SHOTS/$device/$lang-$n.png" "$width" "$height" "$(caption "$lang" "$scene")"
      echo "$device/$lang-$n.png"
    done
  done
done
