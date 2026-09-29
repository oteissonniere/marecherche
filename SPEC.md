# Ma recherche — Implementation Specification

Safari Web Extension (iOS 17+ / macOS 14+) that redirects address-bar searches to a
private SearXNG instance when it is reachable, and to a user-chosen public engine
otherwise.

- Bundle id: `eu.teissonniere.marecherche` (app), `eu.teissonniere.marecherche.Extension` (extension)
- Display name: "Ma recherche"
- License: MIT — public repository on GitHub
- Distribution: App Store (iOS + macOS), paid developer account available

This document is the single source of truth for the coding agent. Read Section 0 first.

> **Implementation status.** M1 and M2 code is in place; see `docs/reports/M0.md` for what
> was verified and for the on-device `VERIFY` checklist. Where this spec was wrong, it has
> been corrected in place and the change is listed in that report. The code blocks in
> Sections 5 and 7.10 are illustrative: `project.yml` and `webext/src/background.js` are
> authoritative.

---

## 0. Rules for the coding agent

1. **Work milestone by milestone** (Section 12), in order. Do not start a milestone
   before the previous one's *Done when* criteria are met.
2. **Stop and report** at the end of each milestone. Write the report to
   `docs/reports/M<N>.md` (what was done, what was tested, what failed, open questions).
3. **Items marked `VERIFY`** are assumptions about Safari that must be tested empirically.
   When a `VERIFY` fails, do exactly what the attached `FALLBACK` says, record it in the
   milestone report, and continue. Do not invent a third option.
4. **No bundler, no npm dependencies, no TypeScript.** Plain JavaScript ES modules. The only
   `npm` script is `node --test`.
5. **Use only the WebExtension APIs listed in Section 7.9.** If you believe another API is
   needed, stop and write the question in the milestone report instead of using it.
6. **All code, comments, commit messages, docs: English.** User-facing strings go through
   `_locales` (English + French).
7. **Tests must pass** (`npm test` in `webext/`) before a milestone is declared done.
8. **Commits**: conventional commits (`feat:`, `fix:`, `test:`, `docs:`, `chore:`), one
   logical change per commit. Never commit signing identities, provisioning profiles or
   `.DS_Store`.
9. **Never regenerate or hand-edit `*.xcodeproj`.** Edit `project.yml` and run
   `xcodegen generate`. The `.xcodeproj` is git-ignored.
10. **When the spec and reality disagree** (an API does not exist, a manifest key is
    rejected), reality wins: record it, apply the named fallback, keep going.
11. **Shell discipline.** Create directories with **one path per `mkdir -p` command**
    (`mkdir -p webext/src/lib`, then `mkdir -p webext/src/popup`, …). Never pass several
    paths to one `mkdir`. Prefer creating a file directly (the tool creates parent
    directories) over creating directories first.
12. **Forbidden commands.** Never run `rm -rf`, `git init`, `git reset --hard`,
    `git checkout -- <path>`, `git clean`, `git push --force`, or delete `.git`. The
    repository is already initialised. If a reset or deletion seems necessary, stop and
    write why in the milestone report.
13. **The file system is case-insensitive** (APFS default). `Extension/` (Swift) and
    `webext/` (JavaScript) are deliberately named so they cannot collide. Never create a
    directory whose name differs from an existing one only by case.

---

## 1. Goals and non-goals

### 1.1 Goals

- G1. When the user searches from the Safari address bar (iOS or macOS), the request is
  redirected to the private SearXNG instance **before any request reaches the original
  engine** (Google, Bing, DuckDuckGo, Yahoo, Ecosia).
- G2. If the private instance is not reachable (user away from home, VPN down), the search
  goes to a user-chosen public engine instead (default: Qwant).
- G3. Decision is automatic and self-healing: a wrong decision costs at most ~1 second and
  never leaves the user on an error page.
- G4. All configuration lives in the extension (popup + settings page). The native app is
  only an onboarding shell.
- G5. Zero telemetry, zero network requests except the reachability probe and the search
  redirect itself.

### 1.2 Non-goals (v1)

- Replacing address-bar suggestions/autocomplete (technically impossible).
- Detecting Wi-Fi SSID or VPN state natively (reachability probe covers the need).
- Multiple private instances with priorities.
- Showing SearXNG results inside the popup.
- Syncing settings across devices.

---

## 2. Definitions

| Term | Meaning |
|---|---|
| **Private engine** | The user's SearXNG instance, e.g. `http://192.168.1.158:8092`. |
| **Public engine** | A mainstream engine from the catalog (Section 7.4) used as fallback. |
| **Intercepted engine** | One of Safari's built-in default engines whose search URLs we redirect. |
| **Target** | The engine a search is redirected to *right now*: private or public. |
| **Probe** | A short HTTP request to the private engine to check reachability. |
| **Address-bar signature** | A query parameter Safari adds when the search originates from its address bar (e.g. `client=safari` for Google). Used to avoid redirecting searches the user deliberately typed on the engine's own page. |
| **DNR** | `declarativeNetRequest`, the WebExtension API used for redirects. |

---

## 3. Repository layout

```
.
├── SPEC.md                         # this file
├── README.md                       # user-facing (M4)
├── LICENSE                         # MIT
├── .gitignore
├── project.yml                     # xcodegen project definition
├── scripts/
│   ├── make_icons.py               # generates placeholder PNG icons (stdlib only)
│   ├── ci.sh                       # runs JS tests + xcodebuild without signing
│   └── preview_ui.py               # serves popup/settings with a fake browser API (dev only)
├── docs/
│   ├── reports/                    # one report per milestone: M0.md, M1.md, ...
│   └── engine-signatures.md        # empirical table of address-bar signatures (M1)
├── App/                            # SwiftUI container app, shared by iOS and macOS
│   ├── MaRechercheApp.swift
│   ├── ContentView.swift
│   ├── Info-iOS.plist
│   ├── Info-macOS.plist
│   ├── MaRecherche-macOS.entitlements
│   ├── MaRecherche-iOS.entitlements
│   └── Assets.xcassets/            # AppIcon (placeholders from scripts/make_icons.py)
├── Extension/                      # Safari Web Extension target (native Swift side only)
│   ├── SafariWebExtensionHandler.swift
│   ├── Info-iOS.plist
│   ├── Info-macOS.plist
│   └── Extension-macOS.entitlements
├── webext/                         # the WebExtension itself (JS), testable with node
│   ├── package.json                # { "scripts": { "test": "node --test" } }, no deps
│   ├── src/                        # copied verbatim into the .appex as Resources
│   │   ├── manifest.json
│   │   ├── _locales/en/messages.json
│   │   ├── _locales/fr/messages.json
│   │   ├── icons/                  # icon-16/32/48/64/96/128/256/512.png
│   │   ├── background.js
│   │   ├── ui.css                  # tokens and controls shared by popup and settings
│   │   ├── lib/
│   │   │   ├── i18n.js             # t(key) and localizeDocument() for the HTML pages
│   │   │   ├── browser.js          # namespace shim: export const browser = globalThis.browser ?? globalThis.chrome
│   │   │   ├── engines.js          # catalogs (intercepted + public), pure
│   │   │   ├── rules.js            # DNR rule builders, pure
│   │   │   ├── decision.js         # decide(target) logic, pure
│   │   │   ├── url.js              # URL helpers (extract query, build target URL), pure
│   │   │   ├── config.js           # schema, defaults, validation, load/save
│   │   │   └── probe.js            # reachability probe (uses fetch)
│   │   ├── popup/
│   │   │   ├── popup.html
│   │   │   ├── popup.css
│   │   │   └── popup.js
│   │   └── settings/
│   │       ├── settings.html
│   │       ├── settings.css
│   │       └── settings.js
│   └── test/
│       ├── engines.test.js
│       ├── rules.test.js
│       ├── decision.test.js
│       ├── url.test.js
│       ├── config.test.js
│       ├── probe.test.js
│       └── locales.test.js         # en/fr key parity, every referenced key exists
└── Tests/
    └── AppTests/
        └── SmokeTests.swift        # XCTest: bundle id is as expected
```

`lib/*.js` files must be importable from Node without a browser: they must not touch
`browser.*` at module top level. Only `background.js`, `popup.js`, `settings.js` and
`probe.js` call browser APIs, and `probe.js` receives `fetch` as a parameter for testability.

---

## 4. Tooling and commands

Prerequisites on the dev machine: Xcode 16+, `xcodegen` (`brew install xcodegen`),
Node 20+ (for tests only; nothing is bundled).

```bash
# Generate the Xcode project (after any change to project.yml)
xcodegen generate

# Run JS unit tests
cd webext && npm test

# Build both platforms without signing (CI)
./scripts/ci.sh

# Open in Xcode for signing/run
open MaRecherche.xcodeproj
```

`scripts/ci.sh`:

```bash
#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
(cd webext && npm test)
xcodegen generate
xcodebuild -project MaRecherche.xcodeproj -scheme "MaRecherche (macOS)" \
  -configuration Debug CODE_SIGNING_ALLOWED=NO build
xcodebuild -project MaRecherche.xcodeproj -scheme "MaRecherche (iOS)" \
  -configuration Debug -sdk iphonesimulator CODE_SIGNING_ALLOWED=NO build
```

`.gitignore` (already present at the repository root):

```
# macOS
.DS_Store

# Xcode project is generated by xcodegen from project.yml — never commit it
*.xcodeproj
xcuserdata/
DerivedData/
build/

# JS (no dependencies expected, but keep it safe)
webext/node_modules/

# Signing material
*.mobileprovision
*.p12
```

---

## 5. Xcode project (`project.yml`)

Four targets: app + extension, for iOS and macOS. Sources are shared; only plists and
entitlements differ. The extension's web resources come from `webext/src`.

`targetTemplates`, `targets` and `schemes` are **top-level keys**, siblings of `settings`
— do not nest them.

```yaml
name: MaRecherche
options:
  bundleIdPrefix: eu.teissonniere
  deploymentTarget:
    iOS: "17.0"
    macOS: "14.0"
  xcodeVersion: "16.0"
  generateEmptyDirectories: true

settings:
  base:
    SWIFT_VERSION: "5.10"
    MARKETING_VERSION: "0.1.0"
    CURRENT_PROJECT_VERSION: "1"
    CODE_SIGN_STYLE: Automatic
    DEVELOPMENT_TEAM: ""          # set locally in Xcode; never commit a team id

targetTemplates:
  AppBase:
    type: application
    sources:
      - path: App
        excludes: ["Info-*.plist", "*.entitlements"]
    settings:
      base:
        PRODUCT_BUNDLE_IDENTIFIER: eu.teissonniere.marecherche
        PRODUCT_NAME: MaRecherche   # no space: it becomes the Swift module name; the
                                    # visible name is CFBundleDisplayName in the plist
  ExtensionBase:
    type: app-extension
    sources:
      - path: Extension
        excludes: ["Info-*.plist", "*.entitlements"]
      # One entry per top-level item of webext/src, so manifest.json lands at the root
      # of the .appex Resources. A NEW top-level item must be added here.
      - { path: webext/src/manifest.json, buildPhase: resources }
      - { path: webext/src/background.js, buildPhase: resources }
      - { path: webext/src/ui.css,        buildPhase: resources }
      - { path: webext/src/_locales, type: folder, buildPhase: resources }
      - { path: webext/src/icons,    type: folder, buildPhase: resources }
      - { path: webext/src/lib,      type: folder, buildPhase: resources }
      - { path: webext/src/popup,    type: folder, buildPhase: resources }
      - { path: webext/src/settings, type: folder, buildPhase: resources }
    settings:
      base:
        PRODUCT_BUNDLE_IDENTIFIER: eu.teissonniere.marecherche.Extension
        PRODUCT_NAME: MaRechercheExtension

targets:
  MaRecherche-iOS:
    templates: [AppBase]
    platform: iOS
    info:
      path: App/Info-iOS.plist
    entitlements:
      path: App/MaRecherche-iOS.entitlements
    dependencies:
      - target: Extension-iOS
        embed: true

  MaRecherche-macOS:
    templates: [AppBase]
    platform: macOS
    info:
      path: App/Info-macOS.plist
    entitlements:
      path: App/MaRecherche-macOS.entitlements
    settings:
      base:
        ENABLE_HARDENED_RUNTIME: YES
    dependencies:
      - target: Extension-macOS
        embed: true

  Extension-iOS:
    templates: [ExtensionBase]
    platform: iOS
    info:
      path: Extension/Info-iOS.plist

  Extension-macOS:
    templates: [ExtensionBase]
    platform: macOS
    info:
      path: Extension/Info-macOS.plist
    entitlements:
      path: Extension/Extension-macOS.entitlements
    settings:
      base:
        ENABLE_HARDENED_RUNTIME: YES

  AppTests-macOS:
    type: bundle.unit-test
    platform: macOS
    sources: [Tests/AppTests]
    dependencies:
      - target: MaRecherche-macOS

schemes:
  "MaRecherche (iOS)":
    build: { targets: { MaRecherche-iOS: all } }
    run: { config: Debug }
  "MaRecherche (macOS)":
    build: { targets: { MaRecherche-macOS: all } }
    run: { config: Debug }
    test: { targets: [AppTests-macOS] }
```

`V5.1` — **verified**: a single `type: folder` entry for `webext/src` nests everything
under `Resources/src/`, which Safari does not accept. Listing the top-level items (above)
produces a `.appex` whose `Resources/` is file-for-file identical to `webext/src`.

Info.plist files are generated by xcodegen from the `info.properties` of each target (see
`project.yml`); Section 5.1 lists the keys they must contain. The unit-test target sets
`TEST_HOST` explicitly because xcodegen derives it from the target name, not `PRODUCT_NAME`.

### 5.1 Info.plist contents

`App/Info-iOS.plist` and `App/Info-macOS.plist` (standard app plist) must include:

- `CFBundleDisplayName` = `Ma recherche`
- `NSLocalNetworkUsageDescription` = `Ma recherche checks whether your private search instance on the local network is reachable.` (iOS; harmless on macOS)
- macOS only: `LSApplicationCategoryType` = `public.app-category.utilities`

`Extension/Info-iOS.plist` and `Extension/Info-macOS.plist` must include:

```xml
<key>NSExtension</key>
<dict>
  <key>NSExtensionPointIdentifier</key>
  <string>com.apple.Safari.web-extension</string>
  <key>NSExtensionPrincipalClass</key>
  <string>$(PRODUCT_MODULE_NAME).SafariWebExtensionHandler</string>
</dict>
```

### 5.2 Entitlements

Entitlements are declared as `entitlements.properties` in `project.yml`; xcodegen
**generates** the `.entitlements` files on every `xcodegen generate` and overwrites any
hand edit (an empty `<dict/>` results otherwise, and macOS then refuses to register the
extension: pkd logs "plug-ins must be sandboxed").

- macOS app and macOS extension: `com.apple.security.app-sandbox` = true,
  `com.apple.security.network.client` = true.
- iOS app: empty dict.

---

## 6. Native code (Swift)

Keep it minimal. The native side has no business logic.

### 6.1 `App/MaRechercheApp.swift`

```swift
import SwiftUI

@main
struct MaRechercheApp: App {
    var body: some Scene {
        WindowGroup {
            ContentView()
        }
        #if os(macOS)
        .windowResizability(.contentSize)
        #endif
    }
}
```

### 6.2 `App/ContentView.swift`

A single screen with:

- App icon, title "Ma recherche", one-sentence description.
- Numbered onboarding steps, platform-specific:
  - **macOS**: 1) Open Safari settings → Extensions, 2) enable "Ma recherche",
    3) choose "Allow on every website" (needed to redirect the search engines),
    4) open the extension popup to set your private instance.
    A button "Open Safari Extensions settings" calling
    `SFSafariApplication.showPreferencesForExtension(withIdentifier: "eu.teissonniere.marecherche.Extension")`.
  - **iOS**: 1) Open Settings → Apps → Safari → Extensions, 2) enable "Ma recherche",
    3) set "All Websites" to Allow, 4) in Safari tap the extension icon to configure.
    A button "Open Settings" calling `UIApplication.shared.open(URL(string: UIApplication.openSettingsURLString)!)`.
- Footer: "Open source — MIT" with a link to the GitHub repository.

Use `#if os(macOS)` / `#if os(iOS)` blocks. No storage, no networking.

### 6.3 `Extension/SafariWebExtensionHandler.swift`

The minimal handler required by the extension point. It must exist even if unused.

```swift
import SafariServices
import os.log

final class SafariWebExtensionHandler: NSObject, NSExtensionRequestHandling {
    func beginRequest(with context: NSExtensionContext) {
        // No native messaging in v1. Reply with an empty response so the JS side
        // never hangs if it ever calls sendNativeMessage.
        let response = NSExtensionItem()
        response.userInfo = [SFExtensionMessageKey: ["ok": true]]
        context.completeRequest(returningItems: [response], completionHandler: nil)
    }
}
```

### 6.4 `Tests/AppTests/SmokeTests.swift`

One XCTest that asserts `Bundle.main.bundleIdentifier` of the host app equals
`eu.teissonniere.marecherche`. Purpose: keep a working test target in the project.

---

## 7. The WebExtension

### 7.1 `manifest.json`

```json
{
  "manifest_version": 3,
  "default_locale": "en",
  "name": "__MSG_extension_name__",
  "description": "__MSG_extension_description__",
  "version": "0.1.0",
  "icons": {
    "16": "icons/icon-16.png", "32": "icons/icon-32.png", "48": "icons/icon-48.png",
    "64": "icons/icon-64.png", "96": "icons/icon-96.png", "128": "icons/icon-128.png",
    "256": "icons/icon-256.png", "512": "icons/icon-512.png"
  },
  "background": {
    "scripts": ["background.js"],
    "type": "module",
    "persistent": false
  },
  "action": {
    "default_popup": "popup/popup.html",
    "default_title": "__MSG_extension_name__",
    "default_icon": { "16": "icons/icon-16.png", "32": "icons/icon-32.png" }
  },
  "options_ui": {
    "page": "settings/settings.html",
    "open_in_tab": true
  },
  "permissions": [
    "declarativeNetRequest",
    "storage",
    "alarms",
    "webNavigation",
    "tabs"
  ],
  "host_permissions": [
    "*://www.google.com/*",
    "*://www.bing.com/*",
    "*://duckduckgo.com/*",
    "*://search.yahoo.com/*",
    "*://*.search.yahoo.com/*",
    "*://www.ecosia.org/*"
  ]
}
```

`VERIFY V7.1`: Safari accepts `background.scripts` + `type: module` + `persistent: false`
and wakes the background on `alarms`, `webNavigation` and `runtime.onMessage` events on
**iOS**. `FALLBACK`: switch to `"background": { "service_worker": "background.js", "type": "module" }`.

`VERIFY V7.2`: Safari does **not** require a host permission for the reachability probe
when it uses `mode: "no-cors"` (Section 7.6). `FALLBACK`: add
`"optional_host_permissions": ["<all_urls>"]` and, when the user saves the private URL in
settings, call `browser.permissions.request({ origins: [privateOrigin + "/*"] })` from the
settings page click handler (must run inside a user gesture).

### 7.2 Localization

`_locales/en/messages.json` and `_locales/fr/messages.json`. Keys (all must exist in both):

```
extension_name, extension_description,
popup_status_private, popup_status_public, popup_status_unknown, popup_status_checking,
popup_mode_label, popup_mode_auto, popup_mode_private, popup_mode_public,
popup_test_button, popup_settings_link, popup_last_checked,
settings_title, settings_private_url, settings_private_url_help,
settings_public_engine, settings_public_custom_url, settings_public_custom_url_help,
settings_intercepted_engines, settings_only_address_bar, settings_only_address_bar_help,
settings_probe_timeout, settings_probe_interval, settings_save, settings_saved,
settings_error_invalid_url, settings_error_custom_url_placeholder,
engine_google, engine_bing, engine_duckduckgo, engine_yahoo, engine_ecosia,
engine_qwant, engine_brave, engine_startpage, engine_custom
```

In HTML pages, elements carry `data-i18n="key"`; `popup.js`/`settings.js` fill
`textContent` from `browser.i18n.getMessage(key)` on load.

### 7.3 Configuration (`lib/config.js`)

```js
export const CONFIG_KEY = "config";
export const STATE_KEY = "runtimeState";

export const DEFAULT_CONFIG = Object.freeze({
  schemaVersion: 1,
  privateEngine: {
    url: "http://192.168.1.158:8092",   // base URL, no trailing slash
    searchPath: "/search?q={q}",
    probePath: "/healthz"                 // SearXNG liveness endpoint
  },
  publicEngineId: "qwant",              // id from PUBLIC_ENGINES, or "custom"
  publicCustomUrl: "",                  // used only when publicEngineId === "custom"; must contain {q}
  interceptedEngineIds: ["google", "bing", "duckduckgo", "yahoo", "ecosia"],
  onlyAddressBar: true,
  mode: "auto",                         // "auto" | "force-private" | "force-public"
  probeTimeoutMs: 800,
  probeIntervalMin: 1
});

export const DEFAULT_STATE = Object.freeze({
  reachable: null,       // true | false | null (never probed)
  checkedAt: 0,          // epoch ms
  activeTarget: "public" // "private" | "public" — what the DNR rules currently point to
});

// Pure. Returns { ok: true, config } or { ok: false, errors: [string] }.
export function validateConfig(candidate) { ... }

// Pure. Merges a stored (possibly partial / older) object onto DEFAULT_CONFIG.
export function normalizeConfig(stored) { ... }

// Browser-bound helpers (take `storage` = browser.storage.local as parameter):
export async function loadConfig(storage) { ... }   // normalize + validate; on invalid, return defaults
export async function saveConfig(storage, config) { ... }
export async function loadState(storage) { ... }
export async function saveState(storage, patch) { ... }  // shallow-merge patch onto existing state
```

Validation rules (`validateConfig`):

- `privateEngine.url`: absolute `http:` or `https:` URL, no query, no hash; trailing `/` stripped.
- `privateEngine.searchPath`: starts with `/`, contains `{q}` exactly once.
- `privateEngine.probePath`: starts with `/`.
- `publicEngineId`: key of `PUBLIC_ENGINES` or `"custom"`.
- if `"custom"`: `publicCustomUrl` is absolute https URL containing `{q}` exactly once.
- `interceptedEngineIds`: non-empty array, each a key of `INTERCEPTED_ENGINES`, no duplicates.
- `mode` ∈ {auto, force-private, force-public}.
- `probeTimeoutMs` integer in [200, 5000]; `probeIntervalMin` integer in [1, 60].

### 7.4 Engine catalogs (`lib/engines.js`)

```js
// Safari's built-in engines we intercept.
// `signatures` = query params Safari adds for address-bar searches, per platform.
// PROVISIONAL: values below are best-effort; M1 replaces them with observed values
// (docs/engine-signatures.md). Keep the shape, fix the values.
export const INTERCEPTED_ENGINES = Object.freeze({
  google: {
    id: "google", nameKey: "engine_google",
    hostPattern: "www\\.google\\.[a-z.]+",  // regex fragment for the host (covers regional TLDs)
    path: "/search",
    queryParam: "q",
    signatures: ["client=safari"]           // any one matching is enough
  },
  bing: {
    id: "bing", nameKey: "engine_bing",
    hostPattern: "www\\.bing\\.com",
    path: "/search", queryParam: "q",
    signatures: ["form=APMCS1", "form=APIPA1", "form=APIPH1"]   // PROVISIONAL
  },
  duckduckgo: {
    id: "duckduckgo", nameKey: "engine_duckduckgo",
    hostPattern: "duckduckgo\\.com",
    path: "/", queryParam: "q",
    signatures: ["t=osx", "t=iphone", "t=ipad"]                  // PROVISIONAL
  },
  yahoo: {
    id: "yahoo", nameKey: "engine_yahoo",
    hostPattern: "(?:[a-z]+\\.)?search\\.yahoo\\.com",
    path: "/search", queryParam: "p",
    signatures: ["fr=aaplw", "fr=aapl"]                          // PROVISIONAL
  },
  ecosia: {
    id: "ecosia", nameKey: "engine_ecosia",
    hostPattern: "www\\.ecosia\\.org",
    path: "/search", queryParam: "q",
    signatures: ["tt=safari"]                                    // PROVISIONAL
  }
});

// Public fallback targets. `url` contains {q}; the captured query is inserted as-is
// (it is already percent-encoded by Safari).
export const PUBLIC_ENGINES = Object.freeze({
  qwant:      { id: "qwant",      nameKey: "engine_qwant",      url: "https://www.qwant.com/?q={q}",                 interceptedId: null },
  duckduckgo: { id: "duckduckgo", nameKey: "engine_duckduckgo", url: "https://duckduckgo.com/?q={q}",                interceptedId: "duckduckgo" },
  brave:      { id: "brave",      nameKey: "engine_brave",      url: "https://search.brave.com/search?q={q}",        interceptedId: null },
  startpage:  { id: "startpage",  nameKey: "engine_startpage",  url: "https://www.startpage.com/do/search?q={q}",    interceptedId: null },
  google:     { id: "google",     nameKey: "engine_google",     url: "https://www.google.com/search?q={q}",          interceptedId: "google" },
  bing:       { id: "bing",       nameKey: "engine_bing",       url: "https://www.bing.com/search?q={q}",            interceptedId: "bing" },
  ecosia:     { id: "ecosia",     nameKey: "engine_ecosia",     url: "https://www.ecosia.org/search?q={q}",          interceptedId: "ecosia" }
});

// Returns the {q}-template URL for the current public target.
export function publicTemplate(config) { ... }    // PUBLIC_ENGINES[id].url or config.publicCustomUrl

// Returns the {q}-template URL for the private target.
export function privateTemplate(config) { ... }   // config.privateEngine.url + searchPath

// Returns the intercepted engine id that the public target corresponds to, or null.
export function publicInterceptedId(config) { ... }
```

`interceptedId` is used to avoid redirect loops (Section 7.5, rule R4).

### 7.5 DNR rule builder (`lib/rules.js`)

Pure functions. No `browser.*` calls.

```js
// Rule id scheme: engineIndex * 10 + variant, where engineIndex is the position of the
// engine id in Object.keys(INTERCEPTED_ENGINES) starting at 1, and variant is
//   0 = no signature required,
//   1 + sigIndex*2     = query-before-signature for signature sigIndex,
//   2 + sigIndex*2     = signature-before-query for signature sigIndex.
// All ids of all possible rules are enumerable with allRuleIds() so that
// updateDynamicRules can remove them wholesale.
export function allRuleIds() { ... }

// Builds regexFilter strings for one engine. Never uses lookahead/lookbehind.
// Returns [{ id, regexFilter }].
export function regexFiltersFor(engine, onlyAddressBar) { ... }

// Returns the full array of DNR rules to install for the given config and target
// ("private" | "public"). Template URLs come from engines.js.
export function buildRules(config, target) { ... }
```

**Regex construction** (path is regex-escaped; `{qp}` = engine.queryParam, `{sig}` = one
signature, regex-escaped). These three patterns have been verified in Node against the
sample URLs of Section 9:

- Variant 0 (`onlyAddressBar === false`, or engine has no signatures):
  `^https?://{hostPattern}{path}\?(?:.*&)?{qp}=([^&#]*)`
- Variant "query before signature":
  `^https?://{hostPattern}{path}\?(?:.*&)?{qp}=([^&#]*)(?:&.*)?&{sig}`
- Variant "signature before query":
  `^https?://{hostPattern}{path}\?(?:.*&)?{sig}(?:&.*)?&{qp}=([^&#]*)`

For `path === "/"` (DuckDuckGo) the path fragment is `/` and the `\?` follows directly.

Each rule:

```js
{
  id, priority: 1,
  action: { type: "redirect", redirect: { regexSubstitution: template.replace("{q}", "\\1") } },
  condition: { regexFilter, resourceTypes: ["main_frame"] }
}
```

Rules of construction:

- R1. One rule set per intercepted engine in `config.interceptedEngineIds`.
- R2. If `onlyAddressBar` is true and the engine has at least one signature: for each
  signature, emit both orderings (2 rules per signature). Else: emit the single variant-0 rule.
- R3. `regexSubstitution` receives the template with `{q}` replaced by `\1`. The captured
  group is the raw, still-encoded query. `+` for spaces is preserved; SearXNG and all
  public engines decode `+` as space.
- R4. **Loop guard**: when `target === "public"` and `publicInterceptedId(config) === engine.id`,
  emit **no rule** for that engine (redirecting Google to Google is pointless and, with
  `onlyAddressBar === false`, would loop).
- R5. Redirect targets never contain an address-bar signature, so with `onlyAddressBar`
  true they are never re-matched.

`VERIFY V7.5a`: Safari accepts `action.redirect.regexSubstitution` (expected on
Safari 17+). `FALLBACK`: **content-script mode** — see Section 11.1.

`V7.5b` — **verified on device (macOS)**: the first version failed with
"`regexFilter` is not a supported regular expression". WebKit's content-extension compiler
(the same one behind `regexFilter`) reports "Disjunctions are not supported yet.": the
alternation `|` is rejected, everything else used above (quantified groups, `(?:`, negated
classes, `$`) compiles. `scripts/check_regexes.sh` compiles every generated regex with that
compiler; run it after any change to `rules.js` or `engines.js`.

### 7.6 Probe (`lib/probe.js`)

```js
// Returns true if the private engine answered anything at all within timeoutMs.
// `fetchImpl` is injected for tests. Uses no-cors so no CORS config is needed on SearXNG:
// a resolved promise (even an opaque response) means the host is reachable;
// a rejected promise (network error, abort) means it is not.
export async function probe(config, fetchImpl = fetch) {
  const url = config.privateEngine.url + config.privateEngine.probePath;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.probeTimeoutMs);
  try {
    await fetchImpl(url, { method: "HEAD", mode: "no-cors", cache: "no-store",
                           credentials: "omit", redirect: "manual", signal: controller.signal });
    return true;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}
```

`VERIFY V7.6`: from the background context on **iOS**, a `no-cors` HEAD to
`http://192.168.1.158:8092/` resolves when on the home Wi-Fi and rejects quickly when
not (Safari may show a one-time "Local Network" prompt — acceptable). `FALLBACK`: if HEAD
is rejected even when reachable, use `method: "GET"`. If the request never settles before
timeout when reachable, apply the V7.2 fallback (host permission).

### 7.7 Decision (`lib/decision.js`)

```js
// Pure. Returns "private" | "public".
export function decideTarget(config, reachable) {
  if (config.mode === "force-private") return "private";
  if (config.mode === "force-public")  return "public";
  return reachable === true ? "private" : "public";
}

// Pure. True if the cached state is fresh enough to be trusted without a new probe.
export function isFresh(state, nowMs, maxAgeMs) {
  return state.reachable !== null && nowMs - state.checkedAt <= maxAgeMs;
}
```

### 7.8 URL helpers (`lib/url.js`)

```js
// Pure. If `url` is a search on the private engine, returns the raw query string value
// (still percent-encoded) or null.
export function extractPrivateQuery(config, url) { ... }
//   Implementation: parse with new URL(); compare origin with privateEngine.url origin;
//   derive the query param name from searchPath ("/search?q={q}" -> "q"); read
//   url.searchParams — careful: searchParams decodes, so re-encode with
//   encodeURIComponent to return an encoded value consistent with DNR captures.

// Pure. Builds the public target URL for a raw (encoded) query.
export function buildPublicUrl(config, encodedQuery) { ... }   // publicTemplate(config).replace("{q}", encodedQuery)

// Pure. Origin (scheme://host[:port]) of the private engine.
export function privateOrigin(config) { ... }
```

### 7.9 Allowed WebExtension APIs

The agent may use **only** these (via the `browser` shim):

- `browser.storage.local.get/set`, `browser.storage.onChanged`
- `browser.declarativeNetRequest.updateDynamicRules`, `browser.declarativeNetRequest.getDynamicRules`
- `browser.alarms.create/clear`, `browser.alarms.onAlarm`
- `browser.webNavigation.onBeforeNavigate`, `browser.webNavigation.onErrorOccurred`
- `browser.tabs.update`, `browser.tabs.query`
- `browser.runtime.onInstalled`, `browser.runtime.onStartup`, `browser.runtime.onMessage`,
  `browser.runtime.sendMessage`, `browser.runtime.openOptionsPage`, `browser.runtime.getURL`
- `browser.i18n.getMessage`
- `browser.permissions.request` (only under V7.2 fallback)
- `fetch`, `AbortController`, `setTimeout`, `URL`

### 7.10 Background (`background.js`)

Two invariants the implementation must keep (the listing below predates them; the file
`webext/src/background.js` is authoritative):

- **Switch the rules before navigating.** In the self-heal path, call
  `applyRules(config, "public")` *before* `tabs.update(...)`. Otherwise, when the public
  engine is also an intercepted one and `onlyAddressBar` is off, the still-active
  "private" rules bounce the tab straight back to the unreachable instance.
- **Serialize.** Every handler that touches the DNR rules or the runtime state runs through
  a single promise queue (`enqueue`), so an alarm, a config change and a popup request
  never interleave. `setMode` validates the resulting config before saving it: an invalid
  stored config makes `loadConfig` fall back to full defaults.

Responsibilities, in this order of implementation:

```js
import { browser } from "./lib/browser.js";
import { loadConfig, saveConfig, loadState, saveState } from "./lib/config.js";
import { buildRules, allRuleIds } from "./lib/rules.js";
import { probe } from "./lib/probe.js";
import { decideTarget } from "./lib/decision.js";
import { extractPrivateQuery, buildPublicUrl } from "./lib/url.js";

const ALARM_NAME = "probe";

// 1. Apply rules for a target and persist activeTarget.
async function applyRules(config, target) {
  const rules = buildRules(config, target);
  await browser.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: allRuleIds(),
    addRules: rules
  });
  await saveState(browser.storage.local, { activeTarget: target });
}

// 2. Probe, decide, apply. Returns the new state.
async function refresh(reason) {
  const config = await loadConfig(browser.storage.local);
  const reachable = await probe(config);
  await saveState(browser.storage.local, { reachable, checkedAt: Date.now() });
  const target = decideTarget(config, reachable);
  const state = await loadState(browser.storage.local);
  if (state.activeTarget !== target) await applyRules(config, target);
  console.log(`[marecherche] refresh(${reason}) reachable=${reachable} target=${target}`);
  return { ...state, reachable, activeTarget: target };
}

// 3. Ensure the periodic alarm exists (idempotent).
async function ensureAlarm(config) {
  await browser.alarms.create(ALARM_NAME, { periodInMinutes: config.probeIntervalMin });
}

// 4. Lifecycle.
browser.runtime.onInstalled.addListener(async () => {
  const config = await loadConfig(browser.storage.local);
  await ensureAlarm(config);
  await refresh("installed");
});
browser.runtime.onStartup.addListener(async () => {
  const config = await loadConfig(browser.storage.local);
  await ensureAlarm(config);
  await refresh("startup");
});
browser.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === ALARM_NAME) refresh("alarm");
});

// 5. Config changes (from settings page) -> re-arm alarm, re-probe, re-apply.
browser.storage.onChanged.addListener(async (changes, area) => {
  if (area !== "local" || !changes.config) return;
  const config = await loadConfig(browser.storage.local);
  await browser.alarms.clear(ALARM_NAME);
  await ensureAlarm(config);
  // Force re-apply even if target unchanged, because templates may have changed:
  await saveState(browser.storage.local, { activeTarget: null });
  await refresh("config");
});

// 6. Self-healing: a navigation to the private engine while it is unreachable.
//    Registered WITHOUT a URL filter (config can change); the handler checks the origin.
browser.webNavigation.onBeforeNavigate.addListener(async (details) => {
  if (details.frameId !== 0) return;
  const config = await loadConfig(browser.storage.local);
  if (config.mode === "force-private") return;
  const q = extractPrivateQuery(config, details.url);
  if (q === null) return;
  const reachable = await probe(config);
  if (reachable) {
    await saveState(browser.storage.local, { reachable: true, checkedAt: Date.now() });
    return;
  }
  await saveState(browser.storage.local, { reachable: false, checkedAt: Date.now() });
  await browser.tabs.update(details.tabId, { url: buildPublicUrl(config, q) });
  await applyRules(config, "public");
});

// 7. Second safety net (optional; only if V7.10b passes).
browser.webNavigation.onErrorOccurred.addListener(async (details) => {
  if (details.frameId !== 0) return;
  const config = await loadConfig(browser.storage.local);
  const q = extractPrivateQuery(config, details.url);
  if (q === null || config.mode === "force-private") return;
  await browser.tabs.update(details.tabId, { url: buildPublicUrl(config, q) });
  await saveState(browser.storage.local, { reachable: false, checkedAt: Date.now() });
  await applyRules(config, "public");
});

// 8. Messages from popup/settings.
browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  (async () => {
    switch (message?.type) {
      case "getStatus": {
        const config = await loadConfig(browser.storage.local);
        const state = await loadState(browser.storage.local);
        sendResponse({ config, state });
        break;
      }
      case "probeNow": {
        const state = await refresh("manual");
        sendResponse({ state });
        break;
      }
      case "setMode": {
        const config = await loadConfig(browser.storage.local);
        await saveConfig(browser.storage.local, { ...config, mode: message.mode });
        // storage.onChanged will also trigger a refresh; respond after our own for immediate UI:
        const state = await refresh("mode");
        sendResponse({ state });
        break;
      }
      default:
        sendResponse({ error: "unknown message" });
    }
  })();
  return true;   // keep the channel open for the async response
});
```

`VERIFY V7.10a`: `webNavigation.onBeforeNavigate` fires on Safari iOS for a top-level
navigation produced by a DNR redirect, and wakes a non-persistent background.
`FALLBACK`: rely on the alarm only; document in README that a network change may take up
to ~90 s to be detected. Keep the listener code in place (harmless).

`VERIFY V7.10b`: `webNavigation.onErrorOccurred` fires on Safari when a navigation to
an unreachable LAN host fails. `FALLBACK`: remove listener 7.

### 7.11 Popup (`popup/`)

Layout (max width 320 px, works on iOS sheet and macOS popover):

```
[●] Private instance          <- LED: green = private, orange = public, grey = unknown
    Last checked 12 s ago
Mode:  ( ) Auto  ( ) Private  ( ) Public     <- radio group, immediate effect
[ Test now ]                  [ Settings ]
```

- On load: `sendMessage({type:"getStatus"})` → render.
- Mode change: `sendMessage({type:"setMode", mode})` → re-render with returned state.
- Test now: button disabled + "Checking…" while awaiting `probeNow`.
- Settings: `browser.runtime.openOptionsPage()`.
- LED colour and status text derive from `state.activeTarget` and `state.reachable`.
- Use `prefers-color-scheme` for dark mode; system font stack; no external assets.

### 7.12 Settings page (`settings/`)

Form fields (in this order):

1. Private instance URL (text, placeholder `http://192.168.1.158:8092`) + help text.
2. Search path (text, default `/search?q={q}`) — advanced, collapsed by default.
3. Probe path (text, default `/healthz`) — advanced, collapsed by default.
4. Public engine (select: Qwant, DuckDuckGo, Brave, Startpage, Google, Bing, Ecosia, Custom).
5. Custom public URL (text, shown only when "Custom", placeholder `https://example.com/search?q={q}`).
6. Intercepted engines (checkboxes: Google, Bing, DuckDuckGo, Yahoo, Ecosia).
7. Only redirect address-bar searches (checkbox, default on) + help text explaining the
   trade-off (on: searches typed directly on google.com are left alone; off: every search
   on those engines is redirected).
8. Probe timeout in ms (number, 200–5000) — advanced.
9. Probe interval in minutes (number, 1–60) — advanced.
10. **Save** button. On click: build config object → `validateConfig` → on error show
    messages next to fields; on success `saveConfig` and show "Saved" for 2 s.

Under V7.2 fallback: before `saveConfig`, call
`browser.permissions.request({origins: [privateOrigin + "/*"]})` and abort save with a
message if denied.

---

## 8. Address-bar signatures — empirical procedure (M1)

For each of the five engines, on **macOS Safari** and **iOS Safari**, with the extension
**disabled**:

1. Settings → Search → set the engine as default.
2. Type `hello world` in the address bar, press Enter.
3. Copy the full URL of the resulting page.
4. Record it in `docs/engine-signatures.md` as a table: engine, platform, full URL, query
   param name, identified signature param.
5. Update `INTERCEPTED_ENGINES[*].signatures` and `queryParam` accordingly.
6. Repeat step 2 by typing the same search **on the engine's own homepage** and confirm
   the signature param is absent (otherwise it is not a valid signature — pick another).

If an engine adds no distinguishing parameter at all, set its `signatures` to `[]` and
document that `onlyAddressBar` cannot be honoured for it (rules.js then emits the
variant-0 rule for that engine regardless of `onlyAddressBar`).

---

## 9. Tests (`webext/test/`, `node --test`)

Each test file imports only from `../src/lib/`. Minimum cases:

**engines.test.js**
- every INTERCEPTED_ENGINES entry has id, hostPattern, path, queryParam, signatures (array).
- every PUBLIC_ENGINES entry url contains `{q}` exactly once.
- `publicTemplate` returns custom URL when id is "custom".

**rules.test.js**
- `allRuleIds()` has no duplicates and covers every id `buildRules` can emit for any config.
- For google with onlyAddressBar=true, the generated regexes (test with
  `new RegExp(regexFilter).exec(url)`) behave as follows:

  | URL | captured group |
  |---|---|
  | `https://www.google.com/search?q=hello+world&ie=UTF-8&client=safari` | `hello+world` |
  | `https://www.google.com/search?q=hello+world&client=safari&hl=fr` | `hello+world` |
  | `https://www.google.com/search?client=safari&q=hello+world` | `hello+world` |
  | `https://www.google.com/search?client=safari&hl=fr&q=caf%C3%A9&x=1` | `caf%C3%A9` |
  | `https://www.google.com/search?q=&client=safari` | `` (empty) |
  | `https://www.google.com/search?q=hello+world` | no match |
  | `https://www.google.com/maps?q=x&client=safari` | no match |
  | `https://www.google.com/search?hq=x&client=safari` | no match |

- With onlyAddressBar=false: one rule, matches without signature.
- Loop guard: target "public", publicEngineId "google" → no google rules; target
  "private" → google rules present.
- `regexSubstitution` for private target equals `http://192.168.1.158:8092/search?q=\1`.
- Yahoo uses `p=` as query param; DuckDuckGo regex matches `https://duckduckgo.com/?q=a+b&t=osx` with group `a+b`.
- No regex contains `(?=` or `(?<`.

**decision.test.js**
- auto + reachable true → private; auto + false/null → public; force-* overrides.
- `isFresh` boundaries.

**url.test.js**
- `extractPrivateQuery` returns encoded query for private search URL, null for other
  origins, null for private origin but non-search path.
- Round trip: query with accents `é` and spaces stays percent-encoded.
- `buildPublicUrl` substitutes `{q}` once.

**config.test.js**
- `normalizeConfig({})` equals defaults; unknown keys dropped; partial nested
  `privateEngine` merged.
- `validateConfig` rejects: URL with query, searchPath without `{q}`, empty
  interceptedEngineIds, duplicate ids, timeout 100, custom id without URL.
- Trailing slash on private URL is stripped.

---

## 10. Icons and assets

The app icon is `App/AppIcon.icon`, an Icon Composer file built from the SVG layers in
`design/icon/layers/`. Xcode renders it for iOS, iPadOS and macOS in every size and
appearance, and generates images for versions without Liquid Glass (macOS 14–15, iOS
17–18). There is no `AppIcon` asset catalog: per Apple's documentation, an Icon Composer
file replaces it.

`scripts/make_icons.py` renders the other icons with AppKit (`scripts/render_svg.swift`):
the in-app logo (`App/Assets.xcassets/Logo.imageset`) and the text-free Safari extension
icons (`webext/src/icons/`, 16 to 512 px). See `design/icon/README.md`.

---

## 11. Fallback designs

### 11.1 Content-script mode (if V7.5a fails)

Keep everything except `rules.js` consumers:

- Remove `declarativeNetRequest` from permissions.
- Add to manifest:
  ```json
  "content_scripts": [{
    "matches": ["*://www.google.com/search*", "*://www.bing.com/search*",
                "*://duckduckgo.com/*", "*://*.search.yahoo.com/search*",
                "*://www.ecosia.org/search*"],
    "js": ["content.js"], "run_at": "document_start"
  }]
  ```
- `content.js`: on load, `sendMessage({type:"resolveRedirect", url: location.href})`;
  background reuses `regexFiltersFor` from `rules.js` (same regexes, tested in Node) to
  decide whether the URL matches and computes the target with the current state; replies
  `{redirectTo}` or `{}`; content script does `location.replace(redirectTo)`.
- Document in README that this mode lets the original request reach the engine.

### 11.2 Alarm-only freshness (if V7.10a fails)

See V7.10a fallback. No structural change.

---

## 12. Milestones

### M0 — Spike (must be done first)

Goal: answer every `VERIFY` above with a real Safari on **both** a Mac and an iPhone,
using a throwaway extension. Do not build the real UI yet.

Tasks:

1. Create the repo skeleton: `project.yml`, `App/`, `Extension/`, `webext/src/` with
   a hard-coded `manifest.json` (Section 7.1) and a `background.js` that:
   - installs **one** dynamic DNR rule set: Google + `client=safari`, both orderings,
     redirecting to `http://192.168.1.158:8092/search?q=\1`;
   - runs the probe on install and every alarm tick, logging the result;
   - registers `webNavigation.onBeforeNavigate` and `onErrorOccurred` listeners that
     only `console.log(details.url)`.
2. `scripts/make_icons.py` and placeholder icons (the app will not build without an
   AppIcon on iOS).
3. Build and run on macOS: Safari → Develop → Allow Unsigned Extensions if needed →
   enable → allow on all sites → search from address bar with Google as default.
4. Build and run on iPhone (developer signing): Settings → Safari → Extensions → enable →
   allow. Test on home Wi-Fi, then on cellular.
5. Fill `docs/reports/M0.md` using this template:

```
# M0 spike report
| Check  | macOS | iOS | Notes / exact error text |
|--------|-------|-----|--------------------------|
| V5.1   |       |     |                          |
| V7.1   |       |     |                          |
| V7.2   |       |     |                          |
| V7.5a  |       |     |                          |
| V7.5b  |       |     |                          |
| V7.6   |       |     |                          |
| V7.10a |       |     |                          |
| V7.10b |       |     |                          |
Decisions taken (fallbacks applied): ...
Measured redirect latency (address bar Enter -> SearXNG page visible), 5 samples: ...
Local Network prompt on iOS: shown? when? text?
```

Done when: every row has a PASS/FAIL per platform and each FAIL has its fallback recorded.

### M1 — Core

1. `webext/src/lib/*.js` fully implemented per Section 7 with the fallbacks chosen
   in M0; `webext/test/*` per Section 9; `npm test` green.
2. `background.js` per 7.10.
3. Empirical signatures per Section 8 → `docs/engine-signatures.md` → catalog updated,
   tests updated to use the observed URLs.
4. `_locales` en + fr.
5. Manual check on both platforms: Google, Bing, DuckDuckGo, Yahoo, Ecosia as default
   engine, instance up and instance down (turn Wi-Fi off / unplug the instance).

Done when: all five engines redirect correctly in both states on both platforms; a
search typed on google.com's own page is **not** redirected; `npm test` green;
`docs/reports/M1.md` written.

### M2 — UI

1. Popup per 7.11; settings per 7.12; dark mode; FR/EN.
2. `ContentView.swift` onboarding per 6.2.
3. Changing the private URL in settings takes effect on the next search without restart.

Done when: a fresh install can be configured entirely from the UI on both platforms;
`docs/reports/M2.md` written with screenshots in `docs/reports/img/`.

### M3 — Hardening

Test matrix, each row on both platforms, result recorded in `docs/reports/M3.md`:

| # | Scenario | Expected |
|---|----------|----------|
| 1 | Instance up, auto | private |
| 2 | Instance down (host unreachable), auto | public, within ~1 s |
| 3 | Instance slow (>timeout, e.g. a delaying proxy) | public |
| 4 | Network changes while Safari open (Wi-Fi → cellular) | next search goes public within one probe cycle or immediately via self-heal |
| 5 | force-private while down | private (user asked for it; error page acceptable) |
| 6 | force-public while up | public |
| 7 | Query with accents, spaces, `?`, `&`, `#`, `+`, emoji | query arrives intact on the target |
| 8 | Empty query (`q=`) | redirected with empty query, no crash |
| 9 | Public engine = Google, instance up | google → private |
| 10 | Public engine = Google, instance down | google search **not** redirected, no loop |
| 11 | Search typed on the engine's own page (onlyAddressBar on) | not redirected |
| 12 | onlyAddressBar off, same | redirected |
| 13 | Two searches in two tabs in quick succession | both redirected |
| 14 | Safari restarted | rules still active (dynamic rules persist), state refreshed |
| 15 | Extension disabled then re-enabled | works, no stale rules |
| 16 | Invalid URL in settings | validation error, nothing saved |

Done when: all 16 rows pass or have a documented, accepted limitation.

### M4 — Release

1. Real icons (replace placeholders), App Store screenshots (iOS + macOS).
2. `PrivacyInfo.xcprivacy` in app and extension: no tracking, no collected data,
   `NSPrivacyAccessedAPITypes` empty unless Xcode reports a required-reason API.
3. `README.md`: what it does, how the redirect works, the "request never reaches Google"
   guarantee (or the content-script caveat), setup steps per platform, Tailscale tip
   (VPN On Demand "Except On" home SSID makes the instance reachable everywhere).
4. `LICENSE` (MIT), `CONTRIBUTING.md` (short), GitHub Actions workflow running
   `scripts/ci.sh` on `macos-latest`.
5. TestFlight build for iOS and macOS; App Store listing text (EN + FR).

Done when: CI green on GitHub, TestFlight build installable, README complete.

---

## 13. Risks register

| Id | Risk | Mitigation / fallback |
|----|------|-----------------------|
| K1 | `regexSubstitution` unsupported on the target Safari version | V7.5a → content-script mode (11.1) |
| K2 | Probe blocked on iOS (local network policy) | V7.6 / V7.2 fallbacks; last resort: alarm-only with longer tolerance |
| K3 | Background not woken by webNavigation on iOS | V7.10a → alarm-only freshness |
| K4 | Address-bar signatures change with a Safari update | Catalog is data; settings toggle `onlyAddressBar` off as user workaround; document in README |
| K5 | User sets public engine = intercepted engine and turns `onlyAddressBar` off | Loop guard R4 |
| K6 | Search suggestions still go to the default engine while typing | Out of scope; README explains how to disable suggestions in Safari settings |
| K7 | Redirect visible flash | Measured in M0; expected ~0 with DNR |

---

## 14. References

- Apple — Safari web extensions: https://developer.apple.com/documentation/safariservices/safari-web-extensions
- Apple — Optimizing your web extension for Safari (non-persistent background):
  https://developer.apple.com/documentation/safariservices/optimizing-your-web-extension-for-safari
- Apple — NSLocalNetworkUsageDescription:
  https://developer.apple.com/documentation/bundleresources/information-property-list/nslocalnetworkusagedescription
- MDN — declarativeNetRequest.Redirect:
  https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/declarativeNetRequest/Redirect
- Apple Developer Forums — regexSubstitution reported available from Safari 17:
  https://developer.apple.com/forums/thread/734207
- Apple Developer Forums — redirect keys accepted by Safari (`url`, `extensionPath`, `transform`):
  https://developer.apple.com/forums/thread/721258
- Tailscale — VPN On Demand: https://tailscale.com/docs/features/client/ios-vpn-on-demand
