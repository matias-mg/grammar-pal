import { describe, expect, it } from "vitest"

import { check } from "./languagetool"

const ENDPOINT = "https://api.languagetool.org/v2/check"
const TIMEOUT_MS = 20_000

type RawMatch = {
  offset: number
  length: number
  message: string
  rule?: { id?: string; category?: { id?: string } }
  replacements?: Array<{ value: string }>
}

type RawResponse = {
  matches?: RawMatch[]
}

async function rawCheck(
  text: string,
  { picky }: { picky: boolean }
): Promise<RawMatch[]> {
  const params = new URLSearchParams()
  params.set("text", text)
  params.set("language", "auto")
  params.set("preferredVariants", "en-US")
  if (picky) params.set("level", "picky")

  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString()
  })
  if (!res.ok) {
    throw new Error(`LT ${res.status} ${res.statusText}`)
  }
  const json = (await res.json()) as RawResponse
  return json.matches ?? []
}

function fmt(m: RawMatch, text: string): string {
  const span = text.slice(m.offset, m.offset + m.length)
  const rule = m.rule?.id ?? "?"
  const cat = m.rule?.category?.id ?? "?"
  const reps = (m.replacements ?? []).slice(0, 3).map((r) => r.value).join(" | ")
  return `[${m.offset}+${m.length}] "${span}"  rule=${rule} cat=${cat}  → ${reps}`
}

function covers(m: { offset: number; length: number }, target: string, full: string): boolean {
  const idx = full.toLowerCase().indexOf(target.toLowerCase())
  if (idx < 0) return false
  const tEnd = idx + target.length
  const mEnd = m.offset + m.length
  return m.offset <= tEnd && mEnd >= idx
}

const RUN = process.env.RUN_INTEGRATION === "1"

describe.skipIf(!RUN)("LanguageTool live API (picky mode)", () => {
  it(
    "still detects spelling mistakes from the screenshot sentence",
    async () => {
      const sentence =
        "this is a test. I've living around this tets for +20 year from nauw."
      const result = await check(sentence, "formal")
      console.log("\n--- screenshot sentence (picky, via check()) ---")
      console.log(`text: ${sentence}`)
      for (const m of result.matches) {
        const span = sentence.slice(m.offset, m.offset + m.length)
        console.log(
          `[${m.offset}+${m.length}] "${span}"  cat=${m.category}  → ${m.replacements.slice(0, 3).join(" | ")}`
        )
      }

      const hasTets = result.matches.some((m) => covers(m, "tets", sentence))
      const hasNauw = result.matches.some((m) => covers(m, "nauw", sentence))
      expect(hasTets, "expected 'tets' to be flagged").toBe(true)
      expect(hasNauw, "expected 'nauw' to be flagged").toBe(true)
    },
    TIMEOUT_MS
  )

  it(
    "flags perfect-progressive miss: I've living",
    async () => {
      const sentence = "I've living in Madrid since 2020."
      const matches = await rawCheck(sentence, { picky: true })
      console.log("\n--- 'I've living' (picky) ---")
      console.log(`text: ${sentence}`)
      for (const m of matches) console.log(fmt(m, sentence))
      const flagged = matches.some((m) => covers(m, "I've living", sentence) || covers(m, "living", sentence))
      expect(flagged, "expected LT picky to flag 'I've living'").toBe(true)
    },
    TIMEOUT_MS
  )

  it(
    "flags subject-verb and number agreement: He have 20 year",
    async () => {
      const sentence = "He have 20 year of experience."
      const matches = await rawCheck(sentence, { picky: true })
      console.log("\n--- 'He have 20 year' (picky) ---")
      console.log(`text: ${sentence}`)
      for (const m of matches) console.log(fmt(m, sentence))
      const flagsHave = matches.some((m) => covers(m, "have", sentence))
      const flagsYear = matches.some((m) => covers(m, "20 year", sentence) || covers(m, "year", sentence))
      // Both should be caught; report each separately so we can see which fails.
      expect(flagsHave, "expected LT picky to flag 'have' (subject-verb)").toBe(true)
      expect(flagsYear, "expected LT picky to flag '20 year' (number agreement)").toBe(true)
    },
    TIMEOUT_MS
  )

  it(
    "flags modal-of: could of done it better",
    async () => {
      const sentence = "could of done it better"
      const matches = await rawCheck(sentence, { picky: true })
      console.log("\n--- 'could of' (picky) ---")
      console.log(`text: ${sentence}`)
      for (const m of matches) console.log(fmt(m, sentence))
      const flagged = matches.some((m) => covers(m, "could of", sentence))
      expect(flagged, "expected LT picky to flag 'could of'").toBe(true)
    },
    TIMEOUT_MS
  )

  it(
    "picky finds at least as many issues as the default level (screenshot sentence)",
    async () => {
      const sentence =
        "this is a test. I've living around this tets for +20 year from nauw."
      const [picky, plain] = await Promise.all([
        rawCheck(sentence, { picky: true }),
        rawCheck(sentence, { picky: false })
      ])
      console.log("\n--- picky vs plain (screenshot) ---")
      console.log(`text: ${sentence}`)
      console.log(`plain matches: ${plain.length}`)
      for (const m of plain) console.log("  plain " + fmt(m, sentence))
      console.log(`picky matches: ${picky.length}`)
      for (const m of picky) console.log("  picky " + fmt(m, sentence))
      const onlyInPicky = picky.filter(
        (p) =>
          !plain.some(
            (q) => q.offset === p.offset && q.length === p.length && q.rule?.id === p.rule?.id
          )
      )
      console.log(`new in picky: ${onlyInPicky.length}`)
      for (const m of onlyInPicky) console.log("  +picky " + fmt(m, sentence))
      expect(picky.length).toBeGreaterThanOrEqual(plain.length)
    },
    TIMEOUT_MS
  )
})
