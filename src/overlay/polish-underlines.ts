// Polish underline overlay — the visual half of the Gemini engine. Mirrors
// src/overlay/underlines.ts (Harper) but is kept fully independent: separate
// perTarget map, separate click handler, separate teardown. The two engines
// must never share state — see CLAUDE.md "Dual-engine architecture".

import { readText, type EditableTarget } from "../lib/editable"
import { getOverlayLayer } from "../lib/shadow-root"
import type { PolishChange } from "../types/polish"

import { rectsForRange } from "./measure"
import { computeAnchors, type AnchoredChange } from "./polish-offsets"

type AnchorEntry = {
  anchor: AnchoredChange
  spans: HTMLSpanElement[]
}

type TargetState = {
  target: EditableTarget
  entries: AnchorEntry[]
  onScroll: (e: Event) => void
  onResize: () => void
  io: IntersectionObserver
}

const perTarget = new WeakMap<Element, TargetState>()
const liveTargets = new Set<EditableTarget>()

const SCROLL_OPTS: AddEventListenerOptions = { capture: true, passive: true }

export type PolishUnderlineClickHandler = (
  target: EditableTarget,
  anchor: AnchoredChange,
  span: HTMLSpanElement
) => void

let clickHandler: PolishUnderlineClickHandler | null = null
let interactionStartHandler: (() => void) | null = null

export function setPolishUnderlineClickHandler(
  h: PolishUnderlineClickHandler
): void {
  clickHandler = h
}

export function setPolishUnderlineInteractionStartHandler(
  h: (() => void) | null
): void {
  interactionStartHandler = h
}

export function getPolishTargets(): EditableTarget[] {
  return Array.from(liveTargets)
}

export function clearPolishUnderlines(target: EditableTarget): void {
  const state = perTarget.get(target.el)
  if (!state) return
  for (const entry of state.entries) {
    for (const s of entry.spans) s.remove()
  }
  window.removeEventListener("scroll", state.onScroll, SCROLL_OPTS)
  window.removeEventListener("resize", state.onResize)
  state.io.disconnect()
  perTarget.delete(target.el)
  liveTargets.delete(target)
}

export function renderPolishUnderlines(
  target: EditableTarget,
  changes: PolishChange[]
): void {
  clearPolishUnderlines(target)
  const anchors = computeAnchors(readText(target), changes)
  if (anchors.length === 0) return

  const layer = getOverlayLayer()
  const entries: AnchorEntry[] = []

  for (const anchor of anchors) {
    const spans = renderAnchorSpans(layer, target, anchor)
    entries.push({ anchor, spans })
  }

  const state: TargetState = {
    target,
    entries,
    onScroll: () => repositionState(state),
    onResize: () => repositionState(state),
    io: new IntersectionObserver(() => repositionState(state), { threshold: 0 })
  }
  state.io.observe(target.el)
  window.addEventListener("scroll", state.onScroll, SCROLL_OPTS)
  window.addEventListener("resize", state.onResize)

  perTarget.set(target.el, state)
  liveTargets.add(target)
}

export function removePolishAnchor(
  target: EditableTarget,
  anchor: AnchoredChange
): void {
  const state = perTarget.get(target.el)
  if (!state) return
  const idx = state.entries.findIndex((e) => e.anchor === anchor)
  if (idx < 0) return
  const entry = state.entries[idx]
  if (!entry) return
  for (const s of entry.spans) s.remove()
  state.entries.splice(idx, 1)
  if (state.entries.length === 0) clearPolishUnderlines(target)
}

export function shiftPolishAnchorsAfter(
  target: EditableTarget,
  fromOffset: number,
  delta: number
): void {
  const state = perTarget.get(target.el)
  if (!state || delta === 0) return
  for (const entry of state.entries) {
    if (entry.anchor.offset >= fromOffset) {
      entry.anchor.offset += delta
    }
  }
  repositionState(state)
}

function renderAnchorSpans(
  layer: HTMLElement,
  target: EditableTarget,
  anchor: AnchoredChange
): HTMLSpanElement[] {
  const rects = rectsForRange(target, anchor.offset, anchor.offset + anchor.length)
  const spans: HTMLSpanElement[] = []
  for (const r of rects) {
    const span = document.createElement("span")
    span.className = "u u--polish"
    applyBandRect(span, r)
    // Block the implicit focus shift on mousedown. Without this, clicking the
    // span blurs the editable, which fires focusout — and the focusout handler
    // in grammar-pal.ts tears down polish state right after we open the popover.
    span.addEventListener("pointerdown", markPolishInteraction)
    span.addEventListener("mousedown", blockMouseDown)
    span.addEventListener("click", (ev) => {
      ev.preventDefault()
      ev.stopPropagation()
      clickHandler?.(target, anchor, span)
    })
    layer.appendChild(span)
    spans.push(span)
  }
  return spans
}

function applyBandRect(
  span: HTMLSpanElement,
  rect: { left: number; top: number; width: number; height: number }
): void {
  // Match Harper's underline box so AI polish can replace it visually when
  // both engines flag the same text.
  span.style.left = `${rect.left}px`
  span.style.top = `${rect.top}px`
  span.style.width = `${rect.width}px`
  span.style.height = `${rect.height}px`
}

function repositionState(state: TargetState): void {
  if (!state.target.el.isConnected) {
    clearPolishUnderlines(state.target)
    return
  }
  for (const entry of state.entries) {
    const rects = rectsForRange(
      state.target,
      entry.anchor.offset,
      entry.anchor.offset + entry.anchor.length
    )
    // Rebuild the band spans if the rect count changed (line wrap shifted).
    if (rects.length !== entry.spans.length) {
      for (const s of entry.spans) s.remove()
      entry.spans = []
      const layer = getOverlayLayer()
      for (const r of rects) {
        const span = document.createElement("span")
        span.className = "u u--polish"
        applyBandRect(span, r)
        const anchor = entry.anchor
        span.addEventListener("pointerdown", markPolishInteraction)
        span.addEventListener("mousedown", blockMouseDown)
        span.addEventListener("click", (ev) => {
          ev.preventDefault()
          ev.stopPropagation()
          clickHandler?.(state.target, anchor, span)
        })
        layer.appendChild(span)
        entry.spans.push(span)
      }
      continue
    }
    for (let i = 0; i < rects.length; i++) {
      const r = rects[i]
      const s = entry.spans[i]
      if (!r || !s) continue
      applyBandRect(s, r)
    }
  }
}

function markPolishInteraction(): void {
  interactionStartHandler?.()
}

function blockMouseDown(ev: MouseEvent): void {
  interactionStartHandler?.()
  ev.preventDefault()
  ev.stopPropagation()
}
