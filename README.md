# Ma recherche

A Safari Web Extension for iOS and macOS that sends your address-bar searches to **your
own SearXNG instance** — and to a public engine of your choice whenever that instance is
not reachable (away from home, VPN down).

Safari does not let you add a custom search engine. Like other extensions of this kind,
Ma recherche works around that by redirecting the searches Safari sends to its built-in
engines (Google, Bing, DuckDuckGo, Yahoo, Ecosia).

> Status: early development. See [docs/reports/M0.md](docs/reports/M0.md) for what has
> been verified and what still needs testing on real devices.

## How it works

- Redirects are `declarativeNetRequest` rules: the request is rewritten **before it
  leaves Safari**, so the original engine never sees your query.
- A reachability probe (a `no-cors` `GET` request to `/healthz`, 800 ms timeout by default) decides
  between the private instance and the public fallback. It runs every minute and whenever
  the configuration changes. No SSID, VPN or location permission is involved: what matters
  is whether the instance answers.
- If a search heads to the private instance while it is unreachable, the extension
  confirms with a second probe and sends the tab to the public engine within a few seconds.
- The reverse also holds: when a search heads to the public engine, the extension checks
  whether the private instance is back (e.g. you just got home) and switches right away.
  A single failed probe never leaves the private instance, so the target does not flap
  while a network reconnects.
- By default only address-bar searches are redirected; a search you type on google.com
  itself is left alone.
- No telemetry. The only requests the extension makes are the probe and the redirect.

Search suggestions shown while you type still come from Safari's selected engine; an
extension cannot replace them. You can turn them off in Safari's Search settings.

**Tip:** with Tailscale, *VPN On Demand* with your home Wi-Fi in "Except On" makes a
private instance reachable everywhere, and the fallback then only covers real outages.

## Setup

1. Build and run the app (see below), then follow its on-screen steps to enable the
   extension in Safari and allow it on all websites.
2. Open the extension popup → **Settings**, enter your instance URL
   (e.g. `http://192.168.1.158:8092`) and pick the public fallback engine.
3. The popup shows where searches currently go, lets you force a mode, and re-test.

Safari syncs the extension itself across your devices (same bundle identifier on iOS and
macOS), but **not its settings**: configure the instance URL on each device.

## Development

Requirements: Xcode 16+, [`xcodegen`](https://github.com/yonaskolb/XcodeGen), Node 20+.

```bash
cp Config/Local.xcconfig.example Config/Local.xcconfig   # then put your team id in it
xcodegen generate            # creates MaRecherche.xcodeproj (git-ignored)
open MaRecherche.xcodeproj   # run the iOS or macOS scheme
```

```bash
cd webext && npm test        # unit tests, no dependencies
```

```bash
./scripts/ci.sh              # tests + unsigned builds for both platforms
```

```bash
python3 scripts/preview_ui.py   # popup/settings in any browser, with a fake browser API
```

Layout: `webext/` is the WebExtension (plain ES modules, no bundler), `Extension/` its
native Swift wrapper, `App/` the SwiftUI onboarding app. A new top-level entry in
`webext/src` must also be listed in `project.yml`. The full design is in
[SPEC.md](SPEC.md).

## License

[MIT](LICENSE)
