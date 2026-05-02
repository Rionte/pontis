// Default configuration for accessibility features
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

// Cache DOM element references to avoid repeated queries and keep code DRY
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
// Track whether user manually changed text colors, to avoid overriding their choice with auto color logic
const manualColorTouched = {
  dyslexia: false,
  adhd: false
};

// Kick off
init();

// Main entry point: load stored settings, render them to the form, and attach event listeners
async function init() {
  const settings = await loadSettings();
  renderSettings(settings);
  attachEvents();
}

// Set up all event listeners for form controls and buttons
function attachEvents() {
  // Track manual color changes so we don't auto-override user preferences
  elements.dyslexiaTextColor.addEventListener("input", () => {
    manualColorTouched.dyslexia = true;
    syncTextColorPickers("dyslexia");
  });

  elements.adhdTextColor.addEventListener("input", () => {
    manualColorTouched.adhd = true;
    syncTextColorPickers("adhd");
  });

  // Resync color pickers when mode toggles change (since shared text color logic depends on this)
  elements.dyslexiaEnabled.addEventListener("change", () => {
    syncTextColorPickers("dyslexia");
  });

  elements.adhdEnabled.addEventListener("change", () => {
    syncTextColorPickers("dyslexia");
  });

  // Generic handler will save settings whenever any input changes (with debounce)
  document.querySelectorAll("input, select").forEach((control) => {
    control.addEventListener("input", saveFromForm);
    control.addEventListener("change", saveFromForm);
  });

  // Reset button will restore defaults, persist them, and update UI
  elements.resetSettings.addEventListener("click", async () => {
    manualColorTouched.dyslexia = false;
    manualColorTouched.adhd = false;
    renderSettings(DEFAULT_SETTINGS);
    await persistSettings(DEFAULT_SETTINGS);
    showSaveState("Settings reset.");
  });
}

// Load settings from Chrome storage, merging with defaults for safety
async function loadSettings() {
  const stored = await chrome.storage.sync.get("settings");
  return mergeSettings(DEFAULT_SETTINGS, stored.settings || {});
}

// Populate form controls with current settings values
function renderSettings(settings) {
  currentFormSettings = mergeSettings(DEFAULT_SETTINGS, settings);

  // When both modes are enabled, text color is shared—show the dyslexia value in both pickers
  const syncedTextColor = settings.dyslexia.enabled && settings.adhd.enabled
    ? settings.dyslexia.textColor
    : settings.adhd.textColor;

  // Render dyslexia settings
  elements.dyslexiaEnabled.checked = settings.dyslexia.enabled;
  elements.dyslexiaFont.value = normalizeFontFamily(settings.dyslexia.fontFamily);
  elements.dyslexiaTextSize.value = settings.dyslexia.textSize;
  elements.dyslexiaLineHeight.value = settings.dyslexia.lineHeight;
  elements.dyslexiaBoldRandomWords.checked = settings.dyslexia.boldRandomWords;
  elements.dyslexiaBoldFrequency.value = settings.dyslexia.boldFrequency;
  elements.dyslexiaRemoveDecorations.checked = settings.dyslexia.removeDecorations;
  elements.dyslexiaCapitalizeAll.checked = settings.dyslexia.capitalizeAll;
  elements.dyslexiaTextColor.value = settings.dyslexia.textColor;

  // Render ADHD settings
  elements.adhdEnabled.checked = settings.adhd.enabled;
  elements.adhdBreakBlocks.checked = settings.adhd.breakBlocks;
  elements.adhdBlockLength.value = settings.adhd.blockLength;
  elements.adhdTextColor.value = syncedTextColor; // Use synced value for consistency
  elements.adhdAccentColor.value = settings.adhd.accentColor;

  updateReadouts();
}

// Gather current form values into a settings object ready for saving
function collectSettings() {
  const bothModesEnabled = elements.dyslexiaEnabled.checked && elements.adhdEnabled.checked;
  const dyslexiaTextColor = elements.dyslexiaTextColor.value;
  // When both modes are on, ADHD text color mirrors dyslexia's to keep things simple
  const adhdTextColor = bothModesEnabled ? dyslexiaTextColor : elements.adhdTextColor.value;
  
  // Preserve auto-text-color state unless user manually edited the picker
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

// When both modes are enabled, keep the two text color pickers in sync
function syncTextColorPickers(source) {
  const bothModesEnabled = elements.dyslexiaEnabled.checked && elements.adhdEnabled.checked;
  if (!bothModesEnabled) {
    return;
  }

  const syncedColor = source === "adhd" ? elements.adhdTextColor.value : elements.dyslexiaTextColor.value;
  elements.dyslexiaTextColor.value = syncedColor;
  elements.adhdTextColor.value = syncedColor;
}

// Debounced save handler to collect settings, update UI, and persist after a short delay
function saveFromForm() {
  const nextSettings = collectSettings();

  updateReadouts();
  clearTimeout(saveTimer);
  showSaveState("Saving...");

  saveTimer = setTimeout(async () => {
    await persistSettings(nextSettings);
    currentFormSettings = mergeSettings(DEFAULT_SETTINGS, nextSettings);
    showSaveState("Settings saved automatically.");
  }, 120); // 120ms debounce feels responsive without spamming storage
}

// Save settings to Chrome storage and notify the active tab to apply changes
async function persistSettings(settings) {
  const merged = mergeSettings(DEFAULT_SETTINGS, settings);
  await chrome.storage.sync.set({ settings: merged });
  await notifyActiveTab(merged);
}

// Send a message to the active tab's content script so it can re-apply settings immediately
async function notifyActiveTab(settings) {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  // Skip if tab isn't a normal HTTP page (since pages like chrome:// URLs can't receive content script messages)
  if (!tab?.id || !tab.url || !/^https?:\/\//.test(tab.url)) {
    return;
  }

  chrome.tabs.sendMessage(tab.id, { type: "ACCESS_EASE_SETTINGS_UPDATED", settings }).catch(() => {
    // Silently fail bc some pages (new tabs, extension pages) don't have content scripts attached yet
  });
}

// Update the little helper text next to sliders/inputs (like "120%", "1.6x")
function updateReadouts() {
  elements.dyslexiaTextSizeValue.value = `${elements.dyslexiaTextSize.value}%`;
  elements.dyslexiaLineHeightValue.value = `${Number(elements.dyslexiaLineHeight.value).toFixed(1)}x`;
  elements.dyslexiaBoldFrequencyValue.value = `${elements.dyslexiaBoldFrequency.value}%`;
  elements.adhdBlockLengthValue.value = `${elements.adhdBlockLength.value} chars`;
}

// Show a brief status message in the UI (such as "Saving...", "Settings saved")
function showSaveState(message) {
  elements.saveState.textContent = message;
}

// Ensure the selected font family matches one of our supported, accessibility tested options
function normalizeFontFamily(fontFamily) {
  const availableValues = [...elements.dyslexiaFont.options].map((option) => option.value);
  if (availableValues.includes(fontFamily)) {
    return fontFamily;
  }

  // If the exact value isn't in the dropdown, try to match by the first font in the stack
  const matchingOption = availableValues.find((value) => value.split(",")[0] === fontFamily.split(",")[0]);
  return matchingOption || DEFAULT_SETTINGS.dyslexia.fontFamily;
}

// Merge user updates with default settings, handling nested objects and special cases
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
