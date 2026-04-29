import { strings } from "../lib/i18n"
import { getShadowRoot } from "../lib/shadow-root"
import type { Mode } from "../lib/types"
import { expressions, type Expression } from "./expressions"
import { bucketFor, tooltipFor } from "./pet-state"

const PET_SIZE = 56
const GAP = 8
const SCROLL_OPTS: AddEventListenerOptions = { capture: true, passive: true }

let petEl: HTMLDivElement | null = null
let faceEl: HTMLDivElement | null = null
let modeEl: HTMLDivElement | null = null
let lastExpression: Expression | null = null
let lastMode: Mode | null = null
let targetEl: HTMLElement | null = null
let listenersAttached = false
let rafId: number | null = null

function ensurePet(): HTMLDivElement {
  if (petEl && petEl.isConnected) return petEl
  const root = getShadowRoot()
  const div = document.createElement("div")
  div.className = "pet"
  div.style.display = "none"
  div.setAttribute("role", "img")

  const face = document.createElement("div")
  face.className = "pet__face"
  div.appendChild(face)

  const mode = document.createElement("div")
  mode.className = "pet__mode"
  div.appendChild(mode)

  root.appendChild(div)
  petEl = div
  faceEl = face
  modeEl = mode
  if (lastMode) applyMode(lastMode)
  return div
}

export function setPetExpression(expression: Expression): void {
  ensurePet()
  if (lastExpression === expression) return
  if (faceEl) faceEl.innerHTML = expressions[expression]
  petEl?.setAttribute("aria-label", tooltipFor(expression))
  if (petEl) petEl.title = tooltipFor(expression)
  lastExpression = expression
}

export function setPetCount(count: number): void {
  setPetExpression(bucketFor(count))
}

function applyMode(mode: Mode): void {
  if (!modeEl) return
  modeEl.classList.toggle("pet__mode--formal", mode === "formal")
  modeEl.classList.toggle("pet__mode--chill", mode === "chill")
  modeEl.title = mode === "formal" ? strings.modeFormal : strings.modeChill
}

export function setPetMode(mode: Mode): void {
  ensurePet()
  lastMode = mode
  applyMode(mode)
}

function repositionPet(): void {
  if (!petEl || !targetEl || !targetEl.isConnected) return
  const rect = targetEl.getBoundingClientRect()

  // Default: just outside the input's top-left corner.
  let left = rect.left - PET_SIZE - GAP
  let top = rect.top - PET_SIZE - GAP

  // If that placement clips off the left or top edge, sit beside the input
  // on its right side, aligned to the input's top.
  if (left < 0 || top < 0) {
    left = rect.right + GAP
    top = rect.top
  }

  // Final clamp so the pet is always visible inside the viewport.
  const maxLeft = Math.max(0, window.innerWidth - PET_SIZE)
  const maxTop = Math.max(0, window.innerHeight - PET_SIZE)
  left = Math.max(0, Math.min(left, maxLeft))
  top = Math.max(0, Math.min(top, maxTop))

  petEl.style.left = `${left}px`
  petEl.style.top = `${top}px`
}

function scheduleReposition(): void {
  if (rafId != null) return
  rafId = requestAnimationFrame(() => {
    rafId = null
    repositionPet()
  })
}

function attachListeners(): void {
  if (listenersAttached) return
  window.addEventListener("scroll", scheduleReposition, SCROLL_OPTS)
  window.addEventListener("resize", scheduleReposition)
  listenersAttached = true
}

function detachListeners(): void {
  if (!listenersAttached) return
  window.removeEventListener("scroll", scheduleReposition, SCROLL_OPTS)
  window.removeEventListener("resize", scheduleReposition)
  listenersAttached = false
}

export function attachPetTo(el: HTMLElement): void {
  targetEl = el
  const pet = ensurePet()
  pet.style.display = "block"
  attachListeners()
  repositionPet()
}

export function detachPet(): void {
  targetEl = null
  detachListeners()
  if (petEl) petEl.style.display = "none"
}

export function hidePet(): void {
  detachListeners()
  if (petEl) petEl.style.display = "none"
}
