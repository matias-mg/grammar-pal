import type { EditableTarget } from "../lib/editable"
import { getOverlayLayer } from "../lib/shadow-root"
import type { Match } from "../lib/types"
import { rectsForRange } from "./measure"

type Bound = { match: Match; el: HTMLSpanElement }

const perTarget = new WeakMap<
  Element,
  {
    matches: Match[]
    bounds: Bound[]
    onScroll: (e: Event) => void
    onResize: () => void
    io: IntersectionObserver
  }
>()

const SCROLL_OPTS: AddEventListenerOptions = { capture: true, passive: true }

export type UnderlineClickHandler = (
  target: EditableTarget,
  match: Match,
  span: HTMLSpanElement
) => void

let clickHandler: UnderlineClickHandler | null = null

export function setUnderlineClickHandler(h: UnderlineClickHandler): void {
  clickHandler = h
}

export function clearUnderlines(target: EditableTarget): void {
  const state = perTarget.get(target.el)
  if (!state) return
  for (const b of state.bounds) b.el.remove()
  window.removeEventListener("scroll", state.onScroll, SCROLL_OPTS)
  window.removeEventListener("resize", state.onResize)
  state.io.disconnect()
  perTarget.delete(target.el)
}

export function renderUnderlines(
  target: EditableTarget,
  matches: Match[]
): void {
  clearUnderlines(target)
  if (matches.length === 0) return

  const layer = getOverlayLayer()
  const bounds: Bound[] = []

  for (const m of matches) {
    const rects = rectsForRange(target, m.offset, m.offset + m.length)
    for (const r of rects) {
      const span = document.createElement("span")
      span.className = `u u--${m.category}`
      span.style.left = `${r.left}px`
      span.style.top = `${r.top}px`
      span.style.width = `${r.width}px`
      span.style.height = `${r.height}px`
      span.addEventListener("click", (ev) => {
        ev.preventDefault()
        ev.stopPropagation()
        clickHandler?.(target, m, span)
      })
      layer.appendChild(span)
      bounds.push({ match: m, el: span })
    }
  }

  const reposition = () => {
    let i = 0
    for (const m of matches) {
      const rects = rectsForRange(target, m.offset, m.offset + m.length)
      for (const r of rects) {
        const b = bounds[i++]
        if (!b) return
        b.el.style.left = `${r.left}px`
        b.el.style.top = `${r.top}px`
        b.el.style.width = `${r.width}px`
        b.el.style.height = `${r.height}px`
      }
    }
  }

  const onScroll = () => reposition()
  const onResize = () => reposition()
  const io = new IntersectionObserver(reposition, { threshold: 0 })
  io.observe(target.el)

  window.addEventListener("scroll", onScroll, SCROLL_OPTS)
  window.addEventListener("resize", onResize)

  perTarget.set(target.el, { matches, bounds, onScroll, onResize, io })
}
