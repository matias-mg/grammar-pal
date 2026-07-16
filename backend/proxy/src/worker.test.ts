import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import worker, { type Env } from "./worker"

const aiRunMock = vi.fn()

function makeEnv(overrides: Partial<Env> = {}): Env {
  return {
    AI: { run: aiRunMock } as unknown as Env["AI"],
    RATE_LIMITER: { limit: async () => ({ success: true }) },
    ...overrides
  }
}

function workersAiResponse(payload: unknown): unknown {
  return {
    choices: [{ message: { content: JSON.stringify(payload) } }]
  }
}

const ORIGIN = "chrome-extension://abc123"

describe("polish worker", () => {
  beforeEach(() => {
    aiRunMock.mockReset()
    vi.spyOn(console, "warn").mockImplementation(() => undefined)
  })

  afterEach(() => {
    vi.restoreAllMocks()
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
    const input = "I am living some changes in my life."
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
    aiRunMock.mockResolvedValueOnce(workersAiResponse(payload))
    const req = new Request("https://proxy.test/polish", {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: ORIGIN },
      body: JSON.stringify({ text: input })
    })
    const res = await worker.fetch(req, makeEnv())
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toEqual(payload)
    expect(aiRunMock).toHaveBeenCalledOnce()
    expect(aiRunMock).toHaveBeenCalledWith(
      "@cf/google/gemma-4-26b-a4b-it",
      expect.objectContaining({
        messages: [
          expect.objectContaining({ role: "system" }),
          { role: "user", content: input }
        ],
        temperature: 0,
        max_completion_tokens: 2048,
        chat_template_kwargs: { enable_thinking: false },
        response_format: expect.objectContaining({
          type: "json_schema",
          json_schema: expect.objectContaining({
            name: "polish_result",
            strict: true
          })
        })
      })
    )
  })

  it("502s when Workers AI rejects", async () => {
    aiRunMock.mockRejectedValueOnce(new Error("Workers AI unavailable"))
    const req = new Request("https://proxy.test/polish", {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: ORIGIN },
      body: JSON.stringify({ text: "I am living some changes in my life." })
    })
    const res = await worker.fetch(req, makeEnv())
    expect(res.status).toBe(502)
  })

  it.each([
    ["empty output", { choices: [{ message: { content: null } }] }],
    ["malformed JSON", { choices: [{ message: { content: "not json" } }] }],
    [
      "invalid result shape",
      workersAiResponse({ rewritten: "Rewritten text", changes: "invalid" })
    ]
  ])("502s on %s from Workers AI", async (_name, output) => {
    aiRunMock.mockResolvedValueOnce(output)
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
