import { strings } from "../lib/i18n"
import type { Expression } from "./expressions"

export function bucketFor(count: number): Expression {
  if (count <= 0) return "happy"
  if (count <= 2) return "neutral"
  if (count <= 4) return "curious"
  if (count <= 7) return "concerned"
  return "alarmed"
}

export function tooltipFor(expression: Expression): string {
  switch (expression) {
    case "happy":
      return strings.petTooltipHappy
    case "neutral":
      return strings.petTooltipNeutral
    case "curious":
      return strings.petTooltipCurious
    case "concerned":
      return strings.petTooltipConcerned
    case "alarmed":
      return strings.petTooltipAlarmed
  }
}
