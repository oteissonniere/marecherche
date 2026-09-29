# Address-bar signatures

Query parameters Safari appends when a search comes from its address bar. They let the
extension leave alone a search typed on the engine's own page (`onlyAddressBar`).

## macOS — confirmed

Verified end to end by Olivier on macOS (2026-09-29): with each of the five engines set as
Safari's default, an address-bar search is redirected to the private instance, and to the
public fallback when the instance is unreachable.

Source: `preconfigured-search-engines.json` shipped inside *Qwant for Safari* 3.1.1
(`/Applications/Qwant for Safari.app/Contents/PlugIns/Qwant for Safari Extension.appex/Contents/Resources/`),
which encodes exactly this mapping:

| Engine | Host match | Query param | Signature |
|---|---|---|---|
| Google | `google.` | `q` | `client=safari` |
| Yahoo | `search.yahoo.` | `p` | `fr=aaplw` |
| Bing | `bing.` | `q` | `form=APMCS1` |
| DuckDuckGo | `duckduckgo.` | `q` | `t=osx` |
| Ecosia | `ecosia.` | `q` | `tts=st_asaf_macos` |

## iPhone

| Engine | Status | URL observed (extension disabled) | Signature |
|---|---|---|---|
| Google | captured 2026-09-29 | `https://www.google.com/search?q=hello+world&ie=UTF-8&oe=UTF-8&hl=fr-fr&client=safari` | `client=safari` |
| Yahoo | captured 2026-09-29 | `https://fr.search.yahoo.com/search?p=hello+world&fr=iphone&.tsrc=apple` | `fr=iphone` |
| Ecosia | captured 2026-09-29 | `https://www.ecosia.org/search?q=hello+world&tts=st_asaf_iphone` | `tts=st_asaf_iphone` |
| Bing | captured 2026-09-29 | `https://www.bing.com/search?q=hello+world&form=APIPH1&PC=APPL` | `form=APIPH1` |
| DuckDuckGo | captured 2026-09-29 | `https://duckduckgo.com/?q=hello+world&t=iphone&ia=web` | `t=iphone` |

The first guesses for Yahoo (`fr=aapl`) and Ecosia (`tts=st_asaf_ios`) were wrong; only
the signature differed, host, path and query parameter matched. After the fix, Olivier
verified on iPhone that address-bar searches with all five engines are redirected.

## iPad — captured on the simulator

Captured 2026-09-29 on the iPad Pro 11-inch simulator (iPadOS 27), extension not
installed, by typing a query in Safari's address bar and reading the URL from Safari's
history database.

| Engine | URL observed | Signature |
|---|---|---|
| Google | `https://www.google.com/search?q=hello&ie=UTF-8&oe=UTF-8&hl=fr-fr&client=safari` | `client=safari` |
| Yahoo | `https://fr.search.yahoo.com/search?p=hello&fr=ipad` | `fr=ipad` |
| Bing | `https://www.bing.com/search?q=plokijplokij&form=APIPA1&PC=APPD` | `form=APIPA1` |
| DuckDuckGo | `https://duckduckgo.com/?q=plokijplokij&t=ipad&ia=web` | `t=ipad` |
| Ecosia | `https://www.ecosia.org/search?q=plokijplokij&tts=st_asaf_ipad` | `tts=st_asaf_ipad` |

Yahoo and Ecosia differ from the iPhone values and were missing from the catalog; Bing
and DuckDuckGo confirmed earlier guesses. Not yet verified on a physical iPad.

## Former iOS placeholder table (superseded)

Procedure (SPEC.md Section 8): extension disabled, engine set as Safari default, search
`hello world` from the address bar, copy the resulting URL.

| Engine | Platform | Full URL observed | Signature |
|---|---|---|---|
| Google | iPhone | _to fill in_ | expected `client=safari` |
| Bing | iPhone | _to fill in_ | guessed `form=APIPA1` / `form=APIPH1` |
| DuckDuckGo | iPhone / iPad | _to fill in_ | guessed `t=iphone` / `t=ipad` |
| Yahoo | iPhone | _to fill in_ | guessed `fr=aapl` |
| Ecosia | iPhone | _to fill in_ | guessed `tts=st_asaf_ios` |
