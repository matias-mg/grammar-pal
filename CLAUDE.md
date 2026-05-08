# Project: Grammar Pet Extension

## What we're building
A Chrome browser extension (Manifest V3) that:
- Detects when the user types in any input, textarea, or contenteditable element
- Debounces input (~1500ms) and sends text to LanguageTool's public API
  (https://api.languagetool.org/v2/check)
- Shows colored underlines on detected issues:
  - Red for grammar/spelling errors (TYPOS, GRAMMAR categories)
  - Yellow for style/punctuation suggestions
  - Blue for everything else
- Pop-up shows replacement suggestions on click
- Floating SVG pet in the corner with 5 expressions tied to error count
  (happy, neutral, curious, concerned, alarmed)
- Mode toggle (Formal/Chill) that adjusts which LanguageTool categories are sent

## Stack (locked in — do not deviate)
- Plasmo framework (https://www.plasmo.com)
- TypeScript
- chrome.storage.local for settings
- No backend, no auth, no payments — this is Phase 1 prototype only
- LanguageTool public API directly from the content script

## Out of scope for Phase 1
- LLM integration (Phase 2 only, behind paywall)
- User accounts, Stripe, billing
- Self-hosted LanguageTool server
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