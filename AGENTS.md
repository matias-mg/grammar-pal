# Project: Grammar Pet Extension

## What we're building
A Chrome browser extension (Manifest V3) that:
- Detects when the user types in any input, textarea, or contenteditable element
- Runs **Harper** (Automattic's on-device WASM grammar checker) in the MV3
  service worker on a 400 ms debounce and renders coloured underlines:
  - Red for grammar/spelling errors
  - Yellow for style/punctuation suggestions
  - Blue for everything else
- Pop-up shows replacement suggestions on click
- Floating SVG pet in the corner with 5 expressions tied to error count
  (happy, neutral, curious, concerned, alarmed)
- Mode toggle (Formal/Chill) that adjusts which categories are reported
- **Polish to native English (opt-in, Phase 2)** — runs on a 3500 ms debounce
  or `##` shortcut, sends text to a Cloudflare Worker proxy that calls
  Gemma 4 26B, renders a Shadow-DOM panel with per-change
  Accept / Skip / Accept all / Dismiss controls.

## Stack (locked in — do not deviate)
- Plasmo framework (https://www.plasmo.com)
- TypeScript
- chrome.storage.local for settings
- Harper (`harper.js`) running locally in the MV3 service worker
- Cloudflare Worker proxy (Wrangler, TypeScript) holds the Gemini API key.
  Repo path: `backend/proxy/`.

## Dual-engine architecture (do not conflate)

Grammar Pal runs two engines simultaneously. They are wired into the same
content-script input listener for event-efficiency but are otherwise fully
independent. Never route work across the boundary.

- **Harper** (local WASM, always-on). Lives in `src/background.ts`. Fires on
  the 400 ms debounce (key `"default"`). Produces grammar/spelling
  underlines. No network, no opt-in.
- **Gemini polish** (network, opt-in). Lives in `src/lib/engine-polish.ts`
  + Cloudflare Worker at `backend/proxy/`. Fires on the 3500 ms debounce
  (key `"polish"`) OR the `##` shortcut. Produces the polish panel with
  per-change Accept/Skip controls. Default off.

Hard rules:
1. Harper is never used for polish suggestions.
2. Gemini is never used for grammar underlining.
3. The two engines have independent debounce keys, AbortController maps,
   inflight state, and UI overlays.
4. Deleting one engine must not break the other.

## Out of scope (still)
- User accounts, Stripe, billing
- Firefox/Safari ports
- Pet customization/multiple pets (single pet, 5 expressions only)
- Google Docs and other canvas-based editors

## Conventions
- Use TypeScript strict mode
- Render the pet and overlays in a Shadow DOM to avoid host page CSS bleed
- Never modify the host page's DOM outside the Shadow DOM root
- All user-visible strings in a single i18n file even though we only ship English

## Testing target
Must work on: Twitter/X, LinkedIn, Reddit, Gmail compose textarea, generic blog comments
Explicitly not required to work on: Google Docs, Notion, Slack desktop
