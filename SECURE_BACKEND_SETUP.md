## API Key Setup

The plugin now uses user-entered API keys directly in the plugin UI:

- Sarvam key for translation
- Gemini key for Refine chat

### Steps

1. Open the plugin.
2. Go to `API Key`.
3. Paste your Sarvam key in the Sarvam field.
4. Paste your Gemini key in the Gemini field.
5. Save.

### Build

```bash
npm run build
```

### Important

- Revoke any leaked Gemini key in Google Cloud before replacing it.
- Remove old leaked keys from git history if they were committed before.
