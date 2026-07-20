# Grammar Pal

Grammar Pal is a Chrome extension that helps you fix English while you type. It adds clear underlines to normal text fields, shows a small pet that reacts to the number of issues, and offers an optional AI polish for wording that does not sound natural.

The main grammar checker runs on your device. AI polish also tries to run in the browser first. If the browser AI is not available, Grammar Pal can use Gemma 4 through Cloudflare Workers AI.

## What it does

- Checks `<input>`, `<textarea>`, and `[contenteditable]` fields after a short pause.
- Uses red for grammar and spelling, yellow for style and punctuation, and blue for other suggestions.
- Opens a small suggestion box when you click an underline.
- Offers Formal and Chill modes. Chill mode hides some style-heavy suggestions.
- Shows one pet with five expressions, from happy to alarmed, based on the issue count.
- Keeps all extension UI inside a Shadow DOM so page styles do not break it.

It is designed for sites such as X, LinkedIn, Reddit, Gmail compose, and regular comment forms. Google Docs, Notion, Slack desktop, and other canvas or custom editors are not supported.

## How the checks work

Grammar Pal keeps grammar checking and AI polish separate.

### Grammar and spelling

[Harper](https://writewithharper.com/) runs locally as WebAssembly in the extension service worker. It checks text after 400 ms and never sends grammar-check text to a server. This path is always on when the extension is enabled.

### AI polish

AI polish is off by default. When enabled, it improves awkward or non-native English while keeping the original meaning and tone.

1. Grammar Pal first checks for the browser's built-in [Prompt API](https://developer.chrome.com/docs/ai/prompt-api). When the local model is ready, polish runs on the device after a 1.5-second pause.
2. If local AI is missing, unavailable, or still waiting for download, the extension sends the text to your Cloudflare Worker after a 3.5-second pause. The Worker runs Gemma 4 26B A4B through [Cloudflare Workers AI](https://developers.cloudflare.com/workers-ai/).

You can also type `##` at the end of a field to run polish right away. Grammar Pal removes the marker before sending the request. AI changes appear as animated underlines; click one to Accept or Skip it.

Both AI paths use the same prompt and JSON result shape. The extension checks that shape before showing any change.

## Privacy and cost

- Harper grammar checks stay on the device.
- Browser Prompt API polish stays on the device.
- Cloud fallback text is sent to your Cloudflare Worker and processed by Workers AI.
- There is no separate model-provider API key. The Worker uses its `AI` binding.
- The cloud path is limited to five requests per minute in both the extension and Worker. It also skips very short text and small repeat edits.
- Workers AI usage can create charges on the Cloudflare account that owns the Worker.

## Run the extension locally

You need Node.js, pnpm, and a Chromium browser.

```bash
pnpm install
pnpm dev
```

Open `chrome://extensions`, enable Developer mode, choose **Load unpacked**, and select `build/chrome-mv3-dev`.

Create a production build with:

```bash
pnpm build
```

The output is written to `build/chrome-mv3-prod`.

## Set up the cloud fallback

The local browser path works without an extension-side AI key. To support browsers without local AI, deploy the Worker:

```bash
cd backend/proxy
pnpm install
pnpm dev
pnpm deploy
```

Wrangler may ask you to sign in to Cloudflare. Workers AI is connected by the `AI` binding in `wrangler.toml`; no model-provider secret is needed.

Copy the deployed `/polish` URL into a root `.env` file:

```dotenv
PLASMO_PUBLIC_POLISH_URL=https://grammar-pal-polish.<your-subdomain>.workers.dev/polish
```

See [backend/proxy/README.md](backend/proxy/README.md) for endpoint and test details.

## Test

```bash
# Extension unit tests
pnpm test

# Optional Harper evaluation suite
pnpm test:harper:eval

# Worker tests
cd backend/proxy
pnpm test
```

## Developer guide

### Architecture

The content script listens to editable fields once, but it sends work to two independent engines:

- **Harper engine:** local grammar and spelling, 400 ms debounce key `default`.
- **AI polish engine:** opt-in wording help, debounce key `polish`. It selects the browser Prompt API first and Cloudflare Workers AI as fallback.

Each engine has its own debounce key, in-flight request state, abort handling, and overlay state. Harper must never handle polish requests, and AI polish must never create grammar underlines. See [AGENTS.md](AGENTS.md) for the rules maintainers and coding agents must follow.

### Technologies and why they are used

| Technology | Used for | Why |
| --- | --- | --- |
| [Plasmo](https://www.plasmo.com/) | Chrome Manifest V3 extension structure and builds | It handles extension entry points and packaging while keeping the codebase in TypeScript and React. |
| TypeScript strict mode | Extension and Worker code | Shared types make messages, settings, and AI results safer to change. |
| React 18 | Extension popup | The popup has settings that react to storage updates and backend availability. |
| Chrome extension APIs | Messaging and `chrome.storage.local` settings | They provide the MV3 service worker, content scripts, popup state, and local persistence. |
| Shadow DOM | Pet, underlines, popovers, loading state, and modal | It keeps Grammar Pal styles separate from the current website. |
| Harper (`harper.js`) | Always-on grammar and spelling | Its WebAssembly linter runs locally, works offline, and does not need an account or network call. |
| Browser Prompt API (`LanguageModel`) | First choice for AI polish | It runs the browser's downloaded model locally for lower latency and better privacy. |
| Cloudflare Workers AI | Cloud fallback for AI polish | It gives the Worker direct model access through an `AI` binding, without exposing credentials in the extension. |
| Gemma 4 26B A4B | Cloud polish model | It supports structured output and can handle the constrained rewriting task through Workers AI. |
| Cloudflare Workers + Wrangler | `/polish` endpoint, validation, CORS, and rate limiting | The small serverless endpoint keeps cloud controls outside the extension and is easy to test and deploy. |
| Vitest | Unit tests for extension logic and the Worker | It provides fast TypeScript tests with mocks for browser and Workers AI boundaries. |

### Main paths

```text
src/background.ts                 Harper runtime and polish request routing
src/contents/grammar-pal.ts       Editable-field listener and both debounce flows
src/lib/polish-backend.ts         Browser AI detection and session-level backend choice
src/lib/polish-prompt-api.ts      Local Prompt API polish implementation
src/lib/polish-spec.ts            Shared polish prompt and response schema
src/overlay/                      Shadow DOM underlines, popovers, modal, and pet UI
backend/proxy/src/worker.ts        Cloudflare Workers AI fallback endpoint
backend/proxy/src/prompt.ts        Worker copy of the polish prompt and schema
backend/proxy/wrangler.toml        Workers AI and rate-limiter bindings
```

When the polish prompt or response schema changes, update both `src/lib/polish-spec.ts` and `backend/proxy/src/prompt.ts` together.
