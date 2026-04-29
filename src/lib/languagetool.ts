import type { Category, Match, Mode } from "./types"

const ENDPOINT = "https://api.languagetool.org/v2/check"
const MAX_TEXT_BYTES = 18 * 1024
const MAX_REPLACEMENTS = 5
const CHILL_DISABLED = ["STYLE", "TYPOGRAPHY", "REDUNDANCY"].join(",")

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
  if (mode === "chill") params.set("disabledCategories", CHILL_DISABLED)

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

  const matches = (json.matches ?? []).map((m) => ({
    offset: m.offset,
    length: m.length,
    message: m.message,
    replacements: (m.replacements ?? [])
      .slice(0, MAX_REPLACEMENTS)
      .map((r) => r.value),
    category: categoryFor(m.rule)
  }))

  return { matches, isEnglish: true }
}
