// Resolves which polish backend to use this browser session — the Chromium
// built-in Prompt API (on-device, fast) when available, otherwise the
// Cloudflare Workers AI path. Cached in chrome.storage.session so
// the resolution survives service-worker restarts but is re-evaluated on a
// new browser session, per the product brief.

import { SYSTEM_PROMPT } from "./polish-spec"
import { resetPromptApiSession } from "./polish-prompt-api"

export type PolishBackend = "prompt-api" | "workers-ai" | "downloadable"

const CACHE_KEY = "polish_backend_session"

const PROMPT_API_OPTIONS = {
  expectedInputs: [{ type: "text" as const, languages: ["en"] }],
  expectedOutputs: [{ type: "text" as const, languages: ["en"] }]
}

let inflight: Promise<PolishBackend> | null = null

async function readCache(): Promise<PolishBackend | null> {
  try {
    const raw = await chrome.storage.session.get(CACHE_KEY)
    const value = raw[CACHE_KEY]
    if (
      value === "prompt-api" ||
      value === "workers-ai" ||
      value === "downloadable"
    ) {
      return value
    }
    return null
  } catch {
    return null
  }
}

async function writeCache(value: PolishBackend): Promise<void> {
  try {
    await chrome.storage.session.set({ [CACHE_KEY]: value })
  } catch {
    // session storage may be unavailable in rare cases — non-fatal
  }
}

async function detect(): Promise<PolishBackend> {
  if (typeof LanguageModel === "undefined") {
    console.info(
      "[grammar-pal] LanguageModel global not exposed — using Cloudflare Workers AI"
    )
    return "workers-ai"
  }
  try {
    const a = await LanguageModel.availability(PROMPT_API_OPTIONS)
    console.info(`[grammar-pal] LanguageModel.availability() → ${a}`)
    if (a === "available") return "prompt-api"
    if (a === "downloadable" || a === "downloading") return "downloadable"
    return "workers-ai"
  } catch (err) {
    console.warn("[grammar-pal] LanguageModel.availability() threw", err)
    return "workers-ai"
  }
}

export async function resolvePolishBackend(): Promise<PolishBackend> {
  if (inflight) return inflight
  inflight = (async () => {
    const cached = await readCache()
    if (cached) return cached
    const resolved = await detect()
    await writeCache(resolved)
    return resolved
  })()
  try {
    return await inflight
  } finally {
    inflight = null
  }
}

export async function triggerLocalAiDownload(): Promise<boolean> {
  if (typeof LanguageModel === "undefined") return false
  try {
    // Calling create() with a monitor() triggers the download and resolves
    // only when the model is ready to prompt. We discard the resulting
    // session here — polish-prompt-api.ts will lazily create its own base
    // session on the next polish call.
    const session = await LanguageModel.create({
      ...PROMPT_API_OPTIONS,
      initialPrompts: [{ role: "system", content: SYSTEM_PROMPT }],
      monitor(m) {
        m.addEventListener("downloadprogress", (e) => {
          console.info(
            `[grammar-pal] local AI download progress: ${(e.loaded * 100).toFixed(1)}%`
          )
        })
      }
    })
    session.destroy()
    await writeCache("prompt-api")
    // Drop any stale base session so future calls see a clean slate.
    resetPromptApiSession()
    return true
  } catch (err) {
    console.warn("[grammar-pal] local AI download failed", err)
    return false
  }
}
