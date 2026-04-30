# Grammar Pal

A Chrome (Manifest V3) extension that underlines LanguageTool grammar/style issues in any editable field, lets you click an underline to apply a suggestion, and shows a corner pet whose expression tracks your error count.

Phase 1 prototype. No backend, no LLM, no accounts.

## Features

- Detects typing in `<input>`, `<textarea>`, and `[contenteditable]` fields (including nested compose bodies like Gmail's).
- 1500 ms debounce per field, with in-flight requests aborted when you keep typing.
- Underline colors: red (grammar/spelling), yellow (style/punctuation), blue (other).
- Click an underline to see the LanguageTool message and up to five replacements; click one to apply.
- Pet expressions: 0 issues = happy, 1–2 = neutral, 3–4 = curious, 5–7 = concerned, 8+ = alarmed.
- Popup toggles: master Enabled switch and Formal/Chill mode (Chill suppresses style/typography/redundancy categories).
- All injected UI lives in a single open Shadow DOM root on `<html>` — host page styles can't bleed in or out.

## Install (development)

```bash
pnpm install
pnpm dev
```

In Chrome: open `chrome://extensions`, turn on Developer mode, click **Load unpacked**, and select `build/chrome-mv3-dev`.

## Build (production)

```bash
pnpm build
```

Output is `build/chrome-mv3-prod`. Load it the same way to sideload, or zip it for distribution.

## Tested on

Twitter/X, LinkedIn, Reddit, Gmail compose, generic blog comment textareas.

## Known limitations

- **Google Docs, Notion, Slack desktop**: not supported. These use canvas or custom editors that don't expose standard editable elements.
- **Firefox/Safari**: not built. Chrome MV3 only.
- **LanguageTool public API**: rate-limited to roughly 20 requests per minute per IP and ~20 KB per text. The 1500 ms debounce keeps normal typing well under that, and we truncate text to 18 KB before sending. Heavy editing on multiple tabs at once may hit the cap; in that case the next check will silently fail and surface as a `[grammar-pal] check failed` warning in the page console.
- **Phase 1 only**: no LLM, no accounts, no Stripe, no Firefox port. See `CLAUDE.md` for what's deferred.

## Layout

```
src/
  popup.tsx                  # Settings popup (Enabled, Formal/Chill)
  contents/grammar-pal.ts    # Content-script orchestrator
  lib/
    debounce.ts              # Per-element WeakMap debounce
    editable.ts              # Classify input/textarea/contenteditable targets
    i18n.ts                  # All user-visible strings
    languagetool.ts          # LT API client + category mapping
    shadow-root.ts           # Single shadow root + injected styles
    storage.ts               # chrome.storage.local settings
    types.ts                 # Settings, Match, Category
  overlay/
    measure.ts               # Mirror-div + Range rect measurement
    underlines.ts            # Render and reposition underline spans
    suggestion-popup.ts      # Click-to-apply replacement panel
    apply-replacement.ts     # setRangeText / native setter / execCommand
  pet/
    pet.ts                   # Pet mount + expression swap
    pet-state.ts             # bucketFor(count) -> Expression
    expressions.ts           # Five inline SVG faces
```
