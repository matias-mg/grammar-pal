import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { check } from "./languagetool"

type StubResponse = {
  matches?: Array<{
    offset: number
    length: number
    message: string
    replacements?: Array<{ value: string }>
    rule?: { id?: string; category?: { id?: string } }
  }>
  language?: {
    code?: string
    detectedLanguage?: { code?: string; confidence?: number }
  }
}

function stubFetch(body: StubResponse, ok = true) {
  return vi.fn(async () =>
    new Response(JSON.stringify(body), {
      status: ok ? 200 : 500,
      headers: { "Content-Type": "application/json" }
    })
  )
}

function lastRequestParams(
  fetchSpy: ReturnType<typeof vi.fn>
): URLSearchParams {
  const call = fetchSpy.mock.calls.at(-1)
  if (!call) throw new Error("fetch was never called")
  const init = call[1] as RequestInit
  return new URLSearchParams(String(init.body))
}

const ENGLISH_RESPONSE: StubResponse = {
  language: {
    code: "en-US",
    detectedLanguage: { code: "en-US", confidence: 0.99 }
  },
  matches: [
    {
      offset: 10,
      length: 4,
      message: "Possible spelling mistake found.",
      replacements: [{ value: "test" }, { value: "tests" }],
      rule: {
        id: "MORFOLOGIK_RULE_EN_US",
        category: { id: "TYPOS" }
      }
    },
    {
      offset: 20,
      length: 5,
      message: "Style suggestion.",
      replacements: [{ value: "concise" }],
      rule: {
        id: "WORDINESS",
        category: { id: "STYLE" }
      }
    }
  ]
}

describe("check()", () => {
  let fetchSpy: ReturnType<typeof vi.fn>

  beforeEach(() => {
    fetchSpy = stubFetch(ENGLISH_RESPONSE)
    vi.stubGlobal("fetch", fetchSpy)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it("sends level=picky in formal mode", async () => {
    await check("I've living in Madrid.", "formal")
    const params = lastRequestParams(fetchSpy)
    expect(params.get("level")).toBe("picky")
  })

  it("sends level=picky in chill mode too", async () => {
    await check("I've living in Madrid.", "chill")
    const params = lastRequestParams(fetchSpy)
    expect(params.get("level")).toBe("picky")
  })

  it("sends the expected base parameters", async () => {
    await check("hello world", "formal")
    const params = lastRequestParams(fetchSpy)
    expect(params.get("text")).toBe("hello world")
    expect(params.get("language")).toBe("auto")
    expect(params.get("preferredVariants")).toBe("en-US")
  })

  it("sets disabledCategories and disabledRules only in chill mode", async () => {
    await check("hello world", "chill")
    const chillParams = lastRequestParams(fetchSpy)
    expect(chillParams.get("disabledCategories")).toContain("CASING")
    expect(chillParams.get("disabledCategories")).toContain("PUNCTUATION")
    expect(chillParams.get("disabledRules")).toContain("UPPERCASE_SENTENCE_START")

    fetchSpy.mockClear()
    await check("hello world", "formal")
    const formalParams = lastRequestParams(fetchSpy)
    expect(formalParams.get("disabledCategories")).toBeNull()
    expect(formalParams.get("disabledRules")).toBeNull()
  })

  it("parses matches and maps categories (TYPOS → grammar, STYLE → style)", async () => {
    const result = await check("some sample text here", "formal")
    expect(result.isEnglish).toBe(true)
    expect(result.matches).toHaveLength(2)

    const typo = result.matches.find((m) => m.offset === 10)
    expect(typo).toBeDefined()
    expect(typo!.length).toBe(4)
    expect(typo!.category).toBe("grammar")
    expect(typo!.replacements).toEqual(["test", "tests"])

    const style = result.matches.find((m) => m.offset === 20)
    expect(style).toBeDefined()
    expect(style!.category).toBe("style")
  })

  it("returns empty matches and isEnglish=false for non-English responses", async () => {
    fetchSpy.mockImplementation(async () =>
      new Response(
        JSON.stringify({
          language: {
            code: "es",
            detectedLanguage: { code: "es", confidence: 0.99 }
          },
          matches: [
            {
              offset: 0,
              length: 3,
              message: "x",
              replacements: [],
              rule: { id: "X", category: { id: "TYPOS" } }
            }
          ]
        } satisfies StubResponse),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    )

    const result = await check("hola mundo", "formal")
    expect(result.isEnglish).toBe(false)
    expect(result.matches).toEqual([])
  })

  it("returns empty result for empty input without calling fetch", async () => {
    const result = await check("", "formal")
    expect(result).toEqual({ matches: [], isEnglish: false })
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it("caps replacements to 5", async () => {
    fetchSpy.mockImplementation(async () =>
      new Response(
        JSON.stringify({
          language: { code: "en-US" },
          matches: [
            {
              offset: 0,
              length: 4,
              message: "spelling",
              replacements: [
                { value: "a" },
                { value: "b" },
                { value: "c" },
                { value: "d" },
                { value: "e" },
                { value: "f" },
                { value: "g" }
              ],
              rule: { id: "X", category: { id: "TYPOS" } }
            }
          ]
        } satisfies StubResponse),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    )

    const result = await check("tets here", "formal")
    const m = result.matches.find((x) => x.offset === 0)
    expect(m!.replacements).toHaveLength(5)
    expect(m!.replacements).toEqual(["a", "b", "c", "d", "e"])
  })

  it("throws on non-OK HTTP response", async () => {
    fetchSpy.mockImplementation(async () =>
      new Response("nope", { status: 503, statusText: "Service Unavailable" })
    )
    await expect(check("hello", "formal")).rejects.toThrow(/503/)
  })
})
