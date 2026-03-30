# Lokal Translate

Lokal Translate is a Figma plugin for translating interface copy into Indian languages without leaving your design file.

It supports multi-frame translation, language-aware font replacement, transliteration, and copy refinement. Sarvam powers translation and transliteration. A small local backend keeps API keys out of the plugin bundle and handles refine requests.

## What It Does

- Translates selected frames in one pass
- Supports English, Hindi, Tamil, Telugu, Kannada, Malayalam, Marathi, Bengali, Punjabi, and Gujarati
- Applies language-specific fonts after translation
- Offers multiple output styles, including formal, classic, modern, and transliteration
- Refines selected copy through a chat-style workflow

## Setup

### Requirements

- Node.js 18 or later
- Figma Desktop

### Install

```bash
npm install
```

### Build

```bash
npm run build
```

### Load In Figma

1. Open Figma Desktop.
2. Go to `Plugins` > `Development` > `Import plugin from manifest...`
3. Choose [`manifest.json`](/Users/vipulchaudhary/Translate%20copy/manifest.json).

## Local Backend

The backend is optional for basic structure work, but required for live translation, transliteration, and refine flows.

Create `backend/.env` with:

```env
SARVAM_API_KEY=your_key_here
GEMINI_API_KEY=your_key_here
```

Then run:

```bash
node backend/server.mjs
```

The server starts on `http://127.0.0.1:8787`.

## Development

Use watch mode while working on the plugin:

```bash
npm run watch
```

Main files:

- [`src/main.ts`](/Users/vipulchaudhary/Translate%20copy/src/main.ts) for plugin logic
- [`src/ui.tsx`](/Users/vipulchaudhary/Translate%20copy/src/ui.tsx) for the interface
- [`backend/server.mjs`](/Users/vipulchaudhary/Translate%20copy/backend/server.mjs) for secure API proxying

## Notes

- The plugin uses the Figma Plugin API with dynamic page access.
- Network access is limited to Sarvam, Gemini, and Google Fonts as declared in [`manifest.json`](/Users/vipulchaudhary/Translate%20copy/manifest.json).
