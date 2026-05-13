export type EditableTarget =
  | { kind: "input"; el: HTMLInputElement }
  | { kind: "textarea"; el: HTMLTextAreaElement }
  | { kind: "contenteditable"; el: HTMLElement }

const INPUT_TYPES = new Set(["text", "search", "email", "url"])

// Block-level tags that cause an implicit newline at their boundaries when
// reading a contenteditable as plain text. Tag-based detection avoids the
// per-element getComputedStyle cost and is sufficient for the editors we
// target (Twitter, LinkedIn, Reddit, Gmail).
const BLOCK_TAGS = new Set([
  "ADDRESS", "ARTICLE", "ASIDE", "BLOCKQUOTE", "DD", "DETAILS", "DIALOG",
  "DIV", "DL", "DT", "FIELDSET", "FIGCAPTION", "FIGURE", "FOOTER", "FORM",
  "H1", "H2", "H3", "H4", "H5", "H6", "HEADER", "HR", "LI", "MAIN", "NAV",
  "OL", "P", "PRE", "SECTION", "TABLE", "TD", "TH", "TR", "UL"
])

export function classifyEditable(node: EventTarget | null): EditableTarget | null {
  if (!(node instanceof HTMLElement)) return null

  if (node instanceof HTMLTextAreaElement) {
    return { kind: "textarea", el: node }
  }

  if (node instanceof HTMLInputElement) {
    const type = (node.type || "text").toLowerCase()
    if (INPUT_TYPES.has(type)) return { kind: "input", el: node }
    return null
  }

  const ce = node.closest('[contenteditable=""], [contenteditable="true"]')
  if (ce instanceof HTMLElement) {
    return { kind: "contenteditable", el: ce }
  }

  return null
}

export type EditableVisitor = {
  // Return true to stop traversal early.
  onText: (node: Text, text: string) => boolean | void
  onNewline: () => boolean | void
}

// Single source of truth for converting a contenteditable subtree into a
// linear character stream. Both readText and the underline-positioning code
// must walk identically — otherwise LanguageTool's offsets (computed against
// readText) won't line up with the Range we build to anchor the underline.
export function traverseEditableContent(
  root: HTMLElement,
  visitor: EditableVisitor
): void {
  let lastWasNewline = true
  let stopped = false

  function emitNewline(): void {
    if (stopped) return
    if (visitor.onNewline() === true) stopped = true
    lastWasNewline = true
  }

  function walk(node: Node): void {
    if (stopped) return
    if (node.nodeType === Node.TEXT_NODE) {
      const t = node as Text
      if (t.data.length === 0) return
      if (visitor.onText(t, t.data) === true) {
        stopped = true
        return
      }
      lastWasNewline = t.data.endsWith("\n")
      return
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return
    const e = node as Element
    const tag = e.tagName
    if (tag === "BR") {
      emitNewline()
      return
    }
    const block = e !== root && BLOCK_TAGS.has(tag)
    if (block && !lastWasNewline) emitNewline()
    if (stopped) return
    for (const child of Array.from(e.childNodes)) {
      walk(child)
      if (stopped) return
    }
    if (block && !lastWasNewline) emitNewline()
  }

  walk(root)
}

export function readText(target: EditableTarget): string {
  if (target.kind === "contenteditable") {
    const parts: string[] = []
    traverseEditableContent(target.el, {
      onText: (_, text) => {
        parts.push(text)
      },
      onNewline: () => {
        parts.push("\n")
      }
    })
    return parts.join("")
  }
  return target.el.value
}

// Strip `marker` from the very end of the field and fire a synthetic native
// `input` event so host frameworks (React-controlled inputs, character
// counters, etc.) re-read the field. Used by the polish "##" shortcut path
// so the marker never lands in the user's submitted text.
export function stripTrailingMarker(
  target: EditableTarget,
  marker: string
): boolean {
  if (marker.length === 0) return false

  if (target.kind === "input" || target.kind === "textarea") {
    const el = target.el
    if (!el.value.endsWith(marker)) return false
    const markerStart = el.value.length - marker.length
    const selectionStart = el.selectionStart
    const selectionEnd = el.selectionEnd
    const next = el.value.slice(0, -marker.length)
    const proto =
      target.kind === "textarea"
        ? HTMLTextAreaElement.prototype
        : HTMLInputElement.prototype
    const setter = Object.getOwnPropertyDescriptor(proto, "value")?.set
    if (setter) setter.call(el, next)
    else el.value = next
    el.dispatchEvent(new Event("input", { bubbles: true }))
    restoreInputSelection(el, markerStart, marker.length, selectionStart, selectionEnd)
    return true
  }

  const root = target.el
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  const tail: Text[] = []
  let n: Node | null = walker.nextNode()
  while (n) {
    tail.push(n as Text)
    n = walker.nextNode()
  }

  let suffix = ""
  for (let i = tail.length - 1; i >= 0 && suffix.length < marker.length; i--) {
    const t = tail[i]
    if (!t || t.data.length === 0) continue
    const needed = marker.length - suffix.length
    suffix = t.data.slice(Math.max(0, t.data.length - needed)) + suffix
  }
  if (suffix !== marker) return false

  let remaining = marker.length
  let caretNode: Text | null = null
  let caretOffset = 0
  for (let i = tail.length - 1; i >= 0 && remaining > 0; i--) {
    const t = tail[i]
    if (!t || t.data.length === 0) continue
    if (t.data.length >= remaining) {
      caretNode = t
      caretOffset = t.data.length - remaining
      t.data = t.data.slice(0, t.data.length - remaining)
      remaining = 0
    } else {
      remaining -= t.data.length
      t.data = ""
    }
  }
  root.dispatchEvent(new InputEvent("input", { bubbles: true }))
  if (caretNode) restoreContentEditableSelection(root, caretNode, caretOffset)
  return true
}

function restoreInputSelection(
  el: HTMLInputElement | HTMLTextAreaElement,
  markerStart: number,
  markerLength: number,
  selectionStart: number | null,
  selectionEnd: number | null
): void {
  if (selectionStart === null || selectionEnd === null) return

  const nextStart = adjustSelectionOffset(selectionStart, markerStart, markerLength)
  const nextEnd = adjustSelectionOffset(selectionEnd, markerStart, markerLength)
  const restore = () => {
    try {
      el.setSelectionRange(nextStart, nextEnd)
    } catch {
      // Some input types reject selection APIs despite being editable.
    }
  }

  restore()
  queueMicrotask(restore)
}

function adjustSelectionOffset(
  offset: number,
  markerStart: number,
  markerLength: number
): number {
  if (offset <= markerStart) return offset
  if (offset <= markerStart + markerLength) return markerStart
  return offset - markerLength
}

function restoreContentEditableSelection(
  root: HTMLElement,
  node: Text,
  offset: number
): void {
  const restore = () => {
    if (!node.isConnected) return
    const selection = window.getSelection()
    if (!selection) return

    try {
      root.focus({ preventScroll: true })
    } catch {
      root.focus()
    }

    const range = document.createRange()
    range.setStart(node, Math.min(offset, node.data.length))
    range.collapse(true)
    selection.removeAllRanges()
    selection.addRange(range)
  }

  restore()
  queueMicrotask(restore)
}
