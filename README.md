# Lokal Translate

A Figma plugin for translating selected copy, refining text, and swapping fonts without leaving your design file.

It is built around three workflows inside the plugin: `Translate`, `Ask`, and `Swap`.

## Demo

[Watch the demo video](./demo.mp4)

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

## Setup

On first use, add your API keys from the plugin UI:

- Sarvam API key for translation, transliteration, and bulk translate
- Gemini API key for `Ask`

The keys are saved in Figma client storage for the plugin.

## What It Does

- Translates selected frames, groups, sections, components, instances, and text layers
- Can also translate only a highlighted text range inside a text layer
- Supports English, Hindi, Tamil, Telugu, Kannada, Malayalam, Marathi, Bengali, Punjabi, and Gujarati
- Offers `Default`, `Formal`, `Classic`, `Modern`, and `Translit` translation styles
- Creates bulk language versions from the current selection
- Refines selected copy in the `Ask` tab and can apply the result back into the layer
- Swaps selected text to a target font in the `Swap` tab
- Saves per-language font preferences
- Saves style mappings so translated text can match target text styles in the file
- Caches translations, preferences, and refine history in plugin storage

## Notes

- `Bulk Translate` works with a saved subset of Indian languages that you can configure in the plugin.
- `Assume English` skips source-language detection and is useful when your selected text is already English.
- Rename a layer or container to `dnd` to keep the original text and only apply target font or style mapping.
- Rename a layer or container to `lma` to leave it fully untouched.
- `Ask` works on one text layer or one highlighted text range at a time.
- Style swapping after translation is limited to single-style text layers when restyling already translated text.

## Development

Use watch mode while working on the plugin:

```bash
npm run watch
```

Main files:

- `src/main.ts` for plugin logic
- `src/ui.tsx` for the interface
- `manifest.json` for Figma permissions and network access
