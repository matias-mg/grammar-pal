import type { PlasmoCSConfig } from "plasmo"

import { debounceForElement } from "../lib/debounce"
import { classifyEditable, readText, type EditableTarget } from "../lib/editable"
import { getSettings, onSettingsChange } from "../lib/storage"
import { DEFAULT_SETTINGS, type Settings } from "../lib/types"

export const config: PlasmoCSConfig = {
  matches: ["<all_urls>"],
  run_at: "document_idle",
  all_frames: false
}

const DEBOUNCE_MS = 800
const MIN_TEXT_LENGTH = 5

let settings: Settings = DEFAULT_SETTINGS

function init() {
  void getSettings().then((s) => {
    settings = s
  })
  onSettingsChange((s) => {
    settings = s
  })

  document.addEventListener(
    "input",
    (event) => {
      if (!settings.enabled) return
      const target = classifyEditable(event.target)
      if (!target) return
      debounceForElement(target.el, () => onDebouncedInput(target), DEBOUNCE_MS)
    },
    true
  )
}

function onDebouncedInput(target: EditableTarget) {
  const text = readText(target)
  if (text.length < MIN_TEXT_LENGTH) return
  // Commit 4 wires this into the LanguageTool client.
  // For now, just log so we can verify the detection + debounce path.
  // eslint-disable-next-line no-console
  console.log("[grammar-pal]", {
    targetTag: target.el.tagName.toLowerCase(),
    kind: target.kind,
    mode: settings.mode,
    textPreview: text.slice(0, 80)
  })
}

init()
