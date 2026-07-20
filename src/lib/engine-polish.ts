// Polish engine — opt-in, fires on 1.5 s debounce (Prompt API) or 3.5 s
// debounce (Cloudflare Workers AI fallback) OR ## shortcut. The service worker
// (src/background.ts) picks the backend at session start via
// resolvePolishBackend(); this module just forwards requests over the
// chrome.runtime bus and stays backend-agnostic.

import type { PolishResult } from "../types/polish"

export type PolishBackendKind = "prompt-api" | "workers-ai" | "downloadable"

export type PolishRequest = {
  type: "polish"
  text: string
}

export type PolishResponse = PolishResult | null

export type PolishBackendRequest = {
  type: "get-polish-backend"
}

export type PolishBackendResponse = {
  backend: PolishBackendKind
}

export type TriggerLocalAiDownloadRequest = {
  type: "trigger-local-ai-download"
}

export type TriggerLocalAiDownloadResponse = {
  ok: boolean
}

export async function polish(
  text: string,
  signal?: AbortSignal
): Promise<PolishResult | null> {
  if (signal?.aborted) return null
  if (text.length === 0) return null

  const request: PolishRequest = { type: "polish", text }

  return await new Promise<PolishResult | null>((resolve) => {
    let settled = false
    const finish = (r: PolishResult | null) => {
      if (settled) return
      settled = true
      resolve(r)
    }
    const onAbort = () => finish(null)
    signal?.addEventListener("abort", onAbort, { once: true })

    chrome.runtime.sendMessage(request, (response: PolishResponse) => {
      signal?.removeEventListener("abort", onAbort)
      if (chrome.runtime.lastError || !response) {
        finish(null)
        return
      }
      finish(response)
    })
  })
}

export async function getPolishBackend(): Promise<PolishBackendKind> {
  const request: PolishBackendRequest = { type: "get-polish-backend" }
  return await new Promise<PolishBackendKind>((resolve) => {
    chrome.runtime.sendMessage(
      request,
      (response: PolishBackendResponse | undefined) => {
        if (chrome.runtime.lastError || !response) {
          resolve("workers-ai")
          return
        }
        resolve(response.backend)
      }
    )
  })
}

export async function triggerLocalAiDownload(): Promise<boolean> {
  const request: TriggerLocalAiDownloadRequest = {
    type: "trigger-local-ai-download"
  }
  return await new Promise<boolean>((resolve) => {
    chrome.runtime.sendMessage(
      request,
      (response: TriggerLocalAiDownloadResponse | undefined) => {
        if (chrome.runtime.lastError || !response) {
          resolve(false)
          return
        }
        resolve(response.ok)
      }
    )
  })
}
