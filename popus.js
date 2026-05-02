const DEFAULT_SETTINGS = {
  dyslexia: {
    enabled: false,
    fontFamily: "OpenDyslexic, Lexend, Atkinson Hyperlegible, Verdana, Arial, sans-serif",
    textSize: 17,
    lineHeight: 1.6,
    boldRandomWords: false,
    boldFrequency: 16,
    removeDecorations: false,
    background: "#f7f1df",
    textColor: "#5f6670"
  },
  adhd: {
    enabled: false,
    breakBlocks: true,
    blockLength: 280,
    background: "#ffffff",
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
  dyslexiaBackground: document.querySelector("#dyslexiaBackground"),
  dyslexiaTextColor: document.querySelector("#dyslexiaTextColor"),
  adhdEnabled: document.querySelector("#adhdEnabled"),
  adhdBreakBlocks: document.querySelector("#adhdBreakBlocks"),
  adhdBlockLength: document.querySelector("#adhdBlockLength"),
  adhdBlockLengthValue: document.querySelector("#adhdBlockLengthValue"),
  adhdBackground: document.querySelector("#adhdBackground"),
  adhdTextColor: document.querySelector("#adhdTextColor"),
  adhdAccentColor: document.querySelector("#adhdAccentColor"),
  resetSettings: document.querySelector("#resetSettings"),
  saveState: document.querySelector("#saveState")
};

let saveTimer;

init();

async function init() {
  const settings = await loadSettings();
  renderSettings(settings);
  attachEvents();
}

function attachEvents() {
  document.querySelectorAll("input, select").forEach((control) => {
    control.addEventListener("input", saveFromForm);
    control.addEventListener("change", saveFromForm);
  });

  elements.resetSettings.addEventListener("click", async () => {
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
  elements.dyslexiaEnabled.checked = settings.dyslexia.enabled;
  elements.dyslexiaFont.value = settings.dyslexia.fontFamily;
  elements.dyslexiaTextSize.value = settings.dyslexia.textSize;
  elements.dyslexiaLineHeight.value = settings.dyslexia.lineHeight;
  elements.dyslexiaBoldRandomWords.checked = settings.dyslexia.boldRandomWords;
  elements.dyslexiaBoldFrequency.value = settings.dyslexia.boldFrequency;
  elements.dyslexiaRemoveDecorations.checked = settings.dyslexia.removeDecorations;
  elements.dyslexiaBackground.value = settings.dyslexia.background;
  elements.dyslexiaTextColor.value = settings.dyslexia.textColor;

  elements.adhdEnabled.checked = settings.adhd.enabled;
  elements.adhdBreakBlocks.checked = settings.adhd.breakBlocks;
  elements.adhdBlockLength.value = settings.adhd.blockLength;
  elements.adhdBackground.value = settings.adhd.background;
  elements.adhdTextColor.value = settings.adhd.textColor;
  elements.adhdAccentColor.value = settings.adhd.accentColor;

  updateReadouts();
}