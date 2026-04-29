export type EditableTarget =
  | { kind: "input"; el: HTMLInputElement }
  | { kind: "textarea"; el: HTMLTextAreaElement }
  | { kind: "contenteditable"; el: HTMLElement }

const INPUT_TYPES = new Set(["text", "search", "email", "url"])

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

export function readText(target: EditableTarget): string {
  if (target.kind === "contenteditable") return target.el.innerText
  return target.el.value
}
