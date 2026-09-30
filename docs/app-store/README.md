# App Store submission

Everything App Store Connect asks for, ready to paste, plus the release steps. The app is
a single **universal purchase** record with two platforms (iOS, which covers iPadOS, and
macOS): both apps use the bundle identifier `eu.teissonniere.marecherche`.

## 1. What is already in the project

| Requirement | Where |
|---|---|
| Privacy manifest (no tracking, no collected data, no required-reason API) | `App/PrivacyInfo.xcprivacy`, `Extension/PrivacyInfo.xcprivacy` |
| Export compliance (only system HTTPS, exempt) | `ITSAppUsesNonExemptEncryption = NO` in both app `Info.plist` (`project.yml`) |
| App sandbox (macOS) | `project.yml` entitlements of `MaRecherche-macOS` and `Extension-macOS` |
| English and French | native app: `App/Localizable.xcstrings`, `App/InfoPlist.xcstrings`; extension: `webext/src/_locales` |
| No private engine by default | `DEFAULT_CONFIG.privateEngine.url` is empty: nothing is probed until the user enters a URL |
| App icon | `App/AppIcon.icon` (Icon Composer) |
| Privacy policy | [`PRIVACY.md`](../../PRIVACY.md) |

## 2. One-time setup in App Store Connect

1. **Apps → + → New App**. Platforms: iOS and macOS. Name: see below. Primary language:
   English (U.S.). Bundle ID: `eu.teissonniere.marecherche`. SKU: `marecherche`.
   The bundle ID list only shows explicit App IDs registered in the developer account.
   Development builds do not create them (Xcode signs them with its wildcard `*` App ID,
   since the app uses no capability that needs an explicit one), so register both
   `eu.teissonniere.marecherche` and `eu.teissonniere.marecherche.Extension` first under
   Certificates, Identifiers & Profiles → Identifiers → + → App IDs → App, as explicit
   App IDs. The description must contain only letters, digits and spaces.
2. **App Information**
   - Category: Utilities (primary), Productivity (secondary).
   - Content rights: does not contain third-party content.
   - Age rating: answer "None" / "No" everywhere. The app shows no web content itself:
     search results open in Safari.
   - Add the French localization (App Information → language menu → French).
3. **Pricing and Availability**: free, all countries.
4. **App Privacy**
   - Privacy policy URL: `https://github.com/oteissonniere/marecherche/blob/main/PRIVACY.md`
   - Data collection: **No, we do not collect data from this app.** (Search queries go
     from Safari to the engine the user picked; nothing reaches the developer.)

## 3. Listing

Limits: name 30 characters, subtitle 30, promotional text 170, keywords 100 bytes
(accented letters count as two), description 4000.

URLs (both languages):

- Support URL: `https://github.com/oteissonniere/marecherche/issues`
- Marketing URL: `https://github.com/oteissonniere/marecherche`
- Copyright: `2026 Olivier Teissonniere`

### English (U.S.)

**Name**: `Ma recherche`
(if the name is taken: `Ma recherche: private search`)

**Subtitle**: `Private search, smart fallback`

**Promotional text**:

> Send Safari searches to your own SearXNG instance at home, and to a public engine of
> your choice when it is out of reach. Switches by itself, both ways.

**Keywords**: `searxng,search engine,private,privacy,self-hosted,homelab,redirect,fallback,metasearch,vpn,default`

**Description**:

> Use the search engine you choose in Safari — including a private one running at home —
> and never lose search when it is out of reach.
>
> Ma recherche sends the searches you type in Safari's address bar to the engine of your
> choice. It is built for a self-hosted, private engine such as a SearXNG instance on your
> home network, and backs it with a public fallback: Qwant, DuckDuckGo, Brave, Startpage,
> Google, Bing, Ecosia, or any address you provide.
>
> CHECKS AND SWITCHES BY ITSELF
> • At home or on your VPN, searches go to your private engine.
> • Away, they go to your fallback engine, with no error page and nothing to change.
> • Back home, the very first search goes to your private engine again.
>
> The check is a plain request to your engine. No Wi-Fi name, no VPN status, no location
> permission: what matters is whether your engine answers.
>
> PRIVATE BY DESIGN
> • The redirect happens inside Safari, before the request leaves your device: Safari's
>   default engine never sees your query.
> • No account, no analytics, no advertising. Nothing is ever sent to the developer.
> • Open source (MIT): read the code on GitHub.
>
> WORKS WITH SAFARI'S ENGINES
> Google, Bing, Yahoo, DuckDuckGo and Ecosia, on any country domain. Only address-bar
> searches are redirected: a search typed on a search engine's own page is left alone.
>
> The toolbar popup shows where your searches go, lets you force the private or the
> public engine, and re-checks your instance on demand.
>
> Requires iOS 17, iPadOS 17 or macOS 14 or later.

**What's New** (first release): `First release.`

### French

**Nom** : `Ma recherche`

**Sous-titre** : `Moteur privé, bascule auto`

**Texte promotionnel** :

> Envoyez les recherches de Safari vers votre instance SearXNG à la maison, et vers le
> moteur public de votre choix quand elle est hors de portée. Bascule automatique.

**Mots-clés** : `searxng,moteur de recherche,privé,vie privée,auto-hébergé,redirection,secours,métamoteur,vpn`

**Description** :

> Utilisez le moteur de recherche de votre choix dans Safari — y compris un moteur privé
> hébergé chez vous — sans jamais perdre la recherche quand il est hors de portée.
>
> Ma recherche envoie les recherches tapées dans la barre d'adresse de Safari vers le
> moteur de votre choix. Elle est pensée pour un moteur privé auto-hébergé, comme une
> instance SearXNG sur votre réseau domestique, avec un moteur public de secours : Qwant,
> DuckDuckGo, Brave, Startpage, Google, Bing, Ecosia, ou l'adresse de votre choix.
>
> VÉRIFIE ET BASCULE TOUTE SEULE
> • À la maison ou sur votre VPN, les recherches vont vers votre moteur privé.
> • En déplacement, elles vont vers votre moteur de secours, sans page d'erreur ni
>   réglage à changer.
> • De retour chez vous, la toute première recherche retourne vers votre moteur privé.
>
> La vérification est une simple requête vers votre moteur. Ni nom de Wi-Fi, ni état du
> VPN, ni localisation : seule compte la réponse de votre moteur.
>
> CONFIDENTIELLE PAR CONCEPTION
> • La redirection a lieu dans Safari, avant que la requête ne quitte votre appareil : le
>   moteur par défaut de Safari ne voit jamais votre recherche.
> • Ni compte, ni statistiques, ni publicité. Rien n'est jamais envoyé au développeur.
> • Open source (MIT) : le code est sur GitHub.
>
> COMPATIBLE AVEC LES MOTEURS DE SAFARI
> Google, Bing, Yahoo, DuckDuckGo et Ecosia, sur tous les domaines nationaux. Seules les
> recherches de la barre d'adresse sont redirigées : une recherche faite sur la page
> d'un moteur n'est pas modifiée.
>
> Le menu de l'extension indique où partent vos recherches, permet de forcer le moteur
> privé ou public, et revérifie votre instance à la demande.
>
> Nécessite iOS 17, iPadOS 17 ou macOS 14 ou ultérieur.

**Nouveautés** (première version) : `Première version.`

## 4. App Review notes

Paste into **App Review Information → Notes** (no sign-in required):

> Ma recherche is a Safari Web Extension. The app itself only explains how to enable it.
>
> To test:
> 1. Enable the extension: Settings → Apps → Safari → Extensions → Ma recherche (on Mac:
>    Safari → Settings → Extensions), and allow it on all websites.
> 2. Keep Google as Safari's search engine and search "hello" from the address bar: the
>    search opens on Qwant (the default fallback engine) instead of Google.
> 3. The main use case needs a private SearXNG instance, usually on the user's home
>    network. To try it, tap the extension icon in Safari → Settings, and enter the URL of
>    a public SearXNG instance, for example <INSTANCE_URL>. Search again from the address
>    bar: the search now opens on that instance. The popup shows "Private instance
>    reachable".
>
> Why "access to all websites": Safari only lets an extension redirect a request to a
> site it has host access to, and the private instance can be at any address the user
> enters. The extension has no content script and never reads page content. Local
> network access (iOS) is used to check a private instance on the home network.
> Source code: https://github.com/oteissonniere/marecherche

Before submitting, replace `<INSTANCE_URL>` with a public instance that answers (pick
one on <https://searx.space> and try it once in the extension).

## 5. Screenshots

Required sizes (one set per platform, 1 to 10 images, English and French):

| Platform | Size | Device used |
|---|---|---|
| iPhone 6.9" | 1320 × 2868 | iPhone 18 Pro Max simulator (native size) |
| iPad 13" | 2064 × 2752 | iPad Pro 13-inch (M5) simulator (native size) |
| Mac | 2880 × 1800 (16:10) | any Mac window capture, scaled |

Five scenes per set, in this order: the popup on the private instance, the popup on the
fallback engine (instance made unreachable by changing its port in the settings), the
SearXNG results, the settings page, the app's setup screen.

The images are not committed (about 25 MB): they live in `docs/app-store/screenshots/`,
which git ignores.

- Raw captures go in `docs/app-store/screenshots/raw/`, named
  `<iphone|ipad|mac>-<en|fr>-<popup-private|popup-public|results|settings|app>.png`.
  On a simulator: `xcrun simctl io <device> screenshot <file>`, after
  `xcrun simctl status_bar <device> override --time 9:41 ...`.
- `./scripts/store_screenshots.sh` composes them (icon gradient, caption, rounded
  screenshot, opaque PNG) into `docs/app-store/screenshots/<device>/<lang>-<n>.png`,
  ready to upload. Captions are in the script.

## 6. Each release

1. Bump the version in **both** places, they must match:
   `MARKETING_VERSION` in `project.yml` and `"version"` in `webext/src/manifest.json`.
   Bump `CURRENT_PROJECT_VERSION` for every upload (a build number can only be used
   once per version).
2. `xcodegen generate`, then `./scripts/ci.sh` must pass.
3. In Xcode, for each scheme — `MaRecherche (iOS)` with destination
   **Any iOS Device (arm64)**, then `MaRecherche (macOS)` with **Any Mac**:
   **Product → Archive**, then in the Organizer **Distribute App → App Store Connect**.
4. In App Store Connect, add both builds to the version (iOS and macOS tabs), fill
   **What's New**, and **Add for Review**. Optionally test through TestFlight first.
