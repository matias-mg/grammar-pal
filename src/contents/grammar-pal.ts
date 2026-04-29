import type { PlasmoCSConfig } from "plasmo"

import { debounceForElement } from "../lib/debounce"
import { classifyEditable, readText, type EditableTarget } from "../lib/editable"
import { check } from "../lib/languagetool"
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
const inflight = new WeakMap<Element, AbortController>()

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

async function onDebouncedInput(target: EditableTarget) {
  const text = readText(target)
  if (text.length < MIN_TEXT_LENGTH) return

  const previous = inflight.get(target.el)
  previous?.abort()
  const controller = new AbortController()
  inflight.set(target.el, controller)

  try {
    const matches = await check(text, settings.mode, controller.signal)
    if (controller.signal.aborted) return
    // eslint-disable-next-line no-console
    console.log("[grammar-pal] matches", {
      kind: target.kind,
      mode: settings.mode,
      count: matches.length,
      matches
    })
  } catch (err) {
    if ((err as { name?: string }).name === "AbortError") return
    // eslint-disable-next-line no-console
    console.warn("[grammar-pal] check failed", err)
  }
}

init()
