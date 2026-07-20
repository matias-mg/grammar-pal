# Grammar Pal polish Worker

This Cloudflare Worker is the cloud fallback for Grammar Pal's optional AI polish. The extension calls `POST /polish`, and the Worker runs Gemma 4 26B A4B through the Cloudflare Workers AI `AI` binding.

No model-provider API key is used. The model ID in `src/worker.ts` starts with `@cf/google/` because that is its required Cloudflare Workers AI catalog ID.

## Local development

```bash
pnpm install
pnpm dev
```

Wrangler may ask you to sign in to Cloudflare. The `AI` binding uses a remote Workers AI resource during development, so local requests can count toward Workers AI usage.

Smoke test the local endpoint:

```bash
curl -X POST http://localhost:8787/polish \
  -H "Content-Type: application/json" \
  -d '{"text":"I am living some changes in my life."}'
```

## Deploy

```bash
pnpm deploy
```

Add the deployed URL to the extension's root `.env` file:

```dotenv
PLASMO_PUBLIC_POLISH_URL=https://grammar-pal-polish.<your-subdomain>.workers.dev/polish
```

The Worker needs the `AI` and `RATE_LIMITER` bindings declared in `wrangler.toml`. It does not need a model-provider secret.

## Test

```bash
pnpm test
```

The suite covers method and body validation, rate limiting, Workers AI failures and invalid output, a successful structured result, and CORS preflight.

## Endpoint

`POST /polish`

Request:

```json
{ "text": "..." }
```

Text must contain 1 to 8,000 characters.

Successful response:

```json
{
  "rewritten": "...",
  "changes": [
    {
      "original": "...",
      "replacement": "...",
      "reason": "..."
    }
  ]
}
```

The endpoint accepts Chrome extension origins, validates the Workers AI result before returning it, and limits each IP to five requests per minute.
