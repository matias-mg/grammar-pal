import { RESPONSE_SCHEMA, SYSTEM_PROMPT } from "./prompt"

export type Env = {
  AI: Ai
  RATE_LIMITER?: { limit: (opts: { key: string }) => Promise<{ success: boolean }> }
}

const MAX_INPUT_CHARS = 8000

type PolishChange = {
  original: string
  replacement: string
  reason: string
}

type PolishResult = {
  rewritten: string
  changes: PolishChange[]
}

function corsHeaders(origin: string | null): Record<string, string> {
  const allow =
    origin && origin.startsWith("chrome-extension://") ? origin : "null"
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    Vary: "Origin"
  }
}

function json(
  body: unknown,
  status: number,
  origin: string | null,
  extra: Record<string, string> = {}
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders(origin),
      ...extra
    }
  })
}

function validResult(value: unknown): value is PolishResult {
  if (!value || typeof value !== "object") return false
  const v = value as Record<string, unknown>
  if (typeof v.rewritten !== "string") return false
  if (!Array.isArray(v.changes)) return false
  for (const c of v.changes) {
    if (!c || typeof c !== "object") return false
    const ch = c as Record<string, unknown>
    if (
      typeof ch.original !== "string" ||
      typeof ch.replacement !== "string" ||
      typeof ch.reason !== "string"
    ) {
      return false
    }
  }
  return true
}

const MODEL = "@cf/google/gemma-4-26b-a4b-it"

async function callCloudflareAi(
  text: string,
  ai: Ai
): Promise<PolishResult | null> {
  try {
    const output = await ai.run(MODEL, {
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: text }
      ],
      temperature: 0,
      max_completion_tokens: 2048,

      // Saves latency and output tokens for a straightforward editing task.
      chat_template_kwargs: {
        enable_thinking: false
      },

      response_format: {
        type: "json_schema",
        json_schema: {
          name: "polish_result",
          strict: true,
          schema: RESPONSE_SCHEMA
        }
      }
    })

    const response = output as {
      choices?: Array<{
        message?: { content?: string | null }
      }>
    }

    const raw = response.choices?.[0]?.message?.content
    if (!raw) return null

    const parsed: unknown = JSON.parse(raw)
    return validResult(parsed) ? parsed : null
  } catch (error) {
    console.warn("[polish] Workers AI failure", error)
    return null
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const origin = request.headers.get("Origin")

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(origin) })
    }

    const url = new URL(request.url)
    if (url.pathname !== "/polish") {
      return json({ error: "not_found" }, 404, origin)
    }

    if (request.method !== "POST") {
      return json({ error: "method_not_allowed" }, 405, origin, {
        Allow: "POST, OPTIONS"
      })
    }

    const contentType = request.headers.get("Content-Type") ?? ""
    if (!contentType.toLowerCase().includes("application/json")) {
      return json({ error: "unsupported_media_type" }, 415, origin)
    }

    if (env.RATE_LIMITER) {
      const ip = request.headers.get("cf-connecting-ip") ?? "unknown"
      const { success } = await env.RATE_LIMITER.limit({ key: ip })
      if (!success) {
        return json({ error: "rate_limited" }, 429, origin, { "Retry-After": "60" })
      }
    }

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return json({ error: "invalid_json" }, 400, origin)
    }

    if (!body || typeof body !== "object") {
      return json({ error: "invalid_body" }, 400, origin)
    }
    const text = (body as { text?: unknown }).text
    if (typeof text !== "string") {
      return json({ error: "missing_text" }, 400, origin)
    }
    if (text.length === 0 || text.length > MAX_INPUT_CHARS) {
      return json({ error: "bad_text_length" }, 400, origin)
    }

    const result = await callCloudflareAi(text, env.AI)
    if (!result) {
      return json({ error: "upstream_error" }, 502, origin)
    }
    return json(result, 200, origin)
  }
}
