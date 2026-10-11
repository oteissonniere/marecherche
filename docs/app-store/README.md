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
   - Add the other localizations (App Information → language menu): French, German,
     Spanish (Spain), Italian, Portuguese (Brazil).
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

The German, Spanish, Italian and Brazilian Portuguese texts below were written without a
native review: have them proofread before the 1.0 listing. They use Safari's own terms
("Suchmaschine", "buscador", "motore di ricerca").

### German

**Name**: `Ma recherche`

**Untertitel**: `Private Suche mit Ersatz`

**Werbetext**:

> Sende Safari-Suchen an deine eigene SearXNG-Instanz zu Hause und an eine öffentliche Suchmaschine deiner Wahl, wenn sie nicht erreichbar ist. Wechselt von selbst.

**Schlüsselwörter**: `searxng,suchmaschine,privat,datenschutz,selbst gehostet,homelab,umleitung,ersatz,metasuche,vpn`

**Beschreibung**:

> Nutze in Safari die Suchmaschine deiner Wahl – auch eine private, die bei dir zu Hause läuft – und verliere die Suche nie, wenn sie nicht erreichbar ist.
>
> Ma recherche sendet die Suchen aus der Adressleiste von Safari an die Suchmaschine deiner Wahl. Die App ist für eine selbst gehostete, private Suchmaschine gedacht, etwa eine SearXNG-Instanz in deinem Heimnetz, und ergänzt sie um eine öffentliche Ersatz-Suchmaschine: Qwant, DuckDuckGo, Brave, Startpage, Google, Bing, Ecosia oder eine Adresse deiner Wahl.
>
> PRÜFT UND WECHSELT VON SELBST
> • Zu Hause oder über dein VPN gehen die Suchen an deine private Suchmaschine.
> • Unterwegs gehen sie an deine Ersatz-Suchmaschine, ohne Fehlerseite und ohne etwas umzustellen.
> • Wieder zu Hause geht schon die erste Suche wieder an deine private Suchmaschine.
>
> Die Prüfung ist eine einfache Anfrage an deine Suchmaschine. Kein WLAN-Name, kein VPN-Status, keine Standortfreigabe: Es zählt nur, ob deine Suchmaschine antwortet.
>
> PRIVAT VON GRUND AUF
> • Die Umleitung geschieht in Safari, bevor die Anfrage dein Gerät verlässt: Die Standardsuchmaschine von Safari sieht deine Suche nie.
> • Kein Konto, keine Statistiken, keine Werbung. Es wird nie etwas an den Entwickler gesendet.
> • Open Source (MIT): Der Code liegt auf GitHub.
>
> FUNKTIONIERT MIT DEN SUCHMASCHINEN VON SAFARI
> Google, Bing, Yahoo, DuckDuckGo und Ecosia, auf allen Länder-Domains. Nur Suchen aus der Adressleiste werden umgeleitet: Eine Suche auf der Seite einer Suchmaschine bleibt unverändert.
>
> Das Menü der Erweiterung zeigt, wohin deine Suchen gehen, lässt dich die private oder die öffentliche Suchmaschine erzwingen und prüft deine Instanz auf Wunsch erneut.
>
> Erfordert iOS 17, iPadOS 17 oder macOS 14 oder neuer.

**Neuheiten (erste Version)**: `Erste Version.`

### Spanish

**Nombre**: `Ma recherche`

**Subtítulo**: `Búsqueda privada con respaldo`

**Texto promocional**:

> Envía las búsquedas de Safari a tu propia instancia de SearXNG en casa, y al buscador público que elijas cuando no esté accesible. Cambia solo, en ambos sentidos.

**Palabras clave**: `searxng,buscador,privado,privacidad,autoalojado,homelab,redirección,respaldo,metabuscador,vpn`

**Descripción**:

> Usa en Safari el buscador que tú elijas —incluido uno privado que funcione en tu casa— y no te quedes nunca sin búsqueda cuando no esté accesible.
>
> Ma recherche envía las búsquedas que escribes en la barra de direcciones de Safari al buscador que elijas. Está pensada para un buscador privado y autoalojado, como una instancia de SearXNG en tu red doméstica, con un buscador público de respaldo: Qwant, DuckDuckGo, Brave, Startpage, Google, Bing, Ecosia o la dirección que indiques.
>
> COMPRUEBA Y CAMBIA SOLA
> • En casa o con tu VPN, las búsquedas van a tu buscador privado.
> • Fuera de casa, van a tu buscador de respaldo, sin página de error y sin cambiar ningún ajuste.
> • De vuelta en casa, la primera búsqueda ya vuelve a tu buscador privado.
>
> La comprobación es una simple petición a tu buscador. Ni nombre de la red Wi-Fi, ni estado de la VPN, ni permiso de localización: solo importa si tu buscador responde.
>
> PRIVADA POR DISEÑO
> • La redirección se hace dentro de Safari, antes de que la petición salga de tu dispositivo: el buscador por omisión de Safari nunca ve tu búsqueda.
> • Sin cuenta, sin estadísticas, sin publicidad. Nunca se envía nada al desarrollador.
> • Código abierto (MIT): el código está en GitHub.
>
> FUNCIONA CON LOS BUSCADORES DE SAFARI
> Google, Bing, Yahoo, DuckDuckGo y Ecosia, en cualquier dominio nacional. Solo se redirigen las búsquedas de la barra de direcciones: una búsqueda hecha en la página de un buscador no se modifica.
>
> El menú de la extensión muestra adónde van tus búsquedas, permite forzar el buscador privado o el público y vuelve a comprobar tu instancia cuando quieras.
>
> Requiere iOS 17, iPadOS 17 o macOS 14 o posterior.

**Novedades (primera versión)**: `Primera versión.`

### Italian

**Nome**: `Ma recherche`

**Sottotitolo**: `Ricerca privata con riserva`

**Testo promozionale**:

> Invia le ricerche di Safari alla tua istanza SearXNG di casa e al motore pubblico che preferisci quando non è raggiungibile. Passa da solo, in entrambi i sensi.

**Parole chiave**: `searxng,motore di ricerca,privato,privacy,self-hosted,homelab,reindirizzamento,riserva,vpn`

**Descrizione**:

> Usa in Safari il motore di ricerca che preferisci, anche uno privato che gira a casa tua, senza mai restare senza ricerca quando non è raggiungibile.
>
> Ma recherche invia le ricerche digitate nella barra degli indirizzi di Safari al motore che scegli. È pensata per un motore privato e self-hosted, come un’istanza SearXNG nella tua rete di casa, affiancato da un motore pubblico di riserva: Qwant, DuckDuckGo, Brave, Startpage, Google, Bing, Ecosia o un indirizzo a tua scelta.
>
> VERIFICA E PASSA DA SOLA
> • A casa o con la tua VPN, le ricerche vanno al tuo motore privato.
> • Fuori casa, vanno al motore di riserva, senza pagina di errore e senza cambiare impostazioni.
> • Tornando a casa, già la prima ricerca torna al tuo motore privato.
>
> La verifica è una semplice richiesta al tuo motore. Nessun nome di rete Wi-Fi, nessuno stato della VPN, nessun permesso di localizzazione: conta solo se il tuo motore risponde.
>
> PRIVATA PER COME È FATTA
> • Il reindirizzamento avviene dentro Safari, prima che la richiesta lasci il dispositivo: il motore predefinito di Safari non vede mai la tua ricerca.
> • Nessun account, nessuna statistica, nessuna pubblicità. Nulla viene mai inviato allo sviluppatore.
> • Open source (MIT): il codice è su GitHub.
>
> FUNZIONA CON I MOTORI DI SAFARI
> Google, Bing, Yahoo, DuckDuckGo ed Ecosia, su qualsiasi dominio nazionale. Vengono reindirizzate solo le ricerche della barra degli indirizzi: una ricerca fatta sulla pagina di un motore non viene toccata.
>
> Il menu dell’estensione mostra dove vanno le tue ricerche, permette di forzare il motore privato o quello pubblico e verifica di nuovo la tua istanza quando vuoi.
>
> Richiede iOS 17, iPadOS 17 o macOS 14 o versioni successive.

**Novità (prima versione)**: `Prima versione.`

### Portuguese (Brazil)

**Nome**: `Ma recherche`

**Subtítulo**: `Busca privada com reserva`

**Texto promocional**:

> Envie as buscas do Safari para sua própria instância do SearXNG em casa, e para o buscador público que você escolher quando ela estiver inacessível. Alterna sozinho.

**Palavras-chave**: `searxng,buscador,privado,privacidade,auto-hospedado,homelab,redirecionar,reserva,metabusca,vpn`

**Descrição**:

> Use no Safari o buscador que você escolher, inclusive um privado rodando na sua casa, e nunca fique sem busca quando ele estiver inacessível.
>
> O Ma recherche envia as buscas digitadas na barra de endereço do Safari para o buscador que você escolher. Ele foi pensado para um buscador privado e auto-hospedado, como uma instância do SearXNG na sua rede doméstica, com um buscador público de reserva: Qwant, DuckDuckGo, Brave, Startpage, Google, Bing, Ecosia ou o endereço que você indicar.
>
> VERIFICA E ALTERNA SOZINHO
> • Em casa ou na sua VPN, as buscas vão para seu buscador privado.
> • Fora de casa, vão para seu buscador reserva, sem página de erro e sem mudar nenhum ajuste.
> • De volta em casa, a primeira busca já volta para seu buscador privado.
>
> A verificação é uma simples requisição ao seu buscador. Sem nome de rede Wi-Fi, sem estado da VPN, sem permissão de localização: só importa se o seu buscador responde.
>
> PRIVADO DESDE O PROJETO
> • O redirecionamento acontece dentro do Safari, antes de a requisição sair do seu dispositivo: o buscador padrão do Safari nunca vê sua busca.
> • Sem conta, sem estatísticas, sem publicidade. Nada é enviado ao desenvolvedor.
> • Código aberto (MIT): o código está no GitHub.
>
> FUNCIONA COM OS BUSCADORES DO SAFARI
> Google, Bing, Yahoo, DuckDuckGo e Ecosia, em qualquer domínio nacional. Só as buscas da barra de endereço são redirecionadas: uma busca feita na página de um buscador não é alterada.
>
> O menu da extensão mostra para onde vão suas buscas, permite forçar o buscador privado ou o público e verifica sua instância de novo quando você quiser.
>
> Requer iOS 17, iPadOS 17 ou macOS 14 ou posterior.

**Novidades (primeira versão)**: `Primeira versão.`

### What's New, version 0.2.0

| Language | Text |
|---|---|
| English | `Now in German, Spanish, Italian and Brazilian Portuguese. The setup steps quote Safari's exact wording.` |
| French | `Désormais en allemand, espagnol, italien et portugais du Brésil. Les étapes d'installation reprennent les libellés exacts de Safari.` |
| German | `Jetzt auch auf Deutsch, Spanisch, Italienisch und brasilianischem Portugiesisch.` |
| Spanish | `Ahora en español, alemán, italiano y portugués de Brasil.` |
| Italian | `Ora in italiano, tedesco, spagnolo e portoghese brasiliano.` |
| Portuguese (Brazil) | `Agora em português do Brasil, alemão, espanhol e italiano.` |

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
  `<iphone|ipad|mac>-<en|fr|de|es|it|pt>-<popup-private|popup-public|results|settings|app>.png`.
  On a simulator: `xcrun simctl io <device> screenshot <file>`, after
  `xcrun simctl status_bar <device> override --time 9:41 ...`.
- `./scripts/store_screenshots.sh` composes them (icon gradient, caption, rounded
  screenshot, opaque PNG) into `docs/app-store/screenshots/<device>/<lang>-<n>.png`,
  ready to upload. Captions are in the script.

## 6. Each release

1. Bump the version in **both** places, they must match:
   `MARKETING_VERSION` in `project.yml` and `"version"` in `webext/src/manifest.json`.
   `webext/test/manifest.test.js` fails when they differ.
   Bump `CURRENT_PROJECT_VERSION` for every upload (a build number can only be used
   once per version).
2. `xcodegen generate`, then `./scripts/ci.sh` must pass.
3. In Xcode, for each scheme — `MaRecherche (iOS)` with destination
   **Any iOS Device (arm64)**, then `MaRecherche (macOS)` with **Any Mac**:
   **Product → Archive**, then in the Organizer **Distribute App → App Store Connect**.
4. In App Store Connect, add both builds to the version (iOS and macOS tabs), fill
   **What's New**, and **Add for Review**. Optionally test through TestFlight first.
