import { traverseEditableContent, type EditableTarget } from "../lib/editable"

const MIRROR_PROPS = [
  "boxSizing",
  "width",
  "height",
  "paddingTop",
  "paddingRight",
  "paddingBottom",
  "paddingLeft",
  "borderTopWidth",
  "borderRightWidth",
  "borderBottomWidth",
  "borderLeftWidth",
  "fontFamily",
  "fontSize",
  "fontStyle",
  "fontVariant",
  "fontWeight",
  "fontStretch",
  "lineHeight",
  "letterSpacing",
  "wordSpacing",
  "textIndent",
  "textTransform",
  "textAlign",
  "whiteSpace",
  "wordWrap",
  "overflowWrap",
  "wordBreak",
  "tabSize",
  "direction"
] as const

let mirrorEl: HTMLDivElement | null = null

function getMirror(): HTMLDivElement {
  if (mirrorEl && mirrorEl.isConnected) return mirrorEl
  const div = document.createElement("div")
  div.style.position = "absolute"
  div.style.top = "-9999px"
  div.style.left = "-9999px"
  div.style.visibility = "hidden"
  div.style.overflow = "hidden"
  div.style.pointerEvents = "none"
  document.body.appendChild(div)
  mirrorEl = div
  return div
}

function copyStyles(from: HTMLElement, to: HTMLElement) {
  const cs = window.getComputedStyle(from)
  for (const prop of MIRROR_PROPS) {
    to.style.setProperty(
      prop.replace(/[A-Z]/g, (m) => "-" + m.toLowerCase()),
      cs.getPropertyValue(prop.replace(/[A-Z]/g, (m) => "-" + m.toLowerCase()))
    )
  }
}

export type Rect = { left: number; top: number; width: number; height: number }

export function rectsForInputRange(
  el: HTMLInputElement | HTMLTextAreaElement,
  start: number,
  end: number
): Rect[] {
  const value = el.value
  const safeEnd = Math.min(end, value.length)
  const safeStart = Math.min(start, safeEnd)
  if (safeStart >= safeEnd) return []

  const mirror = getMirror()
  copyStyles(el, mirror)
  // textarea wraps; input never wraps
  if (el instanceof HTMLInputElement) {
    mirror.style.whiteSpace = "pre"
  } else {
    mirror.style.whiteSpace = "pre-wrap"
    mirror.style.wordWrap = "break-word"
  }

  // Match the element's content-box width so wrapping aligns.
  const elRect = el.getBoundingClientRect()
  const cs = window.getComputedStyle(el)
  const padL = parseFloat(cs.paddingLeft) || 0
  const padR = parseFloat(cs.paddingRight) || 0
  const bL = parseFloat(cs.borderLeftWidth) || 0
  const bR = parseFloat(cs.borderRightWidth) || 0
  const innerWidth = elRect.width - padL - padR - bL - bR
  mirror.style.width = `${innerWidth}px`
  mirror.style.height = "auto"
  mirror.style.padding = "0"
  mirror.style.border = "0"

  // Build: prefix + <span>slice</span> + suffix.
  mirror.textContent = ""
  const before = document.createTextNode(value.slice(0, safeStart))
  const span = document.createElement("span")
  span.textContent = value.slice(safeStart, safeEnd)
  const after = document.createTextNode(value.slice(safeEnd))
  mirror.appendChild(before)
  mirror.appendChild(span)
  mirror.appendChild(after)

  // Measure relative to mirror, then translate back to viewport coords using
  // el's content-box origin (= elRect + padding/border + scroll offset).
  const mirrorRect = mirror.getBoundingClientRect()
  const originLeft = elRect.left + bL + padL - el.scrollLeft
  const originTop = elRect.top + (parseFloat(cs.borderTopWidth) || 0) +
    (parseFloat(cs.paddingTop) || 0) - el.scrollTop

  const rects: Rect[] = []
  for (const r of span.getClientRects()) {
    rects.push({
      left: originLeft + (r.left - mirrorRect.left),
      top: originTop + (r.top - mirrorRect.top),
      width: r.width,
      height: r.height
    })
  }
  return rects
}

// Mirrors the traversal used by readText so LanguageTool's character offsets
// (which include synthetic \n at block boundaries) map to the right text node.
// If the offset lands on a synthetic newline, we anchor at the end of the
// preceding text node so Range.setStart/setEnd has a real position.
function findTextNodeAtOffset(
  root: HTMLElement,
  offset: number
): { node: Text; localOffset: number } | null {
  let remaining = offset
  let lastText: Text | null = null
  let lastTextEnd = 0
  let result: { node: Text; localOffset: number } | null = null

  traverseEditableContent(root, {
    onText: (node, text) => {
      const len = text.length
      if (remaining <= len) {
        result = { node, localOffset: remaining }
        return true
      }
      remaining -= len
      lastText = node
      lastTextEnd = len
    },
    onNewline: () => {
      if (remaining < 1) {
        if (lastText) result = { node: lastText, localOffset: lastTextEnd }
        return true
      }
      remaining -= 1
    }
  })

  return result
}

export function rectsForContentEditableRange(
  el: HTMLElement,
  start: number,
  end: number
): Rect[] {
  const startInfo = findTextNodeAtOffset(el, start)
  const endInfo = findTextNodeAtOffset(el, end)
  if (!startInfo || !endInfo) return []
  const range = document.createRange()
  range.setStart(startInfo.node, startInfo.localOffset)
  range.setEnd(endInfo.node, endInfo.localOffset)
  const out: Rect[] = []
  for (const r of range.getClientRects()) {
    if (r.width === 0 && r.height === 0) continue
    out.push({ left: r.left, top: r.top, width: r.width, height: r.height })
  }
  return out
}

export function rectsForRange(
  target: EditableTarget,
  start: number,
  end: number
): Rect[] {
  if (target.kind === "contenteditable") {
    return rectsForContentEditableRange(target.el, start, end)
  }
  return rectsForInputRange(target.el, start, end)
}
