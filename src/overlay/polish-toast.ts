import type { EditableTarget } from "../lib/editable"
import { strings } from "../lib/i18n"
import { getOverlayLayer } from "../lib/shadow-root"

const TOAST_MS = 3000

let toastEl: HTMLDivElement | null = null
let toastTimer: ReturnType<typeof setTimeout> | null = null

export function dismissPolishToast(): void {
  if (toastTimer !== null) {
    clearTimeout(toastTimer)
    toastTimer = null
  }
  if (toastEl) {
    toastEl.remove()
    toastEl = null
  }
}

export function showPolishToast(
  target: EditableTarget,
  message: string = strings.polishToastError
): void {
  dismissPolishToast()
  const layer = getOverlayLayer()

  const el = document.createElement("div")
  el.className = "polish-toast"
  el.setAttribute("role", "status")
  el.setAttribute("aria-live", "polite")
  el.textContent = message
  layer.appendChild(el)

  const rect = target.el.getBoundingClientRect()
  const toastRect = el.getBoundingClientRect()
  const margin = 8
  const spaceBelow = window.innerHeight - rect.bottom
  const top =
    spaceBelow >= toastRect.height + margin
      ? rect.bottom + 6
      : Math.max(margin, rect.top - toastRect.height - 6)
  const left = Math.max(
    margin,
    Math.min(
      rect.right - toastRect.width,
      window.innerWidth - toastRect.width - margin
    )
  )
  el.style.left = `${left}px`
  el.style.top = `${top}px`

  toastEl = el
  toastTimer = setTimeout(() => {
    toastTimer = null
    dismissPolishToast()
  }, TOAST_MS)
}
