# Grammar Pal

A Chrome (Manifest V3) extension that underlines LanguageTool grammar/style issues in any editable field, lets you click to apply suggestions, and pairs it all with a corner pet that reacts to your error count.

Phase 1 prototype. No backend, no LLM, no accounts.

## Develop

```bash
pnpm install
pnpm dev
```

Then in Chrome: `chrome://extensions` → Developer mode → **Load unpacked** → select `build/chrome-mv3-dev`.

## Build

```bash
pnpm build
```

Production output lands in `build/chrome-mv3-prod`.
