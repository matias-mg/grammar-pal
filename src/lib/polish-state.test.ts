import { describe, expect, it } from "vitest"

import {
  isMeaningfulPolishChange,
  rememberPolishText
} from "./polish-state"

describe("isMeaningfulPolishChange", () => {
  it("ignores text that returned to the same settled value", () => {
    const text = "This sentence is already perfectly natural."
    expect(isMeaningfulPolishChange(text, text)).toBe(false)
  })

  it("ignores one or two accidental character edits", () => {
    const original = "This sentence is already perfectly natural."
    expect(isMeaningfulPolishChange(original, `${original} `)).toBe(false)
    expect(isMeaningfulPolishChange(original, `${original}!!`)).toBe(false)
  })

  it("detects meaningful same-length rewrites", () => {
    expect(
      isMeaningfulPolishChange(
        "a".repeat(40),
        "b".repeat(40)
      )
    ).toBe(true)
  })

  it("requires more than three percent of a long passage to change", () => {
    const original = "a".repeat(200)
    expect(
      isMeaningfulPolishChange(original, `${"b".repeat(6)}${original.slice(6)}`)
    ).toBe(false)
    expect(
      isMeaningfulPolishChange(original, `${"b".repeat(7)}${original.slice(7)}`)
    ).toBe(true)
  })
})

describe("rememberPolishText", () => {
  it("keeps a bounded least-recently-used history", () => {
    const history = new Set<string>()
    rememberPolishText(history, "first", 2)
    rememberPolishText(history, "second", 2)
    rememberPolishText(history, "first", 2)
    rememberPolishText(history, "third", 2)

    expect([...history]).toEqual(["first", "third"])
  })
})
