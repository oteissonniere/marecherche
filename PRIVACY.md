# Privacy policy

_Last updated: 2026-09-30_

Ma recherche is a Safari extension for iPhone, iPad and Mac, with a companion app that
only explains how to enable it. It is developed by Olivier Teissonniere and published as
open source under the MIT license: <https://github.com/oteissonniere/marecherche>.

## What the developer collects

**Nothing.** The app and the extension contain no analytics, no advertising, no crash
reporting and no account. They never send anything to the developer or to any server the
developer runs.

## What stays on your device

The extension stores its settings (your private instance URL, the fallback engine, the
intercepted engines, the mode) and its last reachability check in Safari's extension
storage on your device. This data is never sent anywhere and is not synced between your
devices.

## Network requests the extension makes

- **Redirects.** When you search from Safari's address bar, the extension rewrites the
  request so that it goes to the engine you chose (your private instance or the fallback
  engine) instead of Safari's default engine. The redirect happens inside Safari, before
  the request leaves your device: the original engine does not receive your query. The
  engine you are sent to receives your search as with any search made on its website,
  under its own privacy policy.
- **Reachability check.** To know whether your private instance is reachable, the
  extension sends a request to it (by default `/healthz`) about once a minute and when you
  search. This request goes only to the URL you entered. Nothing is checked until you
  enter one.

The extension does not read the content of the pages you visit, and it does not access
your browsing history.

## Permissions

- **Access to all websites**: Safari only lets an extension redirect a search to a site
  it has access to, and your private instance can be at any address you choose.
- **Local network** (iOS and iPadOS): to check a private instance that runs on your home
  network.

## Contact

Questions or concerns: open an issue at
<https://github.com/oteissonniere/marecherche/issues>.
