const DEFAULT_SETTINGS = {
  dyslexia: {
    enabled: false,
    fontFamily: "OpenDyslexic, Comic Sans MS, Trebuchet MS, Verdana, Arial, sans-serif",
    textSize: 18,
    lineHeight: 1.6,
    boldRandomWords: false,
    boldFrequency: 16,
    removeDecorations: false,
    textColor: "#727982"
  },
  adhd: {
    enabled: false,
    breakBlocks: true,
    blockLength: 280,
    textColor: "#111111",
    accentColor: "#005fcc"
  }
};

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

bootstrap();

async function bootstrap() {
  currentSettings = await loadSettings();
  applySettings(currentSettings);

  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== "sync" || !changes.settings) {
      return;
    }

    currentSettings = mergeSettings(DEFAULT_SETTINGS, changes.settings.newValue || {});
    applySettings(currentSettings);
  });

  chrome.runtime.onMessage.addListener((message) => {
    if (message?.type === "ACCESS_EASE_SETTINGS_UPDATED") {
      currentSettings = mergeSettings(DEFAULT_SETTINGS, message.settings || {});
      applySettings(currentSettings);
    }
  });
}

async function loadSettings() {
  const stored = await chrome.storage.sync.get("settings");
  return mergeSettings(DEFAULT_SETTINGS, stored.settings || {});
}

function applySettings(settings) {
  restoreTextElementStyles();
  restoreBoldWords();
  restoreSplitParagraphs();

  if (!settings.dyslexia.enabled && !settings.adhd.enabled) {
    removeInjectedStyle();
    document.documentElement.removeAttribute("data-accessease-active");
    return;
  }

  document.documentElement.setAttribute("data-accessease-active", "true");
  injectStyle(buildCss(settings));

  if (settings.adhd.enabled && settings.adhd.breakBlocks) {
    splitLongTextBlocks(settings.adhd.blockLength);
  }

  if (settings.dyslexia.enabled && settings.dyslexia.boldRandomWords) {
    boldRandomWords(settings.dyslexia.boldFrequency);
  }

  applyTextElementStyles(settings);
}

function buildCss(settings) {
  const dyslexia = settings.dyslexia;
  const adhd = settings.adhd;
  const accentColor = adhd.enabled ? adhd.accentColor : "#2f6f65";
  const fontWeight = adhd.enabled ? 600 : 400;

  return `
    html[data-accessease-active] .${TEXT_ELEMENT_CLASS} {
      color: var(--accessease-text-color) !important;
    }

    html[data-accessease-active] a,
    html[data-accessease-active] button,
    html[data-accessease-active] [role="button"] {
      text-decoration-thickness: 0.12em !important;
      text-underline-offset: 0.18em !important;
    }

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

function buildDyslexiaCss(dyslexia) {
  return `
    html[data-accessease-active] .${TEXT_ELEMENT_CLASS} {
      font-family: ${dyslexia.fontFamily} !important;
      font-size: var(--accessease-font-size) !important;
      line-height: ${dyslexia.lineHeight} !important;
      letter-spacing: 0.01em !important;
      text-align: left !important;
    }

    html[data-accessease-active] body *::before,
    html[data-accessease-active] body *::after {
      font-family: ${dyslexia.fontFamily} !important;
      line-height: ${dyslexia.lineHeight} !important;
    }

    html[data-accessease-active] .${BOLD_WORD_CLASS} {
      font-weight: 800 !important;
    }

    ${dyslexia.removeDecorations ? buildDecorationResetCss() : ""}
  `;
}

function buildDecorationResetCss() {
  return `
    html[data-accessease-active] body *:not(script):not(style):not(noscript):not(svg):not(svg *) {
      font-style: normal !important;
      text-decoration-line: none !important;
      text-decoration: none !important;
    }
  `;
}

function buildAdhdCss(accentColor, fontWeight) {
  return `
    html[data-accessease-active] p,
    html[data-accessease-active] li,
    html[data-accessease-active] blockquote,
    html[data-accessease-active] dd {
      max-width: 72ch !important;
      display: block !important;
      margin-top: 0.75em !important;
      margin-bottom: 0.75em !important;
      font-weight: ${fontWeight} !important;
    }

    html[data-accessease-active] .${SPLIT_WRAPPER_CLASS} {
      display: block !important;
      max-width: 72ch !important;
    }

    html[data-accessease-active] .${BLOCK_CLASS} {
      display: block !important;
      max-width: 72ch !important;
      margin-top: 0.75em !important;
      margin-bottom: 0.75em !important;
      padding: 0.55em 0.75em !important;
      border-left: 0.25em solid ${accentColor} !important;
      font-weight: ${fontWeight} !important;
    }

    html[data-accessease-active] h1,
    html[data-accessease-active] h2,
    html[data-accessease-active] h3,
    html[data-accessease-active] h4,
    html[data-accessease-active] h5,
    html[data-accessease-active] h6 {
      border-bottom: 0.08em solid ${accentColor} !important;
      padding-bottom: 0.12em !important;
    }

    html[data-accessease-active] :focus-visible {
      outline: 0.2em solid ${accentColor} !important;
      outline-offset: 0.15em !important;
    }
  `;
}

function injectStyle(css) {
  let style = document.getElementById(STYLE_ID);
  if (!style) {
    style = document.createElement("style");
    style.id = STYLE_ID;
    document.documentElement.append(style);
  }

  style.textContent = css;
}

function removeInjectedStyle() {
  document.getElementById(STYLE_ID)?.remove();
}

function applyTextElementStyles(settings) {
  const textElements = getTextElements();
  const fontScale = settings.dyslexia.enabled ? settings.dyslexia.textSize / 17 : 1;

  textElements.forEach((element) => {
    const computedStyle = getComputedStyle(element);
    const background = getEffectiveBackgroundColor(element);
    const textColor = getReadableTextColor(background, settings);

    element.classList.add(TEXT_ELEMENT_CLASS);
    element.setAttribute(TEXT_ELEMENT_ATTR, "true");
    element.style.setProperty("--accessease-text-color", textColor);

    if (settings.dyslexia.enabled) {
      const originalFontSize = parseFloat(computedStyle.fontSize) || 16;
      const scaledFontSize = Math.max(12, Math.min(42, originalFontSize * fontScale));
      element.style.setProperty("--accessease-font-size", `${scaledFontSize.toFixed(2)}px`);
    } else {
      element.style.removeProperty("--accessease-font-size");
    }
  });
}

function getTextElements() {
  const elements = new Set();
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

  document.querySelectorAll("input, textarea, select, button, [role='button']").forEach((element) => {
    if (element instanceof HTMLElement && isVisibleTextElement(element)) {
      elements.add(element);
    }
  });

  return elements;
}

function isVisibleTextElement(element) {
  const style = getComputedStyle(element);
  return style.display !== "none" && style.visibility !== "hidden" && style.visibility !== "collapse" && Number(style.opacity) !== 0;
}

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

  const bodyColor = parseCssColor(getComputedStyle(document.body).backgroundColor);
  if (bodyColor && bodyColor.alpha > 0) {
    return bodyColor;
  }

  return { red: 255, green: 255, blue: 255, alpha: 1 };
}

function getReadableTextColor(background, settings) {
  const lightness = getRelativeLuminance(background);

  if (settings.adhd.enabled) {
    return lightness > 0.45 ? "#000000" : "#ffffff";
  }

  return lightness > 0.45 ? settings.dyslexia.textColor : "#aeb8c4";
}

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

function getRelativeLuminance(color) {
  const red = normalizeColorChannel(color.red);
  const green = normalizeColorChannel(color.green);
  const blue = normalizeColorChannel(color.blue);
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

function normalizeColorChannel(value) {
  const channel = value / 255;
  return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
}

function restoreTextElementStyles() {
  document.querySelectorAll(`[${TEXT_ELEMENT_ATTR}="true"]`).forEach((element) => {
    element.classList.remove(TEXT_ELEMENT_CLASS);
    element.removeAttribute(TEXT_ELEMENT_ATTR);
    element.style.removeProperty("--accessease-text-color");
    element.style.removeProperty("--accessease-font-size");
  });
}

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

    const textMap = mapTextNodes(element);
    const wrapper = document.createElement("div");
    wrapper.className = SPLIT_WRAPPER_CLASS;
    wrapper.setAttribute(SPLIT_ATTR, "true");
    wrapper.setAttribute(ORIGINAL_ATTR, element.outerHTML);

    chunks.forEach((chunk) => {
      const block = document.createElement("p");
      block.className = [element.className, BLOCK_CLASS].filter(Boolean).join(" ");
      block.append(cloneChunkContent(textMap, chunk, text.slice(chunk.start, chunk.end).trim()));
      wrapper.append(block);
    });

    element.replaceWith(wrapper);
  });
}

function shouldSplitElement(element, maxLength) {
  if (element.closest("nav, header, footer, aside, form, button, select, textarea, pre, code, [contenteditable='true']")) {
    return false;
  }

  if (element.closest(`[${SPLIT_ATTR}="true"]`)) {
    return false;
  }

  if (element.querySelector("button, input, select, textarea, summary, details, iframe, video, audio, table, ul, ol, dl, figure")) {
    return false;
  }

  if (element.querySelector("p, div, section, article, aside, header, footer, blockquote")) {
    return false;
  }

  return element.textContent.trim().length > maxLength;
}

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
    const wordPattern = /[\p{L}\p{N}][\p{L}\p{N}'-]*/gu;
    let lastIndex = 0;
    let hasBoldWord = false;
    let match = wordPattern.exec(text);

    while (match) {
      const word = match[0];
      fragment.append(document.createTextNode(text.slice(lastIndex, match.index)));

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

    if (!hasBoldWord) {
      return;
    }

    fragment.append(document.createTextNode(text.slice(lastIndex)));
    node.replaceWith(fragment);
  });
}

function shouldSkipTextNode(node) {
  const parent = node.parentElement;
  if (!parent) {
    return true;
  }

  return Boolean(parent.closest(`script, style, noscript, svg, canvas, textarea, input, select, option, code, pre, [contenteditable="true"], .${BOLD_WORD_CLASS}`));
}

function shouldBoldWord(word, index, frequency) {
  return hashString(`${location.hostname}:${index}:${word}`) % 100 < frequency;
}

function hashString(value) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash;
}

function restoreBoldWords() {
  document.querySelectorAll(`[${BOLD_ATTR}="true"]`).forEach((span) => {
    span.replaceWith(document.createTextNode(span.textContent));
  });
  document.body?.normalize();
}

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

  const last = textMap[textMap.length - 1];
  if (last && target >= last.end) {
    return { node: last.node, offset: last.node.textContent.length };
  }

  return null;
}

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

  const finalEnd = findPreviousNonSpace(text, start, text.length);
  if (start < finalEnd) {
    ranges.push({ start, end: finalEnd });
  }

  return ranges;
}

function isSentenceEnd(text, index) {
  const char = text[index];
  if (!/[.!?]/.test(char)) {
    return false;
  }

  if (char === "." && isLikelyAbbreviation(text, index)) {
    return false;
  }

  const nextIndex = consumeSentenceEnding(text, index + 1);
  return nextIndex >= text.length || /\s/.test(text[nextIndex]);
}

function consumeSentenceEnding(text, index) {
  let next = index;

  while (next < text.length) {
    const char = text[next];

    if (/["')\]]/.test(char)) {
      next += 1;
      continue;
    }

    if (char === "[" && /^\[\d+\]/.test(text.slice(next))) {
      next += text.slice(next).match(/^\[\d+\]/)[0].length;
      continue;
    }

    break;
  }

  return next;
}

function isLikelyAbbreviation(text, index) {
  const before = text.slice(Math.max(0, index - 12), index + 1);
  return /\b(?:Mr|Mrs|Ms|Dr|Prof|Sr|Jr|St|vs|etc|e\.g|i\.e)\.$/i.test(before) || /\b[A-Z]\.$/.test(before);
}

function findNextNonSpace(text, start, end) {
  let index = start;
  while (index < end && /\s/.test(text[index])) {
    index += 1;
  }
  return index;
}

function findPreviousNonSpace(text, start, end) {
  let index = end;
  while (index > start && /\s/.test(text[index - 1])) {
    index -= 1;
  }
  return index;
}

function mergeSettings(base, updates) {
  const merged = {
    dyslexia: { ...base.dyslexia, ...(updates.dyslexia || {}) },
    adhd: { ...base.adhd, ...(updates.adhd || {}) }
  };

  merged.dyslexia.fontFamily = normalizeFontFamily(merged.dyslexia.fontFamily);
  if ((updates.dyslexia || {}).textSize === 17) {
    merged.dyslexia.textSize = base.dyslexia.textSize;
  }
  return merged;
}

function normalizeFontFamily(fontFamily) {
  const fontStacks = [
    "OpenDyslexic, Comic Sans MS, Trebuchet MS, Verdana, Arial, sans-serif",
    "Lexend, Trebuchet MS, Verdana, Arial, sans-serif",
    "Atkinson Hyperlegible, Verdana, Arial, sans-serif",
    "Georgia, Times New Roman, serif",
    "Verdana, Arial, sans-serif"
  ];

  if (fontStacks.includes(fontFamily)) {
    return fontFamily;
  }

  const firstFamily = fontFamily.split(",")[0];
  return fontStacks.find((stack) => stack.split(",")[0] === firstFamily) || DEFAULT_SETTINGS.dyslexia.fontFamily;
}
