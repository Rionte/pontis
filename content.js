// Default configuration for accessibility features, dyslexia and ADHD support
const DEFAULT_SETTINGS = {
  dyslexia: {
    enabled: false,
    fontFamily: "OpenDyslexicRegular, OpenDyslexic, Trebuchet MS, Verdana, Arial, sans-serif",
    textSize: 17,
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

// CSS class/attribute constants to avoid typos and make refactoring easier
const STYLE_ID = "accessease-style";
const TEXT_ELEMENT_CLASS = "accessease-text-element";
const TEXT_ELEMENT_ATTR = "data-accessease-text-element";
const BLOCK_CLASS = "accessease-split-block";
const SPLIT_WRAPPER_CLASS = "accessease-split-wrapper";
const BOLD_WORD_CLASS = "accessease-bold-word";
const SPLIT_ATTR = "data-accessease-split";
const BOLD_ATTR = "data-accessease-bold-word";
const ORIGINAL_ATTR = "data-accessease-original";

let currentSettings = DEFAULT_SETTINGS;

// Entry point, load settings and set up listeners for real-time updates
bootstrap();

async function bootstrap() {
  currentSettings = await loadSettings();
  applySettings(currentSettings);

  // Listen for settings changes from Chrome storage (synced across devices)
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== "sync" || !changes.settings) {
      return;
    }

    currentSettings = mergeSettings(DEFAULT_SETTINGS, changes.settings.newValue || {});
    applySettings(currentSettings);
  });

  // Listen for messages from other parts of the extension (e.g., popup UI)
  chrome.runtime.onMessage.addListener((message) => {
    if (message?.type === "ACCESS_EASE_SETTINGS_UPDATED") {
      currentSettings = mergeSettings(DEFAULT_SETTINGS, message.settings || {});
      applySettings(currentSettings);
    }
  });
}

// Load user settings from Chrome storage, falling back to defaults if none exist
async function loadSettings() {
  const stored = await chrome.storage.sync.get("settings");
  return mergeSettings(DEFAULT_SETTINGS, stored.settings || {});
}

// Main application logic: apply or remove accessibility modifications based on settings
function applySettings(settings) {
  // Clean up any previous modifications first to avoid stacking styles
  restoreTextElementStyles();
  restoreBoldWords();
  restoreSplitParagraphs();

  // If both features are disabled, remove all injected styles and exit early
  if (!settings.dyslexia.enabled && !settings.adhd.enabled) {
    removeInjectedStyle();
    document.documentElement.removeAttribute("data-accessease-active");
    return;
  }

  // Mark the page as "active" so CSS rules can target it, then inject dynamic styles
  document.documentElement.setAttribute("data-accessease-active", "true");
  injectStyle(buildCss(settings));

  // Apply ADHD-specific text chunking if enabled
  if (settings.adhd.enabled && settings.adhd.breakBlocks) {
    splitLongTextBlocks(settings.adhd.blockLength);
  }

  // Apply dyslexia-specific word emphasis if enabled
  if (settings.dyslexia.enabled && settings.dyslexia.boldRandomWords) {
    boldRandomWords(settings.dyslexia.boldFrequency);
  }

  // Apply text color and sizing adjustments to relevant elements
  applyTextElementStyles(settings);
}

// Generate the full CSS string based on current settings this is injected into the page
function buildCss(settings) {
  const dyslexia = settings.dyslexia;
  const adhd = settings.adhd;
  // Use accent color for focus states; fallback if ADHD mode is off
  const accentColor = adhd.enabled ? adhd.accentColor : "#2f6f65";
  // Slightly bolder text can help with ADHD focus
  const fontWeight = adhd.enabled ? 600 : 400;

  return `
    @import url("https://cdn.jsdelivr.net/npm/open-dyslexic@1.0.3/open-dyslexic-regular.css");

    html[data-accessease-active] .${TEXT_ELEMENT_CLASS} {
      color: var(--accessease-text-color) !important;
    }

    /* Improve link/button underlines for readability */
    html[data-accessease-active] a,
    html[data-accessease-active] button,
    html[data-accessease-active] [role="button"] {
      text-decoration-thickness: 0.12em !important;
      text-underline-offset: 0.18em !important;
    }

    /* Ensure form inputs respect our text color and focus styles */
    html[data-accessease-active] input,
    html[data-accessease-active] textarea,
    html[data-accessease-active] select {
      color: var(--accessease-text-color) !important;
      border-color: ${accentColor} !important;
    }

    ${dyslexia.enabled ? buildDyslexiaCss(dyslexia) : ""}
    ${adhd.enabled ? buildAdhdCss(accentColor, fontWeight) : ""}
  `;
}

// Generate CSS rules specific to dyslexia support (font, spacing, capitalization)
function buildDyslexiaCss(dyslexia) {
  const textTransform = dyslexia.capitalizeAll ? "uppercase" : "none";

  return `
    html[data-accessease-active] .${TEXT_ELEMENT_CLASS} {
      font-family: ${dyslexia.fontFamily} !important;
      font-size: var(--accessease-font-size) !important;
      line-height: ${dyslexia.lineHeight} !important;
      letter-spacing: 0.01em !important;
      text-align: left !important;
      text-transform: ${textTransform} !important;
    }

    /* Apply font changes to pseudo-elements too, for consistency */
    html[data-accessease-active] body *::before,
    html[data-accessease-active] body *::after {
      font-family: ${dyslexia.fontFamily} !important;
      line-height: ${dyslexia.lineHeight} !important;
      text-transform: ${textTransform} !important;
    }

    html[data-accessease-active] .${BOLD_WORD_CLASS} {
      font-weight: 800 !important;
    }

    ${dyslexia.removeDecorations ? buildDecorationResetCss() : ""}
  `;
}

// Optional, strip italics, underlines, and other decorations that can confuse dyslexic readers
function buildDecorationResetCss() {
  return `
    html[data-accessease-active] body *:not(script):not(style):not(noscript):not(svg):not(svg *) {
      font-style: normal !important;
      text-decoration-line: none !important;
      text-decoration: none !important;
    }
  `;
}

// Generate CSS rules for ADHD support: shorter line lengths, visual separation, focus indicators
function buildAdhdCss(accentColor, fontWeight) {
  return `
    html[data-accessease-active] p,
    html[data-accessease-active] li,
    html[data-accessease-active] blockquote,
    html[data-accessease-active] dd {
      max-width: 72ch !important; /* Optimal reading width */
      display: block !important;
      margin-top: 0.75em !important;
      margin-bottom: 0.75em !important;
      font-weight: ${fontWeight} !important;
    }

    html[data-accessease-active] .${SPLIT_WRAPPER_CLASS} {
      display: block !important;
      max-width: 72ch !important;
    }

    /* Visually separate text blocks with a colored left border */
    html[data-accessease-active] .${BLOCK_CLASS} {
      display: block !important;
      max-width: 72ch !important;
      margin-top: 0.75em !important;
      margin-bottom: 0.75em !important;
      padding: 0.55em 0.75em !important;
      border-left: 0.25em solid ${accentColor} !important;
      font-weight: ${fontWeight} !important;
    }

    /* Subtle underline on headings to improve scanability */
    html[data-accessease-active] h1,
    html[data-accessease-active] h2,
    html[data-accessease-active] h3,
    html[data-accessease-active] h4,
    html[data-accessease-active] h5,
    html[data-accessease-active] h6 {
      border-bottom: 0.08em solid ${accentColor} !important;
      padding-bottom: 0.12em !important;
    }

    /* High-visibility focus ring for keyboard navigation */
    html[data-accessease-active] :focus-visible {
      outline: 0.2em solid ${accentColor} !important;
      outline-offset: 0.15em !important;
    }
  `;
}

// Inject or update the <style> tag that holds our dynamic CSS
function injectStyle(css) {
  let style = document.getElementById(STYLE_ID);
  if (!style) {
    style = document.createElement("style");
    style.id = STYLE_ID;
    document.documentElement.append(style);
  }

  style.textContent = css;
}

// Remove the injected style tag when features are disabled
function removeInjectedStyle() {
  document.getElementById(STYLE_ID)?.remove();
}

// Apply text color and font-size adjustments to visible text elements on the page
function applyTextElementStyles(settings) {
  const textElements = getTextElements();
  // Scale font size relative to the original, but only if dyslexia mode is on
  const fontScale = settings.dyslexia.enabled ? settings.dyslexia.textSize / 17 : 1;

  textElements.forEach((element) => {
    const computedStyle = getComputedStyle(element);
    const background = getEffectiveBackgroundColor(element);
    // Choose a text color that contrasts well with the background
    const textColor = getReadableTextColor(background, settings);

    element.classList.add(TEXT_ELEMENT_CLASS);
    element.setAttribute(TEXT_ELEMENT_ATTR, "true");
    element.style.setProperty("--accessease-text-color", textColor);

    if (settings.dyslexia.enabled) {
      const originalFontSize = parseFloat(computedStyle.fontSize) || 16;
      // Clamp scaled font size to a readable range (12–42px)
      const scaledFontSize = Math.max(12, Math.min(42, originalFontSize * fontScale));
      element.style.setProperty("--accessease-font-size", `${scaledFontSize.toFixed(2)}px`);
    } else {
      element.style.removeProperty("--accessease-font-size");
    }
  });
}

// Find all text-containing elements that are visible and should be modified
function getTextElements() {
  const elements = new Set();
  // Walk the DOM to find text nodes, then collect their parent elements
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      if (!node.textContent.trim() || shouldSkipTextNode(node)) {
        return NodeFilter.FILTER_REJECT;
      }
      return NodeFilter.FILTER_ACCEPT;
    }
  });

  while (walker.nextNode()) {
    const parent = walker.currentNode.parentElement;
    if (parent && isVisibleTextElement(parent)) {
      elements.add(parent);
    }
  }

  // Also include interactive elements that contain text
  document.querySelectorAll("input, textarea, select, button, [role='button']").forEach((element) => {
    if (element instanceof HTMLElement && isVisibleTextElement(element)) {
      elements.add(element);
    }
  });

  return elements;
}

// Check if an element is actually visible to the user (not hidden via CSS)
function isVisibleTextElement(element) {
  const style = getComputedStyle(element);
  return style.display !== "none" && style.visibility !== "hidden" && style.visibility !== "collapse" && Number(style.opacity) !== 0;
}

// Walk up the DOM tree to find the first opaque background color affecting this element
function getEffectiveBackgroundColor(element) {
  let current = element;

  while (current && current !== document.documentElement) {
    const style = getComputedStyle(current);
    const color = parseCssColor(style.backgroundColor);

    if (color && color.alpha > 0) {
      return color;
    }

    current = current.parentElement;
  }

  // Fallback to body background, then to white if nothing is set
  const bodyColor = parseCssColor(getComputedStyle(document.body).backgroundColor);
  if (bodyColor && bodyColor.alpha > 0) {
    return bodyColor;
  }

  return { red: 255, green: 255, blue: 255, alpha: 1 };
}

// Pick a text color that provides good contrast against the background
function getReadableTextColor(background, settings) {
  const effectiveColor = getEffectiveTextColor(settings);
  if (effectiveColor) {
    return effectiveColor;
  }

  // Use light check to decide light vs. dark text
  const lightness = getRelativeLuminance(background);
  return lightness > 0.45 ? "#111111" : "#f0f4fa";
}

// Determine which text color setting to use based on which features are enabled
function getEffectiveTextColor(settings) {
  const dyslexiaManualColor = settings.dyslexia.useAutoTextColor ? null : settings.dyslexia.textColor;
  const adhdManualColor = settings.adhd.useAutoTextColor ? null : settings.adhd.textColor;

  if (settings.dyslexia.enabled && settings.adhd.enabled) {
    return dyslexiaManualColor || adhdManualColor || null;
  }

  if (settings.adhd.enabled) {
    return adhdManualColor;
  }

  return dyslexiaManualColor;
}

// Parse a CSS color string (rgb/rgba) into a normalized object for calculations
function parseCssColor(color) {
  if (!color || color === "transparent") {
    return null;
  }

  const rgbaMatch = color.match(/^rgba?\(([^)]+)\)$/);
  if (!rgbaMatch) {
    return null;
  }

  const parts = rgbaMatch[1].split(",").map((part) => part.trim());
  if (parts.length < 3) {
    return null;
  }

  const red = Number(parts[0]);
  const green = Number(parts[1]);
  const blue = Number(parts[2]);
  const alpha = parts.length >= 4 ? Number(parts[3]) : 1;

  if ([red, green, blue, alpha].some((value) => Number.isNaN(value))) {
    return null;
  }

  return { red, green, blue, alpha };
}

// Calculate relative light for contrast checking
function getRelativeLuminance(color) {
  const red = normalizeColorChannel(color.red);
  const green = normalizeColorChannel(color.green);
  const blue = normalizeColorChannel(color.blue);
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

// Normalize an RGB channel value to the 0–1 range using the sRGB formula
function normalizeColorChannel(value) {
  const channel = value / 255;
  return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
}

// Remove our custom classes/attributes/styles from previously modified elements
function restoreTextElementStyles() {
  document.querySelectorAll(`[${TEXT_ELEMENT_ATTR}="true"]`).forEach((element) => {
    element.classList.remove(TEXT_ELEMENT_CLASS);
    element.removeAttribute(TEXT_ELEMENT_ATTR);
    element.style.removeProperty("--accessease-text-color");
    element.style.removeProperty("--accessease-font-size");
  });
}

// Split long paragraphs into smaller, more digestible chunks for ADHD users
function splitLongTextBlocks(maxLength) {
  const candidates = document.querySelectorAll("p, blockquote");

  candidates.forEach((element) => {
    if (!shouldSplitElement(element, maxLength)) {
      return;
    }

    const text = element.textContent;
    const chunks = chunkTextRanges(text, maxLength);
    if (chunks.length < 2) {
      return;
    }

    // Map text content to DOM nodes so we can preserve formatting when splitting
    const textMap = mapTextNodes(element);
    const wrapper = document.createElement("div");
    wrapper.className = SPLIT_WRAPPER_CLASS;
    wrapper.setAttribute(SPLIT_ATTR, "true");
    wrapper.setAttribute(ORIGINAL_ATTR, element.outerHTML); // Store original for restoration

    chunks.forEach((chunk) => {
      const block = document.createElement("p");
      block.className = [element.className, BLOCK_CLASS].filter(Boolean).join(" ");
      block.append(cloneChunkContent(textMap, chunk, text.slice(chunk.start, chunk.end).trim()));
      wrapper.append(block);
    });

    element.replaceWith(wrapper);
  });
}

// Decide whether a text element should be split (skip interactive/complex elements)
function shouldSplitElement(element, maxLength) {
  // Skip elements inside navigation, forms, code blocks, etc.
  if (element.closest("nav, header, footer, aside, form, button, select, textarea, pre, code, [contenteditable='true']")) {
    return false;
  }

  // Don't split elements we've already split
  if (element.closest(`[${SPLIT_ATTR}="true"]`)) {
    return false;
  }

  // Skip elements containing interactive or complex child content
  if (element.querySelector("button, input, select, textarea, summary, details, iframe, video, audio, table, ul, ol, dl, figure")) {
    return false;
  }

  // Skip elements that already contain block-level children
  if (element.querySelector("p, div, section, article, aside, header, footer, blockquote")) {
    return false;
  }

  return element.textContent.trim().length > maxLength;
}

// Restore paragraphs that were previously split by replacing wrappers with original HTML
function restoreSplitParagraphs() {
  document.querySelectorAll(`[${SPLIT_ATTR}="true"]`).forEach((wrapper) => {
    const original = wrapper.getAttribute(ORIGINAL_ATTR);
    if (original !== null) {
      const template = document.createElement("template");
      template.innerHTML = original;
      const restored = template.content.firstElementChild;
      if (restored) {
        wrapper.replaceWith(restored);
      }
    }
  });
}

// Randomly bold some words to help guide the eye for users with ADHD
function boldRandomWords(frequency) {
  const textNodes = [];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      if (!node.textContent.trim() || shouldSkipTextNode(node)) {
        return NodeFilter.FILTER_REJECT;
      }
      return NodeFilter.FILTER_ACCEPT;
    }
  });

  while (walker.nextNode()) {
    textNodes.push(walker.currentNode);
  }

  let wordIndex = 0;
  textNodes.forEach((node) => {
    const fragment = document.createDocumentFragment();
    const text = node.textContent;
    // Match words (letters, numbers, apostrophes, hyphens) with Unicode support
    const wordPattern = /[\p{L}\p{N}][\p{L}\p{N}'-]*/gu;
    let lastIndex = 0;
    let hasBoldWord = false;
    let match = wordPattern.exec(text);

    while (match) {
      const word = match[0];
      fragment.append(document.createTextNode(text.slice(lastIndex, match.index)));

      // Only bold longer words, and use a hash to make selection deterministic per page
      if (word.length >= 4 && shouldBoldWord(word, wordIndex, frequency)) {
        const span = document.createElement("span");
        span.className = BOLD_WORD_CLASS;
        span.setAttribute(BOLD_ATTR, "true");
        span.textContent = word;
        fragment.append(span);
        hasBoldWord = true;
      } else {
        fragment.append(document.createTextNode(word));
      }

      wordIndex += 1;
      lastIndex = match.index + word.length;
      match = wordPattern.exec(text);
    }

    // Only replace the node if we actually added bold words
    if (!hasBoldWord) {
      return;
    }

    fragment.append(document.createTextNode(text.slice(lastIndex)));
    node.replaceWith(fragment);
  });
}

// Skip text nodes inside elements where styling would break functionality or look odd
function shouldSkipTextNode(node) {
  const parent = node.parentElement;
  if (!parent) {
    return true;
  }

  return Boolean(parent.closest(`script, style, noscript, svg, canvas, textarea, input, select, option, code, pre, [contenteditable="true"], .${BOLD_WORD_CLASS}`));
}

// Deterministically decide whether to bold a word based on its position and content
function shouldBoldWord(word, index, frequency) {
  return hashString(`${location.hostname}:${index}:${word}`) % 100 < frequency;
}

// Simple string hash function for consistent random-like behavior across page loads
function hashString(value) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash;
}

// Remove bold spans we added and restore plain text
function restoreBoldWords() {
  document.querySelectorAll(`[${BOLD_ATTR}="true"]`).forEach((span) => {
    span.replaceWith(document.createTextNode(span.textContent));
  });
  document.body?.normalize(); // Merge adjacent text nodes after replacements
}

// Map text content positions to their corresponding DOM text nodes (for safe splitting)
function mapTextNodes(root) {
  const nodes = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let start = 0;

  while (walker.nextNode()) {
    const node = walker.currentNode;
    const end = start + node.textContent.length;
    nodes.push({ node, start, end });
    start = end;
  }

  return nodes;
}

// Clone a portion of the DOM that corresponds to a text chunk, preserving formatting
function cloneChunkContent(textMap, chunk, fallbackText) {
  const start = getTextBoundary(textMap, chunk.start, "start");
  const end = getTextBoundary(textMap, chunk.end, "end");

  if (!start || !end) {
    return document.createTextNode(fallbackText);
  }

  const range = document.createRange();
  range.setStart(start.node, start.offset);
  range.setEnd(end.node, end.offset);

  const fragment = range.cloneContents();
  if (!fragment.textContent.trim()) {
    return document.createTextNode(fallbackText);
  }

  trimFragmentEdges(fragment);
  return fragment;
}

// Find the exact text node and offset for a given character position in the original text
function getTextBoundary(textMap, target, mode) {
  for (const item of textMap) {
    if (target > item.start && target < item.end) {
      return { node: item.node, offset: target - item.start };
    }

    if (target === item.start && mode === "start") {
      return { node: item.node, offset: 0 };
    }

    if (target === item.end && mode === "end") {
      return { node: item.node, offset: item.node.textContent.length };
    }
  }

  // Handle edge case: target is at or beyond the end of text
  const last = textMap[textMap.length - 1];
  if (last && target >= last.end) {
    return { node: last.node, offset: last.node.textContent.length };
  }

  return null;
}

// Trim leading/trailing whitespace from the edges of a document fragment
function trimFragmentEdges(fragment) {
  const firstText = findEdgeTextNode(fragment, "first");
  const lastText = findEdgeTextNode(fragment, "last");

  if (firstText) {
    firstText.textContent = firstText.textContent.replace(/^\s+/, "");
  }

  if (lastText) {
    lastText.textContent = lastText.textContent.replace(/\s+$/, "");
  }
}

// Find the first or last text node within a fragment (for trimming whitespace)
function findEdgeTextNode(root, edge) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let current = walker.nextNode();
  let found = current;

  if (edge === "first") {
    return found;
  }

  while (current) {
    found = current;
    current = walker.nextNode();
  }

  return found;
}

// Break text into chunks that respect sentence boundaries and max length
function chunkTextRanges(text, maxLength) {
  const sentences = getSentenceRanges(text);
  if (!sentences.length) {
    return [];
  }

  const chunks = [];
  let current = null;

  sentences.forEach((sentence) => {
    if (!current) {
      current = { start: sentence.start, end: sentence.end };
      return;
    }

    const combinedLength = sentence.end - current.start;
    const currentLength = current.end - current.start;

    // Start a new chunk if we're over halfway to the limit and adding more would exceed it
    if (currentLength >= Math.floor(maxLength * 0.55) && combinedLength > maxLength) {
      chunks.push(current);
      current = { start: sentence.start, end: sentence.end };
      return;
    }

    current.end = sentence.end;
  });

  if (current) {
    chunks.push(current);
  }

  return chunks;
}

// Identify sentence boundaries in text, being careful with abbreviations and punctuation
function getSentenceRanges(text) {
  const ranges = [];
  let start = findNextNonSpace(text, 0, text.length);
  let index = start;

  while (index < text.length) {
    if (isSentenceEnd(text, index)) {
      const end = consumeSentenceEnding(text, index + 1);
      const trimmedEnd = findPreviousNonSpace(text, start, end);

      if (start < trimmedEnd) {
        ranges.push({ start, end: trimmedEnd });
      }

      start = findNextNonSpace(text, end, text.length);
      index = start;
      continue;
    }

    index += 1;
  }

  // Handle any remaining text after the last sentence boundary
  const finalEnd = findPreviousNonSpace(text, start, text.length);
  if (start < finalEnd) {
    ranges.push({ start, end: finalEnd });
  }

  return ranges;
}

// Check if a character position marks the end of a sentence (with abbreviation awareness)
function isSentenceEnd(text, index) {
  const char = text[index];
  if (!/[.!?]/.test(char)) {
    return false;
  }

  // Don't treat periods in abbreviations (Mr., Dr., etc.) as sentence endings
  if (char === "." && isLikelyAbbreviation(text, index)) {
    return false;
  }

  const nextIndex = consumeSentenceEnding(text, index + 1);
  return nextIndex >= text.length || /\s/.test(text[nextIndex]);
}

// Skip over closing punctuation/brackets that might follow a sentence-ending mark
function consumeSentenceEnding(text, index) {
  let next = index;

  while (next < text.length) {
    const char = text[next];

    if (/["')\]]/.test(char)) {
      next += 1;
      continue;
    }

    // Handle citation style brackets like [1], [2], etc.
    if (char === "[" && /^\[\d+\]/.test(text.slice(next))) {
      next += text.slice(next).match(/^\[\d+\]/)[0].length;
      continue;
    }

    break;
  }

  return next;
}

// Heuristic, check if a period is likely part of a common abbreviation
function isLikelyAbbreviation(text, index) {
  const before = text.slice(Math.max(0, index - 12), index + 1);
  return /\b(?:Mr|Mrs|Ms|Dr|Prof|Sr|Jr|St|vs|etc|e\.g|i\.e)\.$/i.test(before) || /\b[A-Z]\.$/.test(before);
}

// Find the next non-whitespace character index in a string range
function findNextNonSpace(text, start, end) {
  let index = start;
  while (index < end && /\s/.test(text[index])) {
    index += 1;
  }
  return index;
}

// Find the previous non-whitespace character index in a string range
function findPreviousNonSpace(text, start, end) {
  let index = end;
  while (index > start && /\s/.test(text[index - 1])) {
    index -= 1;
  }
  return index;
}

// Merge user settings with defaults, handling nested objects and edge cases
function mergeSettings(base, updates) {
  const merged = {
    dyslexia: { ...base.dyslexia, ...(updates.dyslexia || {}) },
    adhd: { ...base.adhd, ...(updates.adhd || {}) }
  };

  merged.dyslexia.fontFamily = normalizeFontFamily(merged.dyslexia.fontFamily);
  // Preserve the default font size if the user explicitly sets it back to 17
  if ((updates.dyslexia || {}).textSize === 17) {
    merged.dyslexia.textSize = base.dyslexia.textSize;
  }
  return merged;
}

// Ensure the font family is one of our supported, accessibility-tested stacks
function normalizeFontFamily(fontFamily) {
  const fontStacks = [
    "OpenDyslexicRegular, OpenDyslexic, Trebuchet MS, Verdana, Arial, sans-serif",
    "Lexend, Trebuchet MS, Verdana, Arial, sans-serif",
    "Atkinson Hyperlegible, Verdana, Arial, sans-serif",
    "Georgia, Times New Roman, serif",
    "Verdana, Arial, sans-serif"
  ];

  if (fontStacks.includes(fontFamily)) {
    return fontFamily;
  }

  // If the user's custom font starts with a known family, use that full stack
  const firstFamily = fontFamily.split(",")[0];
  return fontStacks.find((stack) => stack.split(",")[0] === firstFamily) || DEFAULT_SETTINGS.dyslexia.fontFamily;
}
