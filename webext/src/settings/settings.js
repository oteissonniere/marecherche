import { browser } from "../lib/browser.js";
import { INTERCEPTED_ENGINES, PUBLIC_ENGINES, CUSTOM_ENGINE_ID } from "../lib/engines.js";
import { loadConfig, saveConfig, validateConfig } from "../lib/config.js";
import { t, localizeDocument } from "../lib/i18n.js";

const $ = (id) => document.getElementById(id);
const storage = browser.storage.local;

// Validation error id -> [field id, message key].
const ERROR_TARGETS = {
  "privateEngine.url:invalid": ["private-url", "settings_error_invalid_url"],
  "privateEngine.url:protocol": ["private-url", "settings_error_invalid_url"],
  "privateEngine.url:no-query": ["private-url", "settings_error_invalid_url"],
  "privateEngine.url:required": ["private-url", "settings_error_private_required"],
  "privateEngine.searchPath:invalid": ["search-path", "settings_error_search_path"],
  "privateEngine.probePath:invalid": ["probe-path", "settings_error_probe_path"],
  "publicCustomUrl:invalid": ["custom-url", "settings_error_custom_url_placeholder"],
  "interceptedEngineIds:empty": ["engines", "settings_error_no_engine"],
  "probeTimeoutMs:range": ["probe-timeout", "settings_error_probe_timeout"],
  "probeIntervalMin:range": ["probe-interval", "settings_error_probe_interval"]
};
// Fields living inside the collapsed "Advanced" block.
const ADVANCED_FIELDS = new Set(["search-path", "probe-path", "probe-timeout", "probe-interval"]);

let currentMode = "auto";

function buildControls() {
  const select = $("public-engine");
  for (const engine of Object.values(PUBLIC_ENGINES)) {
    select.append(new Option(t(engine.nameKey), engine.id));
  }
  select.append(new Option(t("engine_custom"), CUSTOM_ENGINE_ID));

  const container = $("engines");
  for (const engine of Object.values(INTERCEPTED_ENGINES)) {
    const label = document.createElement("label");
    label.className = "check";
    const input = document.createElement("input");
    input.type = "checkbox";
    input.value = engine.id;
    const text = document.createElement("span");
    text.textContent = t(engine.nameKey);
    label.append(input, text);
    container.append(label);
  }
}

function toggleCustomField() {
  $("custom-url-field").hidden = $("public-engine").value !== CUSTOM_ENGINE_ID;
}

function fill(config) {
  currentMode = config.mode;
  $("private-url").value = config.privateEngine.url;
  $("search-path").value = config.privateEngine.searchPath;
  $("probe-path").value = config.privateEngine.probePath;
  $("public-engine").value = config.publicEngineId;
  $("custom-url").value = config.publicCustomUrl;
  for (const input of $("engines").querySelectorAll("input")) {
    input.checked = config.interceptedEngineIds.includes(input.value);
  }
  $("only-address-bar").checked = config.onlyAddressBar;
  $("probe-timeout").value = config.probeTimeoutMs;
  $("probe-interval").value = config.probeIntervalMin;
  toggleCustomField();
}

function read() {
  return {
    privateEngine: {
      url: $("private-url").value.trim(),
      searchPath: $("search-path").value.trim(),
      probePath: $("probe-path").value.trim()
    },
    publicEngineId: $("public-engine").value,
    publicCustomUrl: $("custom-url").value.trim(),
    interceptedEngineIds: [...$("engines").querySelectorAll("input:checked")].map((input) => input.value),
    onlyAddressBar: $("only-address-bar").checked,
    mode: currentMode,
    probeTimeoutMs: Number($("probe-timeout").value),
    probeIntervalMin: Number($("probe-interval").value)
  };
}

function clearErrors() {
  for (const element of document.querySelectorAll(".error")) {
    element.hidden = true;
    element.textContent = "";
  }
  for (const element of document.querySelectorAll('[aria-invalid="true"]')) {
    element.removeAttribute("aria-invalid");
  }
}

function showErrors(errors) {
  let first = null;
  for (const error of errors) {
    const [fieldId, messageKey] = ERROR_TARGETS[error] ?? [];
    if (!fieldId) continue;
    const message = $(`${fieldId}-error`);
    message.textContent = t(messageKey);
    message.hidden = false;
    if (ADVANCED_FIELDS.has(fieldId)) document.querySelector("details").open = true;
    const field = $(fieldId);
    if (field.tagName === "INPUT") field.setAttribute("aria-invalid", "true");
    first ??= field.tagName === "INPUT" ? field : field.querySelector("input");
  }
  if (first) first.focus();
  else $("saved").textContent = t("settings_error_generic");
}

let savedTimer = null;
$("form").addEventListener("submit", async (event) => {
  event.preventDefault();
  clearErrors();
  $("saved").textContent = "";
  const result = validateConfig(read());
  if (!result.ok) {
    showErrors(result.errors);
    return;
  }
  await saveConfig(storage, result.config);
  fill(result.config);
  $("saved").textContent = t("settings_saved");
  clearTimeout(savedTimer);
  savedTimer = setTimeout(() => { $("saved").textContent = ""; }, 2000);
});

$("public-engine").addEventListener("change", toggleCustomField);

localizeDocument();
buildControls();
fill(await loadConfig(storage));
