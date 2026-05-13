import { strings } from "../lib/i18n"
import { getOverlayLayer } from "../lib/shadow-root"
import type { EditableTarget } from "../lib/editable"

type LoadingToken = symbol

type LoadingState = {
  el: HTMLDivElement
  io: IntersectionObserver
  onScroll: () => void
  onResize: () => void
  target: EditableTarget
  token: LoadingToken
}

const perTarget = new WeakMap<Element, LoadingState>()
const liveTargets = new Set<EditableTarget>()
const SCROLL_OPTS: AddEventListenerOptions = { capture: true, passive: true }

export function showPolishLoading(target: EditableTarget): LoadingToken {
  hidePolishLoading(target)

  const token = Symbol("polish-loading")
  const el = document.createElement("div")
  el.className = "polish-loading"
  el.setAttribute("role", "status")
  el.setAttribute("aria-live", "polite")
  el.textContent = strings.polishLoading

  const state: LoadingState = {
    el,
    io: new IntersectionObserver(() => positionLoading(state), {
      threshold: 0
    }),
    onScroll: () => positionLoading(state),
    onResize: () => positionLoading(state),
    target,
    token
  }

  getOverlayLayer().appendChild(el)
  state.io.observe(target.el)
  window.addEventListener("scroll", state.onScroll, SCROLL_OPTS)
  window.addEventListener("resize", state.onResize)
  perTarget.set(target.el, state)
  liveTargets.add(target)
  positionLoading(state)

  return token
}

export function hidePolishLoading(
  target: EditableTarget,
  token?: LoadingToken
): void {
  const state = perTarget.get(target.el)
  if (!state) return
  if (token && state.token !== token) return

  state.el.remove()
  state.io.disconnect()
  window.removeEventListener("scroll", state.onScroll, SCROLL_OPTS)
  window.removeEventListener("resize", state.onResize)
  perTarget.delete(target.el)
  liveTargets.delete(state.target)
}

export function hideAllPolishLoading(): void {
  for (const target of Array.from(liveTargets)) {
    hidePolishLoading(target)
  }
}

function positionLoading(state: LoadingState): void {
  if (!state.target.el.isConnected) {
    hidePolishLoading(state.target, state.token)
    return
  }

  const targetRect = state.target.el.getBoundingClientRect()
  const loadingRect = state.el.getBoundingClientRect()
  const gap = 8
  const top =
    targetRect.top >= loadingRect.height + gap
      ? targetRect.top - loadingRect.height - gap
      : targetRect.bottom + gap
  const left = Math.max(
    8,
    Math.min(
      targetRect.right - loadingRect.width,
      window.innerWidth - loadingRect.width - 8
    )
  )

  state.el.style.left = `${left}px`
  state.el.style.top = `${Math.max(8, top)}px`
}
