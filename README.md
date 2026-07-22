# Grammar Pal

Grammar Pal is a Chrome extension that checks your English while you type. It marks possible mistakes, lets you apply a fix with one click, and shows a small pet that reacts to the number of issues it finds.

Grammar and spelling checks run on your device. Optional AI polish also runs in the browser when local AI is available, with Gemma 4 on Cloudflare Workers AI as the fallback.

> Grammar Pal is in testing and is not in the Chrome Web Store yet. Install it from a GitHub Release by following the steps below.

## Install Grammar Pal

It's easy: you do not need any developer tools.

1. Open the [latest Grammar Pal release](https://github.com/matias-mg/grammar-pal/releases/latest).
2. Expand **Assets** if the files are hidden.
3. Download the file named `grammar-pal-vX.Y.Z-chrome.zip`.
4. Extract the downloaded ZIP to a folder you will keep.
5. In Chrome, open `chrome://extensions`.
6. Turn on **Developer mode** in the top-right corner.
7. Click **Load unpacked**.
8. Select the extracted folder that contains `manifest.json`.

Grammar Pal should now appear in Chrome. You can pin it from the Extensions menu for easier access.

> Do not download **Source code (zip)** or **Source code (tar.gz)**. GitHub creates those files automatically for developers; they are not the ready-to-use extension.

## Use Grammar Pal

1. Open the Grammar Pal popup and make sure **Enabled** is on.
2. Choose **Formal** for stricter checks or **Chill** for lighter suggestions.
3. Choose the default **Cat** pal or switch back to the original **Classic** pal.
4. Start typing in a normal text field.
5. Click an underline to read the suggestion and apply a replacement.

Underline colors have simple meanings:

- **Red:** grammar or spelling
- **Yellow:** style or punctuation
- **Blue:** other writing suggestions
- **Animated gradient:** optional AI polish

The selected pet changes expression as the number of writing issues increases. The quiet grey cat is selected by default, and the popup remembers your choice.

### Optional AI polish

Turn on **Polish to native** in the popup when you want help with awkward or non-native wording.

- Grammar Pal uses the browser's local Prompt API first when it is ready.
- If local AI is unavailable, the included cloud fallback uses Gemma 4 through Cloudflare Workers AI.
- Type `##` at the end of a field to run polish immediately. Grammar Pal removes `##` before checking the text.
- Click an AI underline to **Accept** or **Skip** that change.

AI polish is off by default.

## Supported sites

Grammar Pal is designed for standard inputs, textareas, and contenteditable fields. It is tested on:

- X
- LinkedIn
- Reddit
- Gmail compose
- Regular comment and message fields

Google Docs, Notion, Slack desktop, and other canvas or custom editors are not supported yet.

## Privacy

- Harper grammar and spelling checks stay on your device.
- Browser Prompt API polish stays on your device.
- When browser AI is unavailable and AI polish is enabled, only the text being polished is sent to the Grammar Pal Cloudflare Worker and processed by Workers AI.
- The extension does not contain an AI provider key and users do not need to configure one.
- Cloud polish is rate-limited and AI polish can be turned off at any time.

## Update Grammar Pal

Until Grammar Pal is published in the Chrome Web Store, updates are manual:

1. Download the newest `grammar-pal-vX.Y.Z-chrome.zip` from [Releases](https://github.com/matias-mg/grammar-pal/releases).
2. Keep the same Grammar Pal folder you selected during installation.
3. Replace the files inside that folder with the files from the new ZIP. Do not rename or move the folder.
4. Open `chrome://extensions`.
5. Find Grammar Pal and click its **Reload** button.

Keeping the same folder path helps Chrome keep the same unpacked extension ID and local settings.

## Uninstall

Open `chrome://extensions`, find Grammar Pal, and click **Remove**. You can then delete the extracted extension folder.

---

## Developer guide

The rest of this README is for contributors and maintainers. People installing a release can stop here.

### Run locally

Requirements: Node.js, pnpm, and a Chromium browser.

```bash
pnpm install
pnpm dev
```

Open `chrome://extensions`, enable Developer mode, click **Load unpacked**, and select `build/chrome-mv3-dev`.

Create an unpacked production build with:

```bash
pnpm build
```

Create a production build and ZIP with one command:

```bash
pnpm package
```

Outputs:

```text
build/chrome-mv3-prod/
build/chrome-mv3-prod.zip
```

### Configure the cloud fallback

Deploy the Worker once from `backend/proxy/`, then put its public endpoint in the root `.env` file:

```dotenv
PLASMO_PUBLIC_POLISH_URL=https://grammar-pal-polish.<your-subdomain>.workers.dev/polish
```

`PLASMO_PUBLIC_POLISH_URL` is public build configuration, not a credential. Cloudflare authentication and Workers AI access stay in the deployed Worker and are never included in the extension.

For automated releases, add the same value as a GitHub Actions repository variable under **Settings → Secrets and variables → Actions → Variables**.

See [backend/proxy/README.md](backend/proxy/README.md) for Worker development, tests, and deployment.

### Test

```bash
# Extension unit tests
pnpm test

# Optional Harper evaluation suite
pnpm test:harper:eval

# Worker tests
cd backend/proxy
pnpm test
```

### Create a release

The workflow in `.github/workflows/release.yml` runs when a `v*` tag is pushed. It tests the extension, creates the production ZIP, and attaches a clearly named Chrome package to the GitHub Release.

```bash
pnpm release:patch  # 0.2.0 -> 0.2.1
pnpm release:minor  # 0.2.0 -> 0.3.0
pnpm release:major  # 0.2.0 -> 1.0.0
```

To retry an existing tag, open **Actions → Release extension → Run workflow**, enter a tag such as `v0.2.0`, and run it. The workflow can attach or replace the extension ZIP without creating a new version.

If a release shows only GitHub's two Source code downloads, the release workflow did not finish. Open the failed workflow run in the Actions tab to see which step needs attention.

### Architecture

Grammar Pal has two independent product engines connected to one content-script input listener:

- **Harper engine:** local grammar and spelling with a 400 ms debounce key named `default`.
- **AI polish engine:** opt-in wording help with a debounce key named `polish`. It chooses the browser Prompt API first and Cloudflare Workers AI as fallback.

Each engine keeps separate debounce, request, abort, and overlay state. Harper never handles polish requests, and AI polish never produces grammar underlines. See [AGENTS.md](AGENTS.md) for the maintenance rules.

### Technologies and why

| Technology | Used for | Why |
| --- | --- | --- |
| [Plasmo](https://www.plasmo.com/) | Chrome Manifest V3 builds | It handles extension entry points and packaging. |
| TypeScript strict mode | Extension and Worker code | Shared types protect messages, settings, and AI result shapes. |
| React 18 | Extension popup | It keeps settings UI in sync with extension storage. |
| Chrome extension APIs | Service worker, messaging, content scripts, and storage | They provide the browser integration needed by an MV3 extension. |
| Shadow DOM | Pet, underlines, popovers, loading state, and modal | It prevents website styles from breaking extension UI. |
| Harper (`harper.js`) | Grammar and spelling | Its WebAssembly linter runs locally and works offline. |
| Browser Prompt API | First choice for AI polish | It keeps supported polish requests on the device. |
| Cloudflare Workers AI | Cloud polish fallback | The Worker can use a model without placing credentials in the extension. |
| Gemma 4 26B A4B | Cloud polish model | It supports the structured rewriting result required by the UI. |
| Cloudflare Workers and Wrangler | `/polish` endpoint, validation, CORS, and rate limiting | Cloud controls stay outside the extension. |
| Vitest | Extension and Worker tests | It provides fast TypeScript tests and boundary mocks. |
| GitHub Actions and Releases | Test builds and downloadable ZIP files | Each version is reproducible and easy for testers to download. |

### Main paths

```text
src/background.ts                 Harper runtime and polish request routing
src/contents/grammar-pal.ts       Editable-field listener and both debounce flows
src/lib/polish-backend.ts         Browser AI detection and backend selection
src/lib/polish-prompt-api.ts      Local Prompt API polish implementation
src/lib/polish-spec.ts            Shared polish prompt and response schema
src/overlay/                      Shadow DOM UI
backend/proxy/src/worker.ts        Cloudflare Workers AI fallback endpoint
backend/proxy/src/prompt.ts        Worker copy of the polish prompt and schema
.github/workflows/release.yml      Tests, packages, and publishes tagged releases
```

When the polish prompt or response schema changes, update both `src/lib/polish-spec.ts` and `backend/proxy/src/prompt.ts` together.
