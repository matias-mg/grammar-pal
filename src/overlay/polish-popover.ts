// Per-chunk polish popover — single-suggestion UI anchored to one clicked
// underline. Parallel to src/overlay/suggestion-popup.ts (Harper) so the two
// engines keep independent overlays.

import { strings } from "../lib/i18n"
import { getOverlayLayer } from "../lib/shadow-root"
import type { PolishChange } from "../types/polish"

type Anchor = { left: number; top: number; width: number; height: number }

export type PolishPopoverActions = {
  onAccept: () => void
  onSkip: () => void
}

let currentEl: HTMLDivElement | null = null
let dismissCleanup: (() => void) | null = null

const SCROLL_OPTS: AddEventListenerOptions = { capture: true, passive: true }

export function dismissPolishPopover(): void {
  if (currentEl) {
    currentEl.remove()
    currentEl = null
  }
  if (dismissCleanup) {
    dismissCleanup()
    dismissCleanup = null
  }
}

export function showPolishPopover(
  anchor: Anchor,
  change: PolishChange,
  actions: PolishPopoverActions
): void {
  dismissPolishPopover()
  const layer = getOverlayLayer()

  const popover = document.createElement("div")
  popover.className = "polish-popover"
  popover.setAttribute("role", "dialog")
  popover.setAttribute("aria-label", strings.polishPopoverAriaLabel)
  // Block the implicit focus shift on mousedown so the editable keeps focus.
  // Otherwise blurring the editable fires focusout in grammar-pal.ts, which
  // tears down polish state (including this popover) on the next tick.
  popover.addEventListener("mousedown", (ev) => ev.preventDefault())

  const diff = document.createElement("p")
  diff.className = "polish-popover__diff"
  const orig = document.createElement("span")
  orig.className = "polish-popover__original"
  orig.textContent = `"${change.original}"`
  const arrow = document.createElement("span")
  arrow.className = "polish-popover__arrow"
  arrow.textContent = "→"
  const repl = document.createElement("span")
  repl.className = "polish-popover__replacement"
  repl.textContent = `"${change.replacement}"`
  diff.appendChild(orig)
  diff.appendChild(arrow)
  diff.appendChild(repl)
  popover.appendChild(diff)

  if (change.reason && change.reason.length > 0) {
    const reason = document.createElement("p")
    reason.className = "polish-popover__reason"
    reason.textContent = change.reason
    popover.appendChild(reason)
  }

  const actionsEl = document.createElement("div")
  actionsEl.className = "polish-popover__actions"

  const accept = document.createElement("button")
  accept.type = "button"
  accept.className = "polish-popover__btn polish-popover__btn--primary"
  accept.textContent = strings.polishAccept
  accept.addEventListener("click", (ev) => {
    ev.preventDefault()
    ev.stopPropagation()
    actions.onAccept()
    dismissPolishPopover()
  })
  actionsEl.appendChild(accept)

  const skip = document.createElement("button")
  skip.type = "button"
  skip.className = "polish-popover__btn"
  skip.textContent = strings.polishSkip
  skip.addEventListener("click", (ev) => {
    ev.preventDefault()
    ev.stopPropagation()
    actions.onSkip()
    dismissPolishPopover()
  })
  actionsEl.appendChild(skip)

  popover.appendChild(actionsEl)

  layer.appendChild(popover)
  const popRect = popover.getBoundingClientRect()
  const spaceBelow = window.innerHeight - (anchor.top + anchor.height)
  const top =
    spaceBelow >= popRect.height + 8
      ? anchor.top + anchor.height + 4
      : anchor.top - popRect.height - 4
  const left = Math.max(
    8,
    Math.min(anchor.left, window.innerWidth - popRect.width - 8)
  )
  popover.style.left = `${left}px`
  popover.style.top = `${top}px`

  currentEl = popover

  const onDocClick = (ev: Event) => {
    const path = ev.composedPath()
    if (path.includes(popover)) return
    dismissPolishPopover()
  }
  const onKey = (ev: KeyboardEvent) => {
    if (ev.key === "Escape") dismissPolishPopover()
  }
  const onScroll = () => dismissPolishPopover()
  const onBlur = () => dismissPolishPopover()

  document.addEventListener("mousedown", onDocClick, true)
  document.addEventListener("keydown", onKey, true)
  window.addEventListener("scroll", onScroll, SCROLL_OPTS)
  window.addEventListener("blur", onBlur)

  dismissCleanup = () => {
    document.removeEventListener("mousedown", onDocClick, true)
    document.removeEventListener("keydown", onKey, true)
    window.removeEventListener("scroll", onScroll, SCROLL_OPTS)
    window.removeEventListener("blur", onBlur)
  }
}
