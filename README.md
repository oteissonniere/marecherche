# Ma recherche

**Use the search engine you choose in Safari — including a private one running at home —
and never lose search when it is out of reach.**

Ma recherche is a Safari Web Extension for iPhone (iOS), iPad (iPadOS) and Mac (macOS).
It sends your address-bar searches to the engine of your choice. It is built for a
**self-hosted, private engine** such as a [SearXNG](https://github.com/searxng/searxng)
instance on your home network, and backs it with a **mainstream fallback** (Qwant,
DuckDuckGo, Brave, Startpage, Google, Bing, Ecosia, or any URL you provide).

## Why this one

Safari does not let you add a custom search engine, so extensions of this kind redirect
the searches Safari sends to its built-in engines. They send every search to **one fixed
engine**. That is fine for a public service, but a private instance is only reachable at
home or over a VPN: away from it, every search fails.

Ma recherche **checks** whether your private engine answers and **switches** by itself:

- **At home or on your VPN**, searches go to your private engine.
- **Away**, they go to your fallback engine, with no error page and no setting to change.
- **Back home**, the very first search goes to your private engine again.

The check is a plain request to the engine itself. The extension needs no Wi-Fi name,
no VPN status and no location permission: what matters is whether your engine answers.

> Status: working on Mac and iPhone, built from source; iPad verified on the simulator;
> not yet on the App Store.
> See [docs/reports/M0.md](docs/reports/M0.md) for what has been verified on devices.

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

Supported default engines are the five Safari offers in most regions: Google, Bing, Yahoo,
DuckDuckGo and Ecosia, on any language or country domain (google.co.uk,
uk.search.yahoo.com…). Region-specific engines that Safari offers in some countries
(for example Baidu in China or Yahoo! JAPAN) are not intercepted yet.

**Tip:** with Tailscale, *VPN On Demand* with your home Wi-Fi in "Except On" makes a
private instance reachable everywhere, and the fallback then only covers real outages.

## Setup

1. Build and run the app (see below), then follow its on-screen steps to enable the
   extension in Safari and allow it on all websites.
2. Open the extension popup → **Settings**, enter your instance URL
   (e.g. `http://192.168.1.158:8092`) and pick the public fallback engine.
3. The popup shows where searches currently go, lets you force a mode, and re-test.

Safari syncs the extension itself across your devices (same bundle identifier on iOS,
iPadOS and macOS), but **not its settings**: configure the instance URL on each device.

## Development

Requirements: Xcode 16+, [`xcodegen`](https://github.com/yonaskolb/XcodeGen), Node 20+.

```bash
cp Config/Local.xcconfig.example Config/Local.xcconfig   # then put your team id in it
xcodegen generate            # creates MaRecherche.xcodeproj (git-ignored)
open MaRecherche.xcodeproj   # run the iOS scheme (iPhone and iPad) or the macOS one
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
