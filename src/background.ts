// This service worker hosts the HARPER engine (local WASM, always-on grammar
// underlining). It also forwards POLISH requests to the Cloudflare Worker
// endpoint. The two engines are independent — never route Harper through the
// polish backends, or polish through Harper. See AGENTS.md "Dual-engine architecture".
//
// Parcel (Plasmo's bundler) doesn't resolve the harper.js package.json
// "exports" map cleanly — neither the bare specifier nor subpath like
// "harper.js/binaryInlined" works. Import the dist files directly.
import { Dialect, LocalLinter, type Lint } from "harper.js/dist/index.js"
import { binaryInlined } from "harper.js/dist/binaryInlined.js"

import type { LintRequest, LintResponse } from "./lib/engine"
import type {
  PolishBackendRequest,
  PolishBackendResponse,
  PolishRequest,
  TriggerLocalAiDownloadRequest,
  TriggerLocalAiDownloadResponse
} from "./lib/engine-polish"
import { runLocalRules } from "./lib/local-rules"
import {
  resolvePolishBackend,
  triggerLocalAiDownload
} from "./lib/polish-backend"
import { polishLocally } from "./lib/polish-prompt-api"
import type { Category, Match } from "./lib/types"
import type { PolishResult } from "./types/polish"

const MAX_TEXT_LENGTH = 12_000
const MIN_TEXT_LENGTH = 5
const MAX_POLISH_REQUESTS_PER_MINUTE = 5
const POLISH_RATE_WINDOW_MS = 60_000

const linter = new LocalLinter({
  binary: binaryInlined,
  dialect: Dialect.American
})

let setupPromise: Promise<void> | null = null
const polishRequestTimes: number[] = []
const polishInFlight = new Map<string, Promise<PolishResult | null>>()

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

  const existing = polishInFlight.get(text)
  if (existing) return existing

  if (!reservePolishRequestSlot()) return null

  const request = fetchPolishViaProxy(url, text)
  polishInFlight.set(text, request)
  try {
    return await request
  } finally {
    polishInFlight.delete(text)
  }
}

async function polishViaPromptApi(text: string): Promise<PolishResult | null> {
  const existing = polishInFlight.get(text)
  if (existing) return existing

  const request = polishLocally(text)
  polishInFlight.set(text, request)
  try {
    return await request
  } finally {
    polishInFlight.delete(text)
  }
}

async function dispatchPolish(text: string): Promise<PolishResult | null> {
  const backend = await resolvePolishBackend()
  if (backend === "prompt-api") return polishViaPromptApi(text)
  return polishViaProxy(text)
}

function reservePolishRequestSlot(now = Date.now()): boolean {
  const cutoff = now - POLISH_RATE_WINDOW_MS
  while (polishRequestTimes.length > 0 && polishRequestTimes[0]! <= cutoff) {
    polishRequestTimes.shift()
  }
  if (polishRequestTimes.length >= MAX_POLISH_REQUESTS_PER_MINUTE) {
    return false
  }
  polishRequestTimes.push(now)
  return true
}

async function fetchPolishViaProxy(
  url: string,
  text: string
): Promise<PolishResult | null> {
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

type IncomingMessage =
  | LintRequest
  | PolishRequest
  | PolishBackendRequest
  | TriggerLocalAiDownloadRequest

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
      dispatchPolish(msg.text).then(
        (result) => sendResponse(result),
        (err) => {
          console.warn("[grammar-pal] polish failed", err)
          sendResponse(null)
        }
      )
      return true
    }
    if (msg?.type === "get-polish-backend") {
      resolvePolishBackend().then(
        (backend) =>
          sendResponse({ backend } satisfies PolishBackendResponse),
        (err) => {
          console.warn("[grammar-pal] backend resolve failed", err)
          sendResponse({ backend: "workers-ai" } satisfies PolishBackendResponse)
        }
      )
      return true
    }
    if (msg?.type === "trigger-local-ai-download") {
      triggerLocalAiDownload().then(
        (ok) =>
          sendResponse({ ok } satisfies TriggerLocalAiDownloadResponse),
        (err) => {
          console.warn("[grammar-pal] local AI download failed", err)
          sendResponse({ ok: false } satisfies TriggerLocalAiDownloadResponse)
        }
      )
      return true
    }
    return false
  }
)
