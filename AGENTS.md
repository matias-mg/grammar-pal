# Project: Grammar Pet Extension

## What we are building

Grammar Pal is a Chrome Manifest V3 extension that:

- Detects typing in inputs, textareas, and contenteditable elements.
- Runs Harper locally in the MV3 service worker on a 400 ms debounce.
- Renders red grammar/spelling, yellow style/punctuation, and blue other underlines.
- Shows replacement suggestions when an underline is clicked.
- Shows one floating SVG pet with five expressions tied to the issue count.
- Offers Formal and Chill grammar modes.
- Offers opt-in AI polish through the browser Prompt API first, with Cloudflare Workers AI running Gemma 4 26B A4B as the fallback.
- Runs local AI polish on a 1500 ms debounce and cloud polish on a 3500 ms debounce. The `##` shortcut runs the selected polish backend immediately.

## Locked stack

- Plasmo framework
- TypeScript strict mode
- React 18 for the popup
- `chrome.storage.local` for settings and `chrome.storage.session` for the session-level polish backend choice
- Harper (`harper.js`) running locally in the MV3 service worker
- Chromium Prompt API (`LanguageModel`) for local polish
- Cloudflare Worker in `backend/proxy/`, written in TypeScript and managed with Wrangler
- Cloudflare Workers AI `AI` binding using model ID `@cf/google/gemma-4-26b-a4b-it`
- Vitest for extension and Worker unit tests

The `@cf/google/...` value is Cloudflare's required model catalog ID. It does not mean the project calls a model provider directly. Do not replace the catalog ID unless the Workers AI model changes.

## Engine architecture: do not mix the boundaries

Grammar Pal has two product engines. They share one content-script input listener for efficiency but are otherwise independent.

### Harper grammar engine

- Lives mainly in `src/background.ts`.
- Runs locally and is always on when Grammar Pal is enabled.
- Uses the 400 ms debounce key `default`.
- Produces grammar, spelling, style, and punctuation underlines.
- Does not use AI polish or the network.

### AI polish engine

- Lives in `src/lib/engine-polish.ts`, `src/lib/polish-backend.ts`, `src/lib/polish-prompt-api.ts`, and `backend/proxy/`.
- Is opt-in and off by default.
- Uses the debounce key `polish` or the `##` shortcut.
- Tries the browser Prompt API first. If local AI is unavailable or not ready, it uses the Cloudflare Worker and Workers AI.
- Produces AI polish underlines and per-change Accept/Skip controls.

Hard rules:

1. Harper is never used for polish suggestions.
2. The browser Prompt API and Workers AI are never used for grammar underlining.
3. Grammar and polish keep separate debounce keys, AbortController maps, in-flight state, and overlay state.
4. The two polish backends must return the same `PolishResult` shape. Keep `src/lib/polish-spec.ts` and `backend/proxy/src/prompt.ts` in sync.
5. Never add a direct model-provider API key to the extension. Workers AI access must stay behind the Cloudflare `AI` binding.
6. Removing or changing one engine must not break the other.

## Documentation sync rule

If asked to replace a technology, AI model, AI provider, framework, or service, update every affected Markdown file in the same change. At minimum, check `README.md`, `AGENTS.md`, and Markdown files inside the changed package. Search the full repository for old names and remove stale setup, privacy, architecture, and credential instructions. Keep required external identifiers only when the active platform needs them, and explain why they remain.

## Out of scope

- User accounts, billing, and Stripe
- Firefox or Safari ports
- Pet customization or multiple pets
- Google Docs and other canvas-based editors

## Conventions

- Keep TypeScript in strict mode.
- Render extension UI in a Shadow DOM to prevent host-page CSS bleed.
- Do not inject Grammar Pal UI outside the Shadow DOM root. Text changes requested by the user may still update the active editable field.
- Keep all user-visible strings in `src/lib/i18n.ts`.
- Preserve the local-first order: Prompt API before Workers AI.
- Keep AI polish off by default.

## Testing targets

Must work on X, LinkedIn, Reddit, Gmail compose, and normal blog comment fields.

Google Docs, Notion, Slack desktop, and other canvas or custom editors are not required.
