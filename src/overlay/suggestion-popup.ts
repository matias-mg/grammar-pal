import { strings } from "../lib/i18n"
import { getOverlayLayer } from "../lib/shadow-root"
import type { Match } from "../lib/types"

type Anchor = { left: number; top: number; width: number; height: number }

export type ReplacementPick = (replacement: string) => void

let currentEl: HTMLDivElement | null = null
let dismissCleanup: (() => void) | null = null

const SCROLL_OPTS: AddEventListenerOptions = { capture: true, passive: true }

export function dismissSuggestionPopup(): void {
  if (currentEl) {
    currentEl.remove()
    currentEl = null
  }
  if (dismissCleanup) {
    dismissCleanup()
    dismissCleanup = null
  }
}

export function showSuggestionPopup(
  anchor: Anchor,
  match: Match,
  onPick: ReplacementPick
): void {
  dismissSuggestionPopup()
  const layer = getOverlayLayer()

  const popup = document.createElement("div")
  popup.className = "popup"
  popup.setAttribute("role", "dialog")
  popup.setAttribute("aria-label", strings.suggestionTitle)

  const msg = document.createElement("p")
  msg.className = "popup__msg"
  msg.textContent = match.message
  popup.appendChild(msg)

  if (match.replacements.length === 0) {
    const empty = document.createElement("p")
    empty.className = "popup__empty"
    empty.textContent = strings.noSuggestions
    popup.appendChild(empty)
  } else {
    for (const r of match.replacements) {
      const btn = document.createElement("button")
      btn.className = "popup__btn"
      btn.type = "button"
      btn.textContent = r
      btn.addEventListener("click", (ev) => {
        ev.preventDefault()
        ev.stopPropagation()
        onPick(r)
        dismissSuggestionPopup()
      })
      popup.appendChild(btn)
    }
  }

  // Position above-or-below the underline based on viewport room.
  layer.appendChild(popup)
  const popupRect = popup.getBoundingClientRect()
  const spaceBelow = window.innerHeight - (anchor.top + anchor.height)
  const top =
    spaceBelow >= popupRect.height + 8
      ? anchor.top + anchor.height + 4
      : anchor.top - popupRect.height - 4
  const left = Math.max(
    8,
    Math.min(anchor.left, window.innerWidth - popupRect.width - 8)
  )
  popup.style.left = `${left}px`
  popup.style.top = `${top}px`

  currentEl = popup

  const onDocClick = (ev: Event) => {
    const path = ev.composedPath()
    if (path.includes(popup)) return
    dismissSuggestionPopup()
  }
  const onKey = (ev: KeyboardEvent) => {
    if (ev.key === "Escape") dismissSuggestionPopup()
  }
  const onScroll = () => dismissSuggestionPopup()
  const onBlur = () => dismissSuggestionPopup()

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
