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
| Google | verified | redirect works | `client=safari` |
| Yahoo | captured 2026-09-29 | `https://fr.search.yahoo.com/search?p=hello+world&fr=iphone&.tsrc=apple` | `fr=iphone` |
| Ecosia | captured 2026-09-29 | `https://www.ecosia.org/search?q=hello+world&tts=st_asaf_iphone` | `tts=st_asaf_iphone` |
| Bing | intercepted, parameter not captured | — | one of `form=APIPA1` / `form=APIPH1` |
| DuckDuckGo | intercepted, parameter not captured | — | `t=iphone` |

The first guesses for Yahoo (`fr=aapl`) and Ecosia (`tts=st_asaf_ios`) were wrong; only
the signature differed, host, path and query parameter matched.

## iPad — untested

Values may differ from the iPhone ones (e.g. `fr=ipad`, `tts=st_asaf_ipad`); capture them
with the procedure below before relying on them.

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
