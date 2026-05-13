/**
 * Harper evaluation — does Automattic's on-device WASM grammar checker
 * cover the cases where LanguageTool's free tier fell short?
 *
 * Run with:  RUN_HARPER=1 pnpm test:harper
 *
 * Skipped by default because instantiating Harper compiles the curated
 * dictionary and loads ~5MB of WASM — slow for a watch-mode unit run.
 */
import { beforeAll, describe, expect, it } from "vitest"

// binaryInlined embeds the WASM as a data URL — avoids a Windows-path bug in
// harper.js/binary that prepends "C:\" to an already-absolute file URL.
import { binaryInlined } from "harper.js/binaryInlined"
import { Dialect, LocalLinter } from "harper.js"

const TIMEOUT_MS = 60_000
const RUN = process.env.RUN_HARPER === "1"

type Snapshot = {
  start: number
  end: number
  problem: string
  kind: string
  message: string
  suggestions: string[]
}

let linter: LocalLinter

async function lintSnapshot(text: string): Promise<Snapshot[]> {
  const lints = await linter.lint(text, { language: "plaintext" })
  return lints.map((l) => {
    const span = l.span()
    return {
      start: span.start,
      end: span.end,
      problem: l.get_problem_text(),
      kind: l.lint_kind_pretty(),
      message: l.message(),
      suggestions: l.suggestions().map((s) => s.get_replacement_text())
    }
  })
}

function fmt(s: Snapshot): string {
  const reps = s.suggestions.slice(0, 4).join(" | ") || "(none)"
  return `[${s.start}-${s.end}] "${s.problem}" kind=${s.kind} → ${reps}  // ${s.message}`
}

function print(label: string, text: string, snapshots: Snapshot[]): void {
  console.log(`\n--- ${label} ---`)
  console.log(`text: ${text}`)
  console.log(`matches: ${snapshots.length}`)
  for (const s of snapshots) console.log("  " + fmt(s))
}

function covers(s: Snapshot, target: string, full: string): boolean {
  const idx = full.toLowerCase().indexOf(target.toLowerCase())
  if (idx < 0) return false
  const tEnd = idx + target.length
  // Overlap test, not containment — Harper may pick a wider/narrower span.
  return s.start <= tEnd && s.end >= idx
}

describe.skipIf(!RUN)("Harper evaluation (LocalLinter, American English)", () => {
  beforeAll(async () => {
    linter = new LocalLinter({ binary: binaryInlined, dialect: Dialect.American })
    await linter.setup()
  }, TIMEOUT_MS)

  it(
    "screenshot sentence: flags spelling + ideally I've living / 20 year",
    async () => {
      const text =
        "this is a test. I've living around this tets for +20 year from nauw."
      const snaps = await lintSnapshot(text)
      print("screenshot sentence", text, snaps)

      // Spelling — LT already caught these, Harper should too.
      expect(snaps.some((s) => covers(s, "tets", text))).toBe(true)
      expect(snaps.some((s) => covers(s, "nauw", text))).toBe(true)
    },
    TIMEOUT_MS
  )

  it(
    "perfect-progressive: I've living in Madrid since 2020",
    async () => {
      const text = "I've living in Madrid since 2020."
      const snaps = await lintSnapshot(text)
      print("I've living", text, snaps)
      const flagged = snaps.some(
        (s) => covers(s, "I've living", text) || covers(s, "living", text)
      )
      expect(flagged, "expected Harper to flag 'I've living'").toBe(true)
    },
    TIMEOUT_MS
  )

  it(
    "subject-verb + number agreement: He have 20 year of experience",
    async () => {
      const text = "He have 20 year of experience."
      const snaps = await lintSnapshot(text)
      print("He have 20 year", text, snaps)
      const flagsHave = snaps.some((s) => covers(s, "have", text))
      const flagsYear = snaps.some(
        (s) => covers(s, "20 year", text) || covers(s, "year", text)
      )
      expect(flagsHave, "expected Harper to flag 'have' (subject-verb)").toBe(
        true
      )
      // '20 year' (number-noun agreement) is a documented gap — neither LT
      // free nor Harper catch it. Logged for visibility, not asserted.
      console.log(`  number-agreement '20 year' flagged: ${flagsYear}`)
    },
    TIMEOUT_MS
  )

  it(
    "modal-of: could of done it better",
    async () => {
      const text = "could of done it better"
      const snaps = await lintSnapshot(text)
      print("could of", text, snaps)
      expect(snaps.some((s) => covers(s, "could of", text))).toBe(true)
    },
    TIMEOUT_MS
  )

  it(
    "Spanish-English false friend: 'are you living some changes' (exploratory)",
    async () => {
      const text = "In your life, are you living some changes?"
      const snaps = await lintSnapshot(text)
      print("living some changes (idiomatic)", text, snaps)
      // No assertion — rule-based checkers don't catch collocation issues
      // like this. We just want to see what (if anything) Harper says.
    },
    TIMEOUT_MS
  )

  it(
    "common English typos sweep (exploratory — prints findings)",
    async () => {
      const cases: Array<{ label: string; text: string }> = [
        { label: "alot", text: "There were alot of people at the party." },
        { label: "definately", text: "I will definately be there." },
        { label: "their are", text: "Their are many reasons to go." },
        { label: "your welcome", text: "Your welcome to join us." },
        { label: "i seen", text: "I seen him at the store yesterday." },
        { label: "should of", text: "You should of told me sooner." },
        { label: "would of", text: "I would of gone if I knew." },
        { label: "its vs it's", text: "The dog wagged it's tail." },
        { label: "loose/lose", text: "Don't loose your keys again." },
        { label: "then/than", text: "She is taller then her brother." },
        { label: "affect/effect", text: "How will this effect the outcome?" },
        { label: "less/fewer", text: "There are less cars on the road." }
      ]

      for (const c of cases) {
        const snaps = await lintSnapshot(c.text)
        print(`typo: ${c.label}`, c.text, snaps)
      }
      // No hard assertions — this is a coverage probe. The console output
      // is the data we judge on.
    },
    TIMEOUT_MS
  )

  it(
    "clean sentence should produce zero lints",
    async () => {
      const text = "The quick brown fox jumps over the lazy dog."
      const snaps = await lintSnapshot(text)
      print("clean sentence", text, snaps)
      expect(snaps.length).toBe(0)
    },
    TIMEOUT_MS
  )
})
