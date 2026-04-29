import type { EditableTarget } from "../lib/editable"

function findTextNodeAtOffset(
  root: Node,
  offset: number
): { node: Text; localOffset: number } | null {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  let remaining = offset
  let node: Node | null = walker.nextNode()
  while (node) {
    const t = node as Text
    const len = t.data.length
    if (remaining <= len) return { node: t, localOffset: remaining }
    remaining -= len
    node = walker.nextNode()
  }
  return null
}

function applyToInputOrTextarea(
  el: HTMLInputElement | HTMLTextAreaElement,
  start: number,
  end: number,
  replacement: string
): void {
  // setRangeText is the cleanest path on input/textarea; fall back to the
  // React-friendly native setter so controlled components (Twitter, LinkedIn)
  // re-read state on the dispatched input event.
  if (typeof el.setRangeText === "function") {
    try {
      el.focus({ preventScroll: true })
      el.setRangeText(replacement, start, end, "end")
      el.dispatchEvent(new Event("input", { bubbles: true }))
      el.dispatchEvent(new Event("change", { bubbles: true }))
      return
    } catch {
      // fall through
    }
  }

  const next = el.value.slice(0, start) + replacement + el.value.slice(end)
  const proto =
    el instanceof HTMLTextAreaElement
      ? HTMLTextAreaElement.prototype
      : HTMLInputElement.prototype
  const setter = Object.getOwnPropertyDescriptor(proto, "value")?.set
  if (setter) setter.call(el, next)
  else el.value = next
  el.dispatchEvent(new Event("input", { bubbles: true }))
  el.dispatchEvent(new Event("change", { bubbles: true }))
}

function applyToContentEditable(
  el: HTMLElement,
  start: number,
  end: number,
  replacement: string
): void {
  const startInfo = findTextNodeAtOffset(el, start)
  const endInfo = findTextNodeAtOffset(el, end)
  if (!startInfo || !endInfo) return

  const range = document.createRange()
  range.setStart(startInfo.node, startInfo.localOffset)
  range.setEnd(endInfo.node, endInfo.localOffset)

  const sel = window.getSelection()
  if (!sel) return
  sel.removeAllRanges()
  sel.addRange(range)
  el.focus({ preventScroll: true })

  // execCommand is deprecated but is the most reliable path that preserves
  // the host editor's undo stack and triggers framework-level updates.
  const ok = document.execCommand("insertText", false, replacement)
  if (ok) return

  // Fallback: mutate the range directly and dispatch an input event.
  range.deleteContents()
  range.insertNode(document.createTextNode(replacement))
  el.dispatchEvent(new InputEvent("input", { bubbles: true, data: replacement }))
}

export function applyReplacement(
  target: EditableTarget,
  start: number,
  end: number,
  replacement: string
): void {
  if (target.kind === "contenteditable") {
    applyToContentEditable(target.el, start, end, replacement)
  } else {
    applyToInputOrTextarea(target.el, start, end, replacement)
  }
}
