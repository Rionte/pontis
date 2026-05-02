const DEFAULT_SETTINGS = {
  dyslexia: {
    enabled: false,
    fontFamily: "OpenDyslexicRegular, OpenDyslexic, Trebuchet MS, Verdana, Arial, sans-serif",
    textSize: 100,
    lineHeight: 1.6,
    boldRandomWords: false,
    boldFrequency: 16,
    removeDecorations: false,
    capitalizeAll: false,
    useAutoTextColor: true,
    textColor: "#727982"
  },
  adhd: {
    enabled: false,
    breakBlocks: true,
    blockLength: 280,
    useAutoTextColor: true,
    textColor: "#111111",
    accentColor: "#005fcc"
  }
};

const elements = {
  dyslexiaEnabled: document.querySelector("#dyslexiaEnabled"),
  dyslexiaFont: document.querySelector("#dyslexiaFont"),
  dyslexiaTextSize: document.querySelector("#dyslexiaTextSize"),
  dyslexiaTextSizeValue: document.querySelector("#dyslexiaTextSizeValue"),
  dyslexiaLineHeight: document.querySelector("#dyslexiaLineHeight"),
  dyslexiaLineHeightValue: document.querySelector("#dyslexiaLineHeightValue"),
  dyslexiaBoldRandomWords: document.querySelector("#dyslexiaBoldRandomWords"),
  dyslexiaBoldFrequency: document.querySelector("#dyslexiaBoldFrequency"),
  dyslexiaBoldFrequencyValue: document.querySelector("#dyslexiaBoldFrequencyValue"),
  dyslexiaRemoveDecorations: document.querySelector("#dyslexiaRemoveDecorations"),
  dyslexiaCapitalizeAll: document.querySelector("#dyslexiaCapitalizeAll"),
  dyslexiaTextColor: document.querySelector("#dyslexiaTextColor"),
  adhdEnabled: document.querySelector("#adhdEnabled"),
  adhdBreakBlocks: document.querySelector("#adhdBreakBlocks"),
  adhdBlockLength: document.querySelector("#adhdBlockLength"),
  adhdBlockLengthValue: document.querySelector("#adhdBlockLengthValue"),
  adhdTextColor: document.querySelector("#adhdTextColor"),
  adhdAccentColor: document.querySelector("#adhdAccentColor"),
  resetSettings: document.querySelector("#resetSettings"),
  saveState: document.querySelector("#saveState")
};

let saveTimer;
let currentFormSettings = mergeSettings(DEFAULT_SETTINGS, {});
const manualColorTouched = {
  dyslexia: false,
  adhd: false
};

init();

async function init() {
  const settings = await loadSettings();
  renderSettings(settings);
  attachEvents();
}

function attachEvents() {
  elements.dyslexiaTextColor.addEventListener("input", () => {
    manualColorTouched.dyslexia = true;
    syncTextColorPickers("dyslexia");
  });

  elements.adhdTextColor.addEventListener("input", () => {
    manualColorTouched.adhd = true;
    syncTextColorPickers("adhd");
  });

  elements.dyslexiaEnabled.addEventListener("change", () => {
    syncTextColorPickers("dyslexia");
  });

  elements.adhdEnabled.addEventListener("change", () => {
    syncTextColorPickers("dyslexia");
  });

  document.querySelectorAll("input, select").forEach((control) => {
    control.addEventListener("input", saveFromForm);
    control.addEventListener("change", saveFromForm);
  });

  elements.resetSettings.addEventListener("click", async () => {
    manualColorTouched.dyslexia = false;
    manualColorTouched.adhd = false;
    renderSettings(DEFAULT_SETTINGS);
    await persistSettings(DEFAULT_SETTINGS);
    showSaveState("Settings reset.");
  });
}

async function loadSettings() {
  const stored = await chrome.storage.sync.get("settings");
  return mergeSettings(DEFAULT_SETTINGS, stored.settings || {});
}

function renderSettings(settings) {
  currentFormSettings = mergeSettings(DEFAULT_SETTINGS, settings);

  const syncedTextColor = settings.dyslexia.enabled && settings.adhd.enabled
    ? settings.dyslexia.textColor
    : settings.adhd.textColor;

  elements.dyslexiaEnabled.checked = settings.dyslexia.enabled;
  elements.dyslexiaFont.value = normalizeFontFamily(settings.dyslexia.fontFamily);
  elements.dyslexiaTextSize.value = settings.dyslexia.textSize;
  elements.dyslexiaLineHeight.value = settings.dyslexia.lineHeight;
  elements.dyslexiaBoldRandomWords.checked = settings.dyslexia.boldRandomWords;
  elements.dyslexiaBoldFrequency.value = settings.dyslexia.boldFrequency;
  elements.dyslexiaRemoveDecorations.checked = settings.dyslexia.removeDecorations;
  elements.dyslexiaCapitalizeAll.checked = settings.dyslexia.capitalizeAll;
  elements.dyslexiaTextColor.value = settings.dyslexia.textColor;

  elements.adhdEnabled.checked = settings.adhd.enabled;
  elements.adhdBreakBlocks.checked = settings.adhd.breakBlocks;
  elements.adhdBlockLength.value = settings.adhd.blockLength;
  elements.adhdTextColor.value = syncedTextColor;
  elements.adhdAccentColor.value = settings.adhd.accentColor;

  updateReadouts();
}

function collectSettings() {
  const bothModesEnabled = elements.dyslexiaEnabled.checked && elements.adhdEnabled.checked;
  const dyslexiaTextColor = elements.dyslexiaTextColor.value;
  const adhdTextColor = bothModesEnabled ? dyslexiaTextColor : elements.adhdTextColor.value;
  const dyslexiaUseAutoTextColor = manualColorTouched.dyslexia
    ? false
    : currentFormSettings.dyslexia.useAutoTextColor;
  const adhdUseAutoTextColor = bothModesEnabled
    ? dyslexiaUseAutoTextColor
    : (manualColorTouched.adhd ? false : currentFormSettings.adhd.useAutoTextColor);

  return {
    dyslexia: {
      enabled: elements.dyslexiaEnabled.checked,
      fontFamily: elements.dyslexiaFont.value,
      textSize: Number(elements.dyslexiaTextSize.value),
      lineHeight: Number(elements.dyslexiaLineHeight.value),
      boldRandomWords: elements.dyslexiaBoldRandomWords.checked,
      boldFrequency: Number(elements.dyslexiaBoldFrequency.value),
      removeDecorations: elements.dyslexiaRemoveDecorations.checked,
      capitalizeAll: elements.dyslexiaCapitalizeAll.checked,
      useAutoTextColor: dyslexiaUseAutoTextColor,
      textColor: dyslexiaTextColor
    },
    adhd: {
      enabled: elements.adhdEnabled.checked,
      breakBlocks: elements.adhdBreakBlocks.checked,
      blockLength: Number(elements.adhdBlockLength.value),
      useAutoTextColor: adhdUseAutoTextColor,
      textColor: adhdTextColor,
      accentColor: elements.adhdAccentColor.value
    }
  };
}

function syncTextColorPickers(source) {
  const bothModesEnabled = elements.dyslexiaEnabled.checked && elements.adhdEnabled.checked;
  if (!bothModesEnabled) {
    return;
  }

  const syncedColor = source === "adhd" ? elements.adhdTextColor.value : elements.dyslexiaTextColor.value;
  elements.dyslexiaTextColor.value = syncedColor;
  elements.adhdTextColor.value = syncedColor;
}

function saveFromForm() {
  const nextSettings = collectSettings();

  updateReadouts();
  clearTimeout(saveTimer);
  showSaveState("Saving...");

  saveTimer = setTimeout(async () => {
    await persistSettings(nextSettings);
    currentFormSettings = mergeSettings(DEFAULT_SETTINGS, nextSettings);
    showSaveState("Settings saved automatically.");
  }, 120);
}

async function persistSettings(settings) {
  const merged = mergeSettings(DEFAULT_SETTINGS, settings);
  await chrome.storage.sync.set({ settings: merged });
  await notifyActiveTab(merged);
}

async function notifyActiveTab(settings) {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id || !tab.url || !/^https?:\/\//.test(tab.url)) {
    return;
  }

  chrome.tabs.sendMessage(tab.id, { type: "ACCESS_EASE_SETTINGS_UPDATED", settings }).catch(() => {
    // Some Chrome pages and newly opened tabs cannot receive content-script messages.
  });
}

function updateReadouts() {
  elements.dyslexiaTextSizeValue.value = `${elements.dyslexiaTextSize.value}%`;
  elements.dyslexiaLineHeightValue.value = `${Number(elements.dyslexiaLineHeight.value).toFixed(1)}x`;
  elements.dyslexiaBoldFrequencyValue.value = `${elements.dyslexiaBoldFrequency.value}%`;
  elements.adhdBlockLengthValue.value = `${elements.adhdBlockLength.value} chars`;
}

function showSaveState(message) {
  elements.saveState.textContent = message;
}

function normalizeFontFamily(fontFamily) {
  const availableValues = [...elements.dyslexiaFont.options].map((option) => option.value);
  if (availableValues.includes(fontFamily)) {
    return fontFamily;
  }

  const matchingOption = availableValues.find((value) => value.split(",")[0] === fontFamily.split(",")[0]);
  return matchingOption || DEFAULT_SETTINGS.dyslexia.fontFamily;
}

function mergeSettings(base, updates) {
  const merged = {
    dyslexia: { ...base.dyslexia, ...(updates.dyslexia || {}) },
    adhd: { ...base.adhd, ...(updates.adhd || {}) }
  };

  if (merged.dyslexia.textSize < 50) {
    merged.dyslexia.textSize = Math.round((merged.dyslexia.textSize / 17) * 100);
  }
  merged.dyslexia.textSize = Math.max(80, Math.min(140, merged.dyslexia.textSize));

  return merged;
}
