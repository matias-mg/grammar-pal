// Polish panel — UI half of the Gemini engine. Lives in the shared Shadow DOM
// so it never bleeds into the host page. The Harper underline overlay is a
// separate component; the two never share state. See CLAUDE.md
// "Dual-engine architecture".

import type { EditableTarget } from "../lib/editable"
import { readText } from "../lib/editable"
import { strings } from "../lib/i18n"
import { getOverlayLayer } from "../lib/shadow-root"
import type { PolishChange, PolishResult } from "../types/polish"

import { applyReplacement } from "./apply-replacement"
import { dismissPolishToast } from "./polish-toast"

type ChangeState = "pending" | "accepted" | "skipped"

type CardEntry = {
  change: PolishChange
  state: ChangeState
  cardEl: HTMLDivElement
  actionsEl: HTMLDivElement
  statusEl: HTMLDivElement
}

let panelEl: HTMLDivElement | null = null
let cards: CardEntry[] = []
let panelTarget: EditableTarget | null = null
let onResolved: (() => void) | null = null
let dismissCleanup: (() => void) | null = null
let headerCountEl: HTMLSpanElement | null = null

const SCROLL_OPTS: AddEventListenerOptions = { capture: true, passive: true }

export function dismissPolishPanel(): void {
  if (panelEl) {
    panelEl.remove()
    panelEl = null
  }
  if (dismissCleanup) {
    dismissCleanup()
    dismissCleanup = null
  }
  cards = []
  panelTarget = null
  onResolved = null
  headerCountEl = null
}

export function showPolishPanel(
  target: EditableTarget,
  result: PolishResult,
  onAllResolved?: () => void
): void {
  dismissPolishPanel()
  dismissPolishToast()
  if (result.changes.length === 0) return

  const layer = getOverlayLayer()
  panelTarget = target
  onResolved = onAllResolved ?? null

  const panel = document.createElement("div")
  panel.className = "polish-panel"
  panel.setAttribute("role", "dialog")
  panel.setAttribute("aria-label", strings.polishTitle)

  // Head
  const head = document.createElement("div")
  head.className = "polish-panel__head"
  const title = document.createElement("span")
  title.textContent = `✨ ${strings.polishTitle}`
  head.appendChild(title)
  const close = document.createElement("button")
  close.className = "polish-panel__close"
  close.type = "button"
  close.setAttribute("aria-label", strings.polishDismiss)
  close.textContent = "✕"
  close.addEventListener("click", (ev) => {
    ev.preventDefault()
    ev.stopPropagation()
    dismissPolishPanel()
  })
  head.appendChild(close)
  panel.appendChild(head)

  // Body
  const body = document.createElement("div")
  body.className = "polish-panel__body"

  const previewLabel = document.createElement("p")
  previewLabel.className = "polish-panel__section-label"
  previewLabel.textContent = strings.polishRewriteHeader
  body.appendChild(previewLabel)

  const preview = document.createElement("div")
  preview.className = "polish-panel__preview"
  preview.textContent = result.rewritten
  body.appendChild(preview)

  const changesLabel = document.createElement("p")
  changesLabel.className = "polish-panel__section-label"
  const labelText = document.createElement("span")
  labelText.textContent = `${strings.polishChangesHeader} `
  changesLabel.appendChild(labelText)
  headerCountEl = document.createElement("span")
  changesLabel.appendChild(headerCountEl)
  body.appendChild(changesLabel)

  cards = result.changes.map((change) => buildCard(change))
  for (const c of cards) body.appendChild(c.cardEl)

  panel.appendChild(body)

  // Foot
  const foot = document.createElement("div")
  foot.className = "polish-panel__foot"
  const acceptAll = document.createElement("button")
  acceptAll.className = "polish-btn polish-btn--primary"
  acceptAll.type = "button"
  acceptAll.textContent = strings.polishAcceptAll
  acceptAll.addEventListener("click", (ev) => {
    ev.preventDefault()
    ev.stopPropagation()
    handleAcceptAll()
  })
  const dismiss = document.createElement("button")
  dismiss.className = "polish-btn"
  dismiss.type = "button"
  dismiss.textContent = strings.polishDismiss
  dismiss.addEventListener("click", (ev) => {
    ev.preventDefault()
    ev.stopPropagation()
    dismissPolishPanel()
  })
  foot.appendChild(acceptAll)
  foot.appendChild(dismiss)
  panel.appendChild(foot)

  layer.appendChild(panel)
  panelEl = panel

  position(panel, target)
  updateHeaderCount()

  const onScroll = () => {
    if (panelEl && panelTarget) position(panelEl, panelTarget)
  }
  const onResize = () => onScroll()
  const onKey = (ev: KeyboardEvent) => {
    if (ev.key === "Escape") dismissPolishPanel()
  }
  window.addEventListener("scroll", onScroll, SCROLL_OPTS)
  window.addEventListener("resize", onResize)
  document.addEventListener("keydown", onKey, true)
  dismissCleanup = () => {
    window.removeEventListener("scroll", onScroll, SCROLL_OPTS)
    window.removeEventListener("resize", onResize)
    document.removeEventListener("keydown", onKey, true)
  }
}

function buildCard(change: PolishChange): CardEntry {
  const cardEl = document.createElement("div")
  cardEl.className = "polish-card"

  const original = document.createElement("div")
  original.className = "polish-card__original"
  original.textContent = `"${change.original}"`
  cardEl.appendChild(original)

  const replacement = document.createElement("div")
  replacement.className = "polish-card__replacement"
  const arrow = document.createElement("span")
  arrow.className = "polish-card__arrow"
  arrow.textContent = "→ "
  replacement.appendChild(arrow)
  replacement.appendChild(document.createTextNode(`"${change.replacement}"`))
  cardEl.appendChild(replacement)

  const reason = document.createElement("p")
  reason.className = "polish-card__reason"
  reason.textContent = change.reason
  cardEl.appendChild(reason)

  const actionsEl = document.createElement("div")
  actionsEl.className = "polish-card__actions"
  const accept = document.createElement("button")
  accept.className = "polish-btn polish-btn--primary"
  accept.type = "button"
  accept.textContent = strings.polishAccept
  const skip = document.createElement("button")
  skip.className = "polish-btn"
  skip.type = "button"
  skip.textContent = strings.polishSkip
  actionsEl.appendChild(accept)
  actionsEl.appendChild(skip)
  cardEl.appendChild(actionsEl)

  const statusEl = document.createElement("div")
  statusEl.className = "polish-card__status"
  statusEl.hidden = true
  cardEl.appendChild(statusEl)

  const entry: CardEntry = {
    change,
    state: "pending",
    cardEl,
    actionsEl,
    statusEl
  }

  accept.addEventListener("click", (ev) => {
    ev.preventDefault()
    ev.stopPropagation()
    handleAccept(entry)
  })
  skip.addEventListener("click", (ev) => {
    ev.preventDefault()
    ev.stopPropagation()
    handleSkip(entry)
  })

  return entry
}

function handleAccept(entry: CardEntry): void {
  if (entry.state !== "pending" || !panelTarget) return
  const ok = applySingleChange(panelTarget, entry.change)
  markResolved(entry, ok ? "accepted" : "accepted", ok)
  maybeFinish()
}

function handleSkip(entry: CardEntry): void {
  if (entry.state !== "pending") return
  markResolved(entry, "skipped", false)
  maybeFinish()
}

function handleAcceptAll(): void {
  if (!panelTarget) return
  for (const entry of cards) {
    if (entry.state !== "pending") continue
    const ok = applySingleChange(panelTarget, entry.change)
    markResolved(entry, "accepted", ok)
  }
  maybeFinish()
}

function applySingleChange(
  target: EditableTarget,
  change: PolishChange
): boolean {
  if (change.original.length === 0) return false
  const current = readText(target)
  const idx = current.indexOf(change.original)
  if (idx < 0) return false
  applyReplacement(target, idx, idx + change.original.length, change.replacement)
  return true
}

function markResolved(
  entry: CardEntry,
  state: "accepted" | "skipped",
  applied: boolean
): void {
  entry.state = state
  entry.cardEl.classList.add("polish-card--resolved")
  entry.actionsEl.remove()
  entry.statusEl.hidden = false
  if (state === "accepted") {
    entry.statusEl.textContent = applied
      ? strings.polishCardApplied
      : strings.polishCardNotFound
  } else {
    entry.statusEl.textContent = strings.polishCardSkipped
  }
  updateHeaderCount()
}

function updateHeaderCount(): void {
  if (!headerCountEl) return
  const pending = cards.filter((c) => c.state === "pending").length
  headerCountEl.textContent = `(${pending} of ${cards.length} pending)`
}

function maybeFinish(): void {
  const anyPending = cards.some((c) => c.state === "pending")
  if (anyPending) return
  const cb = onResolved
  dismissPolishPanel()
  cb?.()
}

function position(panel: HTMLDivElement, target: EditableTarget): void {
  const rect = target.el.getBoundingClientRect()
  const panelRect = panel.getBoundingClientRect()
  const margin = 8
  const spaceBelow = window.innerHeight - rect.bottom
  const top =
    spaceBelow >= panelRect.height + margin
      ? rect.bottom + 6
      : Math.max(margin, rect.top - panelRect.height - 6)
  const left = Math.max(
    margin,
    Math.min(rect.left, window.innerWidth - panelRect.width - margin)
  )
  panel.style.left = `${left}px`
  panel.style.top = `${top}px`
}
