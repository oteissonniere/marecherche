import { browser } from "./browser.js";

export function t(key, substitutions) {
  return browser.i18n.getMessage(key, substitutions) || key;
}

// Fills every [data-i18n] element of the document with its localized text.
export function localizeDocument(root = document) {
  for (const element of root.querySelectorAll("[data-i18n]")) {
    element.textContent = t(element.dataset.i18n);
  }
  document.documentElement.lang = browser.i18n.getUILanguage?.() ?? "en";
}
