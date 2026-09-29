// Safari's built-in engines we intercept.
// `signatures` = query params Safari adds for address-bar searches, per platform.
// macOS and iPhone values are captured on device for all five engines.
// iPad values (form=APIPA1, t=ipad) are unverified guesses. See docs/engine-signatures.md.
export const INTERCEPTED_ENGINES = Object.freeze({
  google: {
    id: "google", nameKey: "engine_google",
    hostPattern: "www\\.google\\.[a-z.]+", // covers regional TLDs
    path: "/search",
    queryParam: "q",
    signatures: ["client=safari"]
  },
  bing: {
    id: "bing", nameKey: "engine_bing",
    hostPattern: "www\\.bing\\.com",
    path: "/search", queryParam: "q",
    signatures: ["form=APMCS1", "form=APIPH1", "form=APIPA1"] // macOS, iPhone, iPad (unverified)
  },
  duckduckgo: {
    id: "duckduckgo", nameKey: "engine_duckduckgo",
    hostPattern: "duckduckgo\\.com",
    path: "/", queryParam: "q",
    signatures: ["t=osx", "t=iphone", "t=ipad"] // macOS, iPhone, iPad (unverified)
  },
  yahoo: {
    id: "yahoo", nameKey: "engine_yahoo",
    hostPattern: "(?:[a-z]+\\.)?search\\.yahoo\\.com",
    path: "/search", queryParam: "p",
    signatures: ["fr=aaplw", "fr=iphone"] // macOS, iPhone
  },
  ecosia: {
    id: "ecosia", nameKey: "engine_ecosia",
    hostPattern: "www\\.ecosia\\.org",
    path: "/search", queryParam: "q",
    signatures: ["tts=st_asaf_macos", "tts=st_asaf_iphone"] // macOS, iPhone
  }
});

// Public fallback targets. `url` contains {q}; the captured query is inserted as-is
// (it is already percent-encoded by Safari).
export const PUBLIC_ENGINES = Object.freeze({
  qwant:      { id: "qwant",      nameKey: "engine_qwant",      url: "https://www.qwant.com/?q={q}",              interceptedId: null },
  duckduckgo: { id: "duckduckgo", nameKey: "engine_duckduckgo", url: "https://duckduckgo.com/?q={q}",             interceptedId: "duckduckgo" },
  brave:      { id: "brave",      nameKey: "engine_brave",      url: "https://search.brave.com/search?q={q}",     interceptedId: null },
  startpage:  { id: "startpage",  nameKey: "engine_startpage",  url: "https://www.startpage.com/do/search?q={q}", interceptedId: null },
  google:     { id: "google",     nameKey: "engine_google",     url: "https://www.google.com/search?q={q}",       interceptedId: "google" },
  bing:       { id: "bing",       nameKey: "engine_bing",       url: "https://www.bing.com/search?q={q}",         interceptedId: "bing" },
  ecosia:     { id: "ecosia",     nameKey: "engine_ecosia",     url: "https://www.ecosia.org/search?q={q}",       interceptedId: "ecosia" }
});

export const CUSTOM_ENGINE_ID = "custom";

// Returns the {q}-template URL for the current public target.
export function publicTemplate(config) {
  if (config.publicEngineId === CUSTOM_ENGINE_ID) return config.publicCustomUrl;
  return PUBLIC_ENGINES[config.publicEngineId].url;
}

// Returns the {q}-template URL for the private target.
export function privateTemplate(config) {
  return config.privateEngine.url + config.privateEngine.searchPath;
}

// Returns the intercepted engine id that the public target corresponds to, or null.
export function publicInterceptedId(config) {
  if (config.publicEngineId === CUSTOM_ENGINE_ID) return null;
  return PUBLIC_ENGINES[config.publicEngineId]?.interceptedId ?? null;
}
