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
