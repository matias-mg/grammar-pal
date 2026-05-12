# Grammar Pal

A Chrome (Manifest V3) extension that underlines grammar/style issues in any editable field, lets you click an underline to apply a suggestion, shows a corner pet whose expression tracks your error count, and (opt-in) polishes your writing to native English on demand.

## Features

- Detects typing in `<input>`, `<textarea>`, and `[contenteditable]` fields (including nested compose bodies like Gmail's).
- 400 ms debounce per field, with in-flight requests aborted when you keep typing.
- Underline colors: red (grammar/spelling), yellow (style/punctuation), blue (other).
- Click an underline to see the message and up to five replacements; click one to apply.
- Pet expressions: 0 issues = happy, 1–2 = neutral, 3–4 = curious, 5–7 = concerned, 8+ = alarmed.
- Popup toggles: master Enabled switch and Formal/Chill mode (Chill suppresses style/typography/redundancy categories).
- All injected UI lives in a single open Shadow DOM root on `<html>` — host page styles can't bleed in or out.

## Polish (optional)

A second, opt-in engine that rewrites your text to sound more native by calling Gemini 2.5 Flash-Lite through a self-hosted Cloudflare Worker proxy.

- **Off by default.** Enable in the popup ("Polish to native (uses AI, opt-in)").
- **Two triggers** once enabled:
  1. **3.5-second pause** — when you stop typing for 3.5 s, polish fires (skipped silently if your text changed ≤ 3 % since the last successful polish).
  2. **`##` shortcut** — end the field with `##` and polish fires immediately. The marker is stripped from the field before submission, so it never ends up in your post. Note: technical writing that legitimately ends in `##` (e.g. Markdown headers, code) will also trigger a polish — that's a deliberate trade-off for the fast path.
- **What you see**: a panel anchored to the field with the rewritten preview and one card per change. Each card has Accept / Skip. Bottom row has Accept all / Dismiss.
- **Privacy**: text is sent to Google's AI via the Worker proxy. The Worker holds the API key and rate-limits 20 requests/minute per IP.
- **Setup**: see `backend/proxy/README.md` to deploy the Worker, then set `PLASMO_PUBLIC_POLISH_URL` in a root `.env` (template: `.env.example`).
- **Costs**: every fired event costs a Gemini call. The opt-in toggle, the 3.5 s debounce, the 3 % change-detection gate, and the 10-character minimum exist to keep that in check.

See `CLAUDE.md` for the "Dual-engine architecture" rules — Harper and Gemini are separate engines and must stay that way.

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
- **Polish UX on rapid Worker failures**: if the proxy is down, every trigger surfaces a "Polish unavailable" toast (at most one visible at a time). Disable the toggle to silence.

## Layout

```
src/
  popup.tsx                    # Settings popup (Enabled, Formal/Chill, Polish toggle)
  background.ts                # MV3 SW: Harper engine + polish proxy forwarder
  contents/grammar-pal.ts      # Content-script orchestrator (Harper + Polish triggers)
  lib/
    debounce.ts                # Per-element keyed debounce
    editable.ts                # Classify input/textarea/contenteditable; stripTrailingMarker
    engine.ts                  # Content-script ↔ SW bus for Harper
    engine-polish.ts           # Content-script ↔ SW bus for Polish
    i18n.ts                    # All user-visible strings
    shadow-root.ts             # Single shadow root + injected styles
    storage.ts                 # chrome.storage.local settings
    types.ts                   # Settings, Match, Category
  overlay/
    measure.ts                 # Mirror-div + Range rect measurement
    underlines.ts              # Render and reposition underline spans
    suggestion-popup.ts        # Click-to-apply replacement panel
    apply-replacement.ts       # setRangeText / native setter / execCommand
    polish-panel.ts            # Per-change Accept/Skip/Accept all panel
    polish-toast.ts            # Auto-dismissing error toast
  pet/
    pet.ts                     # Pet mount + expression swap
    pet-state.ts               # bucketFor(count) -> Expression
    expressions.ts             # Five inline SVG faces
  types/polish.ts              # Shared polish result types

backend/proxy/                 # Cloudflare Worker proxy (Gemini key holder)
  src/worker.ts                # POST /polish — rate-limited, validated
  src/prompt.ts                # SYSTEM_PROMPT + RESPONSE_SCHEMA
  src/worker.test.ts           # Vitest unit tests
  wrangler.toml                # Worker config + RATE_LIMITER binding
  README.md                    # Dev / deploy / secret commands
```
