# Lokal Translate

A Figma plugin for translating interface copy into Indian languages without leaving your design file.

It supports multi-frame translation, language-aware font replacement, transliteration, and copy refinement. Sarvam powers translation and transliteration, and a small local backend keeps API keys out of the plugin bundle for refine requests.

## Demo

[Watch the demo video](./assets/demo.mp4)

## Download

Option 1 — Follow the [plugin install and testing guide](https://docs.google.com/document/d/1Gp1UgA_OcZsrs2bpv9uPqmHFBU1xWWMvYEkp5FndL9M/edit?usp=sharing).

Option 2 — Build and load it locally:

```bash
npm install
npm run build
```

Then import the plugin into Figma Desktop:

1. Open Figma Desktop.
2. Go to `Plugins` > `Development` > `Import plugin from manifest...`
3. Choose `manifest.json`.

> Requires Node.js 18 or later and Figma Desktop.

## What It Does

- Translates selected frames in one pass
- Supports English, Hindi, Tamil, Telugu, Kannada, Malayalam, Marathi, Bengali, Punjabi, and Gujarati
- Applies language-specific fonts after translation
- Offers formal, classic, modern, and transliteration output styles
- Refines selected copy through a chat-style workflow

## Local Backend

The backend is optional for UI work, but required for live translation, transliteration, and refine flows.

Create `backend/.env` with:

```env
SARVAM_API_KEY=your_key_here
GEMINI_API_KEY=your_key_here
```

Then start the server:

```bash
node backend/server.mjs
```

The backend runs on `http://127.0.0.1:8787`.

## Development

Use watch mode while working on the plugin:

```bash
npm run watch
```

Main files:

- `src/main.ts` for plugin logic
- `src/ui.tsx` for the interface
- `backend/server.mjs` for secure API proxying

## Notes

- The plugin uses the Figma Plugin API with dynamic page access.
- Network access is limited to Sarvam, Gemini, and Google Fonts as declared in `manifest.json`.
