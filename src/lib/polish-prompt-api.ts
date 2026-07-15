// Local on-device polish via the Chromium built-in Prompt API.
// Mirrors the Cloudflare Worker's contract: same SYSTEM_PROMPT, same
// RESPONSE_SCHEMA, same PolishResult return shape. The service worker
// (src/background.ts) routes here when polish-backend.ts has resolved the
// session backend to "prompt-api".
//
// Strategy: keep a single base session per service-worker lifetime so the
// system prompt is loaded once; clone() per request so each polish call
// starts with empty conversation context (we want every call to be
// independent — see AGENTS.md "Dual-engine architecture").

import { RESPONSE_SCHEMA, SYSTEM_PROMPT } from "./polish-spec"
import type { PolishResult } from "../types/polish"

let basePromise: Promise<LanguageModelSession> | null = null

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

export function resetPromptApiSession(): void {
  const pending = basePromise
  basePromise = null
  if (!pending) return
  void pending
    .then((s) => s.destroy())
    .catch(() => undefined)
}

export async function ensureBaseSession(): Promise<LanguageModelSession> {
  if (basePromise) return basePromise
  if (typeof LanguageModel === "undefined") {
    throw new Error("LanguageModel global not available")
  }
  basePromise = LanguageModel.create({
    initialPrompts: [{ role: "system", content: SYSTEM_PROMPT }],
    expectedInputs: [{ type: "text", languages: ["en"] }],
    expectedOutputs: [{ type: "text", languages: ["en"] }],
    temperature: 0,
    topK: 3
  })
  try {
    return await basePromise
  } catch (err) {
    basePromise = null
    throw err
  }
}

export async function polishLocally(text: string): Promise<PolishResult | null> {
  let session: LanguageModelSession | null = null
  try {
    const base = await ensureBaseSession()
    session = await base.clone()
    const raw = await session.prompt(text, {
      responseConstraint: RESPONSE_SCHEMA
    })
    const parsed = JSON.parse(raw) as unknown
    if (!validResult(parsed)) return null
    return parsed
  } catch (err) {
    console.warn("[grammar-pal] prompt-api polish failed", err)
    return null
  } finally {
    if (session) {
      try {
        session.destroy()
      } catch {
        // ignore — destroy is best-effort
      }
    }
  }
}
