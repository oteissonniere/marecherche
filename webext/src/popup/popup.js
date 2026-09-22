import { browser } from "../lib/browser.js";
import { PUBLIC_ENGINES, CUSTOM_ENGINE_ID } from "../lib/engines.js";
import { t, localizeDocument } from "../lib/i18n.js";

const led = document.getElementById("led");
const statusText = document.getElementById("status-text");
const statusDetail = document.getElementById("status-detail");
const errorText = document.getElementById("error");
const testButton = document.getElementById("test");
const modeInputs = [...document.querySelectorAll('input[name="mode"]')];

let config = null;

function formatAge(ms) {
  const seconds = Math.max(0, Math.round(ms / 1000));
  if (seconds < 60) return t("unit_seconds", [String(seconds)]);
  if (seconds < 3600) return t("unit_minutes", [String(Math.round(seconds / 60))]);
  return t("unit_hours", [String(Math.round(seconds / 3600))]);
}

function publicEngineName() {
  if (config.publicEngineId === CUSTOM_ENGINE_ID) {
    try { return new URL(config.publicCustomUrl).hostname; } catch { return t("engine_custom"); }
  }
  return t(PUBLIC_ENGINES[config.publicEngineId].nameKey);
}

function render(state) {
  led.className = `led ${state.activeTarget === "private" ? "private" : state.activeTarget === "public" ? "public" : "idle"}`;
  statusText.textContent = state.activeTarget === "private"
    ? t("popup_status_private")
    : t("popup_status_public", [publicEngineName()]);

  if (state.reachable === null) {
    statusDetail.textContent = t("popup_status_unknown");
  } else {
    const reachability = t(state.reachable ? "popup_reachable_yes" : "popup_reachable_no");
    statusDetail.textContent = `${reachability} · ${t("popup_last_checked", [formatAge(Date.now() - state.checkedAt)])}`;
  }
  for (const input of modeInputs) input.checked = input.value === config.mode;
}

function showError(message) {
  errorText.textContent = message;
  errorText.hidden = false;
}

async function request(message) {
  errorText.hidden = true;
  const response = await browser.runtime.sendMessage(message);
  if (!response || response.error) throw new Error(response?.error ?? t("popup_error"));
  return response;
}

async function withChecking(task) {
  testButton.disabled = true;
  led.classList.add("checking");
  statusDetail.textContent = t("popup_status_checking");
  try {
    render((await task()).state);
  } catch (error) {
    showError(error.message);
    // Fall back to the last known state instead of leaving "Checking…" on screen.
    try {
      const status = await browser.runtime.sendMessage({ type: "getStatus" });
      if (status?.state) { config = status.config; render(status.state); }
    } catch { /* keep the error visible */ }
  } finally {
    testButton.disabled = false;
    led.classList.remove("checking");
  }
}

testButton.addEventListener("click", () => withChecking(() => request({ type: "probeNow" })));

for (const input of modeInputs) {
  input.addEventListener("change", () => {
    config = { ...config, mode: input.value };
    withChecking(() => request({ type: "setMode", mode: input.value }));
  });
}

document.getElementById("settings").addEventListener("click", () => {
  browser.runtime.openOptionsPage();
  window.close();
});

localizeDocument();
try {
  const status = await request({ type: "getStatus" });
  config = status.config;
  render(status.state);
} catch (error) {
  showError(error.message);
}
