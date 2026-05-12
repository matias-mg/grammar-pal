// This service worker hosts the HARPER engine (local WASM, always-on grammar
// underlining). It also forwards POLISH requests to the Cloudflare Worker
// proxy. The two engines are independent — never route Harper through Gemini,
// or polish through Harper. See CLAUDE.md "Dual-engine architecture".
//
// Parcel (Plasmo's bundler) doesn't resolve the harper.js package.json
// "exports" map cleanly — neither the bare specifier nor subpath like
// "harper.js/binaryInlined" works. Import the dist files directly.
import { Dialect, LocalLinter, type Lint } from "harper.js/dist/index.js"
import { binaryInlined } from "harper.js/dist/binaryInlined.js"

import type { LintRequest, LintResponse } from "./lib/engine"
import type { PolishRequest } from "./lib/engine-polish"
import { runLocalRules } from "./lib/local-rules"
import type { Category, Match } from "./lib/types"
import type { PolishResult } from "./types/polish"

const MAX_TEXT_LENGTH = 12_000
const MIN_TEXT_LENGTH = 5

const linter = new LocalLinter({
  binary: binaryInlined,
  dialect: Dialect.American
})

let setupPromise: Promise<void> | null = null

function ensureSetup(): Promise<void> {
  if (setupPromise) return setupPromise
  setupPromise = linter.setup()
  return setupPromise
}

function categoryForHarper(kind: string): Category {
  switch (kind) {
    case "Spelling":
    case "Agreement":
    case "Grammar":
    case "BoundaryError":
    case "Capitalization":
    case "Word Choice":
    case "Miscellaneous":
      return "grammar"
    case "Punctuation":
    case "Wordiness":
    case "Style":
    case "Repetition":
      return "style"
    default:
      return "other"
  }
}

function toMatch(lint: Lint): Match {
  const span = lint.span()
  const suggestions = lint.suggestions().map((s) => s.get_replacement_text())
  return {
    offset: span.start,
    length: span.end - span.start,
    message: lint.message(),
    replacements: suggestions.slice(0, 5),
    category: categoryForHarper(lint.lint_kind_pretty())
  }
}

function mergeWithLocalRules(harperMatches: Match[], text: string): Match[] {
  const localMatches = runLocalRules(text)
  const filteredHarper = harperMatches.filter((api) => {
    const apiEnd = api.offset + api.length
    return !localMatches.some((local) => {
      const localEnd = local.offset + local.length
      return local.offset < apiEnd && api.offset < localEnd
    })
  })
  return [...filteredHarper, ...localMatches].sort((a, b) => a.offset - b.offset)
}

async function lint(text: string): Promise<LintResponse> {
  if (text.length < MIN_TEXT_LENGTH) {
    return { matches: [], isEnglish: false }
  }
  const safe = text.length > MAX_TEXT_LENGTH ? text.slice(0, MAX_TEXT_LENGTH) : text
  await ensureSetup()
  const lints = await linter.lint(safe, { language: "plaintext" })
  const harperMatches = lints.map(toMatch)
  const matches = mergeWithLocalRules(harperMatches, safe)
  return { matches, isEnglish: true }
}

async function polishViaProxy(text: string): Promise<PolishResult | null> {
  const url = process.env.PLASMO_PUBLIC_POLISH_URL
  if (!url) return null
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text })
    })
    if (!res.ok) return null
    const data = (await res.json()) as PolishResult
    if (typeof data?.rewritten !== "string" || !Array.isArray(data?.changes)) {
      return null
    }
    return data
  } catch (err) {
    console.warn("[grammar-pal] polish failed", err)
    return null
  }
}

type IncomingMessage = LintRequest | PolishRequest

chrome.runtime.onMessage.addListener(
  (msg: IncomingMessage, _sender, sendResponse) => {
    if (msg?.type === "lint") {
      lint(msg.text).then(sendResponse, (err) => {
        console.warn("[grammar-pal] lint failed", err)
        sendResponse({ matches: [], isEnglish: false } satisfies LintResponse)
      })
      return true
    }
    if (msg?.type === "polish") {
      polishViaProxy(msg.text).then(
        (result) => sendResponse(result),
        (err) => {
          console.warn("[grammar-pal] polish failed", err)
          sendResponse(null)
        }
      )
      return true
    }
    return false
  }
)
