// One-time consent modal asking the user whether to download the browser's
// on-device Prompt API model. Triggered by src/contents/grammar-pal.ts when:
//   - settings.polishEnabled === true
//   - backend resolution returned "downloadable"
//   - settings.localAiDownloadChoice is null (no prior decision)
// Stays in the shadow root and dismisses itself on any choice.

import { strings } from "../lib/i18n"
import { getOverlayLayer } from "../lib/shadow-root"

export type LocalAiModalActions = {
  onAccept: () => Promise<void> | void
  onReject: () => Promise<void> | void
}

let currentEl: HTMLDivElement | null = null

export function dismissLocalAiModal(): void {
  if (currentEl) {
    currentEl.remove()
    currentEl = null
  }
}

export function isLocalAiModalOpen(): boolean {
  return currentEl !== null
}

export function showLocalAiModal(actions: LocalAiModalActions): void {
  if (currentEl) return
  const layer = getOverlayLayer()

  const modal = document.createElement("div")
  modal.className = "local-ai-modal"
  modal.setAttribute("role", "dialog")
  modal.setAttribute("aria-label", strings.localAiModalAriaLabel)
  modal.addEventListener("mousedown", (ev) => ev.stopPropagation())

  const title = document.createElement("p")
  title.className = "local-ai-modal__title"
  title.textContent = strings.localAiModalTitle
  modal.appendChild(title)

  const body = document.createElement("p")
  body.className = "local-ai-modal__body"
  body.textContent = strings.localAiModalBody
  body.appendChild(document.createTextNode(strings.localAiModalBodyLearnMorePrefix))
  const learnMore = document.createElement("a")
  const isEdge =
    typeof navigator !== "undefined" && navigator.userAgent.includes("Edg/")
  learnMore.href = isEdge
    ? strings.localAiModalBodyLearnMoreUrlEdge
    : strings.localAiModalBodyLearnMoreUrl
  learnMore.target = "_blank"
  learnMore.rel = "noopener noreferrer"
  learnMore.textContent = strings.localAiModalBodyLearnMoreLink
  body.appendChild(learnMore)
  body.appendChild(document.createTextNode("."))
  modal.appendChild(body)

  const note = document.createElement("p")
  note.className = "local-ai-modal__note"
  note.textContent = strings.localAiModalNote
  modal.appendChild(note)

  const actionsEl = document.createElement("div")
  actionsEl.className = "local-ai-modal__actions"

  const reject = document.createElement("button")
  reject.type = "button"
  reject.className = "local-ai-modal__btn"
  reject.textContent = strings.localAiModalReject
  reject.addEventListener("click", async (ev) => {
    ev.preventDefault()
    ev.stopPropagation()
    await actions.onReject()
    dismissLocalAiModal()
  })
  actionsEl.appendChild(reject)

  const accept = document.createElement("button")
  accept.type = "button"
  accept.className = "local-ai-modal__btn local-ai-modal__btn--primary"
  accept.textContent = strings.localAiModalAccept
  accept.addEventListener("click", async (ev) => {
    ev.preventDefault()
    ev.stopPropagation()
    accept.disabled = true
    reject.disabled = true
    try {
      await actions.onAccept()
    } finally {
      dismissLocalAiModal()
    }
  })
  actionsEl.appendChild(accept)

  modal.appendChild(actionsEl)
  layer.appendChild(modal)
  currentEl = modal
}
