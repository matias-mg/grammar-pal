import { getShadowRoot } from "../lib/shadow-root"
import { expressions, type Expression } from "./expressions"
import { bucketFor, tooltipFor } from "./pet-state"

let petEl: HTMLDivElement | null = null
let lastExpression: Expression | null = null

function ensurePet(): HTMLDivElement {
  if (petEl && petEl.isConnected) return petEl
  const root = getShadowRoot()
  const div = document.createElement("div")
  div.className = "pet"
  div.setAttribute("role", "img")
  root.appendChild(div)
  petEl = div
  return div
}

export function setPetExpression(expression: Expression): void {
  const el = ensurePet()
  if (lastExpression === expression) return
  el.innerHTML = expressions[expression]
  el.title = tooltipFor(expression)
  el.setAttribute("aria-label", tooltipFor(expression))
  lastExpression = expression
}

export function setPetCount(count: number): void {
  setPetExpression(bucketFor(count))
}

export function showPet(): void {
  const el = ensurePet()
  el.style.display = "block"
}

export function hidePet(): void {
  if (!petEl) return
  petEl.style.display = "none"
}
