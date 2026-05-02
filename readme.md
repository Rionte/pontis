# Pontis

A Chrome extension that adds configurable reading support for dyslexia and ADHD.

## Features

- Collapsible popup settings panel with automatic saving through `chrome.storage.sync`
- Dyslexia mode with configurable font, text size, line spacing, background color, text color, random bold words, and optional italic/underline removal
- ADHD mode with configurable high-contrast colors, focus outlines, accent color, and long paragraphs split into separate paragraphs
- Live updates on the active tab when settings change

## Install Locally

1. Open Chrome and go to `chrome://extensions`.
2. Turn on **Developer mode**.
3. Choose **Load unpacked**.
4. Select the folder.

The extension popup will appear in the Chrome toolbar after loading.

## Font Note

The popup offers dyslexia-friendly font stacks including OpenDyslexic and Lexend. If those fonts are not installed on the user's system, the extension falls back to Atkinson Hyperlegible, Verdana, Arial, and the browser default sans-serif font.
