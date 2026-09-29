#!/usr/bin/env python3
"""Serve webext/src with a fake `browser` API, to work on the popup and settings UI
in any browser without rebuilding the Safari extension.

    python3 scripts/preview_ui.py [port]          # default 8765
    open http://localhost:8765/popup/popup.html?lang=fr&target=public
    open http://localhost:8765/settings/settings.html?lang=en

Query parameters: lang=en|fr, target=private|public, reachable=1|0|null.
Storage lives in the page's memory; nothing here ships in the extension.
"""
import sys
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote, urlsplit

SRC = Path(__file__).resolve().parent.parent / "webext" / "src"

STUB = r"""
<script>
(() => {
  const params = new URLSearchParams(location.search);
  const lang = params.get("lang") || "en";
  const request = new XMLHttpRequest();
  request.open("GET", `/_locales/${lang}/messages.json`, false);
  request.send();
  const messages = JSON.parse(request.responseText);
  const store = {};
  const reachableParam = params.get("reachable");
  const state = {
    reachable: reachableParam === "null" ? null : reachableParam !== "0",
    checkedAt: Date.now() - 42000,
    activeTarget: params.get("target") || "private"
  };
  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  globalThis.browser = {
    i18n: {
      getUILanguage: () => lang,
      getMessage(key, substitutions = []) {
        const entry = messages[key];
        if (!entry) return "";
        return entry.message.replace(/\$([A-Za-z]+)\$/g, (_, name) => {
          const index = Number(entry.placeholders[name.toLowerCase()].content.slice(1)) - 1;
          return [].concat(substitutions)[index] ?? "";
        });
      }
    },
    storage: {
      local: {
        async get(key) { return key in store ? { [key]: structuredClone(store[key]) } : {}; },
        async set(items) { Object.assign(store, structuredClone(items)); console.log("storage.set", items); }
      }
    },
    runtime: {
      openOptionsPage() { location.href = "/settings/settings.html" + location.search; },
      async sendMessage(message) {
        const { normalizeConfig } = await import("/lib/config.js");
        const config = normalizeConfig(store.config);
        if (message.type === "getStatus") return { config, state };
        await wait(700);
        state.checkedAt = Date.now();
        if (message.type === "setMode") {
          store.config = { ...config, mode: message.mode };
          state.activeTarget = message.mode === "force-private" ? "private"
            : message.mode === "force-public" ? "public" : (state.reachable ? "private" : "public");
        }
        return { state };
      }
    }
  };
})();
</script>
"""


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(SRC), **kwargs)

    def do_GET(self):
        # Resolve the decoded request path and refuse anything outside webext/src before
        # touching the file system (no "..", encoded or not, can escape SRC).
        relative = unquote(urlsplit(self.path).path).lstrip("/")
        path = (SRC / relative).resolve()
        if not path.is_relative_to(SRC):
            self.send_error(404)
            return
        if path.suffix == ".html" and path.is_file():
            body = path.read_text(encoding="utf-8").replace("<head>", "<head>" + STUB, 1).encode()
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.send_header("Content-Length", str(len(body)))
            self.send_header("Cache-Control", "no-store")
            self.end_headers()
            self.wfile.write(body)
            return
        super().do_GET()

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()


if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8765
    print(f"Serving {SRC} on http://localhost:{port}/popup/popup.html")
    ThreadingHTTPServer(("127.0.0.1", port), Handler).serve_forever()
