import { runLocalRules } from "./local-rules"
import type { Category, Match, Mode } from "./types"

const ENDPOINT = "https://api.languagetool.org/v2/check"
const MAX_TEXT_BYTES = 18 * 1024
const MAX_REPLACEMENTS = 5
const CHILL_DISABLED_CATEGORIES = [
  "CASING",
  "PUNCTUATION",
].join(",")
const CHILL_DISABLED_RULES = [
  "I_LOWERCASE",
  "UPPERCASE_SENTENCE_START",
  "PUNCTUATION_PARAGRAPH_END",
  "DOUBLE_PUNCTUATION",
  "EN_QUOTES",
  "WHITESPACE_RULE"
].join(",")

type LtRule = {
  id?: string
  category?: { id?: string }
}

type LtMatch = {
  offset: number
  length: number
  message: string
  replacements?: Array<{ value: string }>
  rule?: LtRule
}

type LtResponse = {
  matches?: LtMatch[]
  language?: {
    code?: string
    detectedLanguage?: { code?: string; confidence?: number }
  }
}

export type CheckResult = {
  matches: Match[]
  isEnglish: boolean
}

function truncateUtf8(text: string, maxBytes: number): string {
  const enc = new TextEncoder()
  if (enc.encode(text).length <= maxBytes) return text
  let lo = 0
  let hi = text.length
  while (lo < hi) {
    const mid = (lo + hi + 1) >>> 1
    if (enc.encode(text.slice(0, mid)).length <= maxBytes) lo = mid
    else hi = mid - 1
  }
  return text.slice(0, lo)
}

function categoryFor(rule: LtRule | undefined): Category {
  const id = rule?.category?.id?.toUpperCase() ?? ""
  if (id === "TYPOS" || id === "GRAMMAR") return "grammar"
  if (
    id === "STYLE" ||
    id === "TYPOGRAPHY" ||
    id === "PUNCTUATION" ||
    id === "REDUNDANCY"
  ) {
    return "style"
  }
  return "other"
}

export async function check(
  text: string,
  mode: Mode,
  signal?: AbortSignal
): Promise<CheckResult> {
  const safe = truncateUtf8(text, MAX_TEXT_BYTES)
  if (safe.length === 0) return { matches: [], isEnglish: false }

  const params = new URLSearchParams()
  params.set("text", safe)
  params.set("language", "auto")
  params.set("preferredVariants", "en-US")
  if (mode === "chill") {
    params.set("disabledCategories", CHILL_DISABLED_CATEGORIES)
    params.set("disabledRules", CHILL_DISABLED_RULES)
  }

  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
    signal
  })

  if (!res.ok) {
    throw new Error(`LanguageTool ${res.status} ${res.statusText}`)
  }

  const json = (await res.json()) as LtResponse
  const detected = (
    json.language?.detectedLanguage?.code ??
    json.language?.code ??
    ""
  ).toLowerCase()
  const isEnglish = detected.startsWith("en")

  if (!isEnglish) return { matches: [], isEnglish: false }

  const apiMatches: Match[] = (json.matches ?? []).map((m) => ({
    offset: m.offset,
    length: m.length,
    message: m.message,
    replacements: (m.replacements ?? [])
      .slice(0, MAX_REPLACEMENTS)
      .map((r) => r.value),
    category: categoryFor(m.rule)
  }))

  const localMatches = runLocalRules(safe).filter((local) => {
    const localEnd = local.offset + local.length
    return !apiMatches.some((api) => {
      const apiEnd = api.offset + api.length
      return local.offset < apiEnd && api.offset < localEnd
    })
  })

  const matches = [...apiMatches, ...localMatches].sort(
    (a, b) => a.offset - b.offset
  )

  return { matches, isEnglish: true }
}
