import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import worker, { type Env } from "./worker"

function makeEnv(overrides: Partial<Env> = {}): Env {
  return {
    GEMINI_API_KEY: "test-key",
    RATE_LIMITER: { limit: async () => ({ success: true }) },
    ...overrides
  } as Env
}

function geminiResponse(payload: unknown): Response {
  return new Response(
    JSON.stringify({
      candidates: [{ content: { parts: [{ text: JSON.stringify(payload) }] } }]
    }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  )
}

const ORIGIN = "chrome-extension://abc123"

describe("polish worker", () => {
  const fetchMock = vi.fn()
  beforeEach(() => {
    fetchMock.mockReset()
    vi.stubGlobal("fetch", fetchMock)
  })
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("405s on GET", async () => {
    const req = new Request("https://proxy.test/polish", {
      method: "GET",
      headers: { Origin: ORIGIN }
    })
    const res = await worker.fetch(req, makeEnv())
    expect(res.status).toBe(405)
  })

  it("400s on missing text", async () => {
    const req = new Request("https://proxy.test/polish", {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: ORIGIN },
      body: JSON.stringify({})
    })
    const res = await worker.fetch(req, makeEnv())
    expect(res.status).toBe(400)
  })

  it("400s on oversize text", async () => {
    const req = new Request("https://proxy.test/polish", {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: ORIGIN },
      body: JSON.stringify({ text: "a".repeat(8001) })
    })
    const res = await worker.fetch(req, makeEnv())
    expect(res.status).toBe(400)
  })

  it("429s when rate limit fails", async () => {
    const env = makeEnv({
      RATE_LIMITER: { limit: async () => ({ success: false }) }
    })
    const req = new Request("https://proxy.test/polish", {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: ORIGIN },
      body: JSON.stringify({ text: "hello there" })
    })
    const res = await worker.fetch(req, env)
    expect(res.status).toBe(429)
    expect(res.headers.get("Retry-After")).toBe("60")
  })

  it("returns 200 with rewritten + changes on happy path", async () => {
    const payload = {
      rewritten: "I am experiencing some changes in my life.",
      changes: [
        {
          original: "living some changes",
          replacement: "experiencing some changes",
          reason: "More idiomatic for going through changes."
        }
      ]
    }
    fetchMock.mockResolvedValueOnce(geminiResponse(payload))
    const req = new Request("https://proxy.test/polish", {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: ORIGIN },
      body: JSON.stringify({ text: "I am living some changes in my life." })
    })
    const res = await worker.fetch(req, makeEnv())
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toEqual(payload)
  })

  it("502s when Gemini returns non-OK", async () => {
    fetchMock.mockResolvedValueOnce(new Response("nope", { status: 500 }))
    const req = new Request("https://proxy.test/polish", {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: ORIGIN },
      body: JSON.stringify({ text: "I am living some changes in my life." })
    })
    const res = await worker.fetch(req, makeEnv())
    expect(res.status).toBe(502)
  })

  it("handles OPTIONS preflight", async () => {
    const req = new Request("https://proxy.test/polish", {
      method: "OPTIONS",
      headers: { Origin: ORIGIN }
    })
    const res = await worker.fetch(req, makeEnv())
    expect(res.status).toBe(204)
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe(ORIGIN)
  })
})
