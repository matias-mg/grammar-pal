import { describe, expect, it } from "vitest"

import { DEFAULT_SETTINGS, type Pal } from "../lib/types"
import { bucketFor } from "./pet-state"
import {
  catExpressions,
  classicExpressions,
  expressionFor,
  type Expression
} from "./expressions"

const PAL_IDS: Pal[] = ["cat", "classic"]
const EXPRESSION_IDS: Expression[] = [
  "happy",
  "neutral",
  "curious",
  "concerned",
  "alarmed"
]

describe("pal expressions", () => {
  it("uses the cat as the default pal", () => {
    expect(DEFAULT_SETTINGS.pal).toBe("cat")
  })

  it.each(PAL_IDS)("defines every reaction for the %s pal", (pal) => {
    for (const expression of EXPRESSION_IDS) {
      const svg = expressionFor(pal, expression)
      expect(svg).toContain("<svg")
      expect(svg).toContain(`data-pal="${pal}"`)
      expect(svg).toContain(`data-expression="${expression}"`)
    }
  })

  it("gives every cat state distinct SVG artwork", () => {
    expect(new Set(Object.values(catExpressions))).toHaveLength(
      EXPRESSION_IDS.length
    )
  })

  it("reserves the caret-eye face for zero issues and shifts later reactions", () => {
    expect(bucketFor(0)).toBe("happy")
    expect(bucketFor(1)).toBe("neutral")
    expect(catExpressions.happy).toContain("#d99b9b")
    expect(catExpressions.neutral).toContain("M32 48.6v1")
    expect(catExpressions.curious).toContain("M29.9 50.2h4.2")
    expect(catExpressions.concerned).toContain('cx="32" cy="50.7"')
    expect(catExpressions.alarmed).toContain("M29.8 51.2c1.4-1.1")
  })

  it("keeps the original pal available", () => {
    expect(classicExpressions.happy).toContain("#fde68a")
    expect(classicExpressions.alarmed).toContain("#f87171")
  })
})
