import { RESPONSE_SCHEMA, SYSTEM_PROMPT } from "./prompt"

export type Env = {
  GEMINI_API_KEY: string
  RATE_LIMITER: { limit: (opts: { key: string }) => Promise<{ success: boolean }> }
}

const MAX_INPUT_CHARS = 8000

const GEMINI_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent"

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

async function callGemini(text: string, apiKey: string): Promise<PolishResult | null> {
  const body = {
    contents: [{ role: "user", parts: [{ text }] }],
    systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: RESPONSE_SCHEMA,
      temperature: 0.2,
      maxOutputTokens: 2048
    }
  }
  const res = await fetch(`${GEMINI_URL}?key=${encodeURIComponent(apiKey)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  })
  if (!res.ok) return null
  const data = (await res.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>
  }
  const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw)
    if (!validResult(parsed)) return null
    return parsed
  } catch {
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

    const ip = request.headers.get("cf-connecting-ip") ?? "unknown"
    const { success } = await env.RATE_LIMITER.limit({ key: ip })
    if (!success) {
      return json({ error: "rate_limited" }, 429, origin, { "Retry-After": "60" })
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

    const result = await callGemini(text, env.GEMINI_API_KEY)
    if (!result) {
      return json({ error: "upstream_error" }, 502, origin)
    }
    return json(result, 200, origin)
  }
}
