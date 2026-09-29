# Security policy

## Reporting a vulnerability

Please **do not open a public issue** for a security problem.

Report it privately through GitHub:
[Security → Report a vulnerability](https://github.com/oteissonniere/marecherche/security/advisories/new).

Include what you found, the steps to reproduce it, and the platform and version
(macOS, iOS or iPadOS; Safari version). You will get an answer as soon as possible;
this is a personal project maintained on a best-effort basis.

## Supported versions

Only the latest release, and the `main` branch, receive security fixes.

## Scope

In scope:

- the Safari web extension (`webext/`): redirect rules, reachability probe, popup and
  settings pages, stored configuration;
- the container app (`App/`, `Extension/`);
- the build and CI configuration.

The extension asks for access to all websites because Safari requires it to redirect a
search to an instance address you choose. It reads no page content, stores no search
history and sends no data anywhere except the reachability probe to your instance and
the redirected search itself. A behaviour that contradicts this is a vulnerability.

Out of scope: vulnerabilities in SearXNG itself or in the public search engines; report
them to their maintainers.

## Automated checks

The repository runs GitHub secret scanning with push protection, CodeQL code scanning
(JavaScript, Python, GitHub Actions) and Dependabot alerts and security updates.
