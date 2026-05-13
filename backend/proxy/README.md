# grammar-pal-polish (Cloudflare Worker proxy)

This Worker holds the Gemini API key and proxies polish-to-native requests
from the Grammar Pal extension. It is the network half of Grammar Pal's
dual-engine architecture — see the root `CLAUDE.md` for the rules that keep
this engine separate from Harper.

## Local dev

```sh
pnpm install
echo "GEMINI_API_KEY=sk-..." > .dev.vars   # gitignored
pnpm dev                                    # wrangler dev on :8787
```

Smoke test against the local dev server:

```sh
curl -X POST http://localhost:8787/polish \
  -H "Content-Type: application/json" \
  -d '{"text":"I am living some changes in my life."}'
```

## Deploy

```sh
wrangler secret put GEMINI_API_KEY        # one-time, sets prod secret
pnpm deploy                                # publishes to *.workers.dev
```

Record the resulting `*.workers.dev` URL and put `<that-url>/polish` into
the extension's root `.env` as `PLASMO_PUBLIC_POLISH_URL`.

## Tests

```sh
pnpm test
```

Covers: 405 on GET, 400 on bad body, 429 on rate limit, 502 on Gemini
error, 200 happy path with stubbed Gemini, OPTIONS preflight.

## Endpoint

`POST /polish`

Request body:
```json
{ "text": "..." }   // ≤ 8000 chars
```

Response body (200):
```json
{
  "rewritten": "...",
  "changes": [
    { "original": "...", "replacement": "...", "reason": "..." }
  ]
}
```

Per-IP rate limit: 5 req/min via Cloudflare's `RATE_LIMITER` binding.
