// Resolve Gemini's substring-keyed PolishChange[] into character offsets
// against the current text. The backend guarantees each `change.original`
// is a substring of the input at polish time; we walk the changes in
// document order with a running cursor so duplicate substrings (e.g. two
// "very" tokens) bind to the right occurrence.

import type { PolishChange } from "../types/polish"

export type AnchoredChange = {
  change: PolishChange
  offset: number
  length: number
}

export function computeAnchors(
  text: string,
  changes: PolishChange[]
): AnchoredChange[] {
  const out: AnchoredChange[] = []
  let cursor = 0
  for (const change of changes) {
    if (change.original.length === 0) continue
    const idx = text.indexOf(change.original, cursor)
    if (idx < 0) continue
    out.push({ change, offset: idx, length: change.original.length })
    cursor = idx + change.original.length
  }
  return out
}
