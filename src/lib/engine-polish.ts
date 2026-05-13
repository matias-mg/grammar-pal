// Polish engine — opt-in, network-backed, fires on 3.5 s debounce OR ## shortcut.
// This is the Gemini half of Grammar Pal's two-engine model. The Harper half
// lives in src/background.ts and src/lib/engine.ts. The two engines never share
// state or routing — see CLAUDE.md "Dual-engine architecture".

import type { PolishResult } from "../types/polish"

export type PolishRequest = {
  type: "polish"
  text: string
}

export type PolishResponse = PolishResult | null

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
