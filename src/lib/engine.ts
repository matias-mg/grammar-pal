import type { Match, Mode } from "./types"

export type CheckResult = {
  matches: Match[]
  isEnglish: boolean
}

export type LintRequest = {
  type: "lint"
  text: string
  mode: Mode
}

export type LintResponse = CheckResult

const EMPTY: CheckResult = { matches: [], isEnglish: false }

export async function check(
  text: string,
  mode: Mode,
  signal?: AbortSignal
): Promise<CheckResult> {
  if (signal?.aborted) return EMPTY
  if (text.length === 0) return EMPTY

  const request: LintRequest = { type: "lint", text, mode }

  return await new Promise<CheckResult>((resolve) => {
    let settled = false
    const finish = (result: CheckResult) => {
      if (settled) return
      settled = true
      resolve(result)
    }

    // Discard the response if the caller aborts mid-flight. The service
    // worker still completes the work — sub-10ms typical — but the result
    // is no longer relevant. Chrome's runtime bus has no cancellation.
    const onAbort = () => finish(EMPTY)
    signal?.addEventListener("abort", onAbort, { once: true })

    chrome.runtime.sendMessage(request, (response: LintResponse | undefined) => {
      signal?.removeEventListener("abort", onAbort)
      if (chrome.runtime.lastError || !response) {
        finish(EMPTY)
        return
      }
      finish(response)
    })
  })
}
