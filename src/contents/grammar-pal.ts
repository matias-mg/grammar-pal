import type { PlasmoCSConfig } from "plasmo"

import { debounceForElement } from "../lib/debounce"
import { classifyEditable, readText, type EditableTarget } from "../lib/editable"
import { check } from "../lib/languagetool"
import { getSettings, onSettingsChange } from "../lib/storage"
import { DEFAULT_SETTINGS, type Settings } from "../lib/types"
import { applyReplacement } from "../overlay/apply-replacement"
import {
  dismissSuggestionPopup,
  showSuggestionPopup
} from "../overlay/suggestion-popup"
import {
  clearUnderlines,
  renderUnderlines,
  setUnderlineClickHandler
} from "../overlay/underlines"

export const config: PlasmoCSConfig = {
  matches: ["<all_urls>"],
  run_at: "document_idle",
  all_frames: false
}

const DEBOUNCE_MS = 800
const MIN_TEXT_LENGTH = 5
const RECHECK_DELAY_MS = 50

let settings: Settings = DEFAULT_SETTINGS
const inflight = new WeakMap<Element, AbortController>()
const knownTargets = new Set<EditableTarget>()

function init() {
  void getSettings().then((s) => {
    settings = s
    if (!settings.enabled) clearAll()
  })
  onSettingsChange((s) => {
    settings = s
    if (!settings.enabled) clearAll()
  })

  setUnderlineClickHandler((target, match, span) => {
    const rect = span.getBoundingClientRect()
    showSuggestionPopup(
      { left: rect.left, top: rect.top, width: rect.width, height: rect.height },
      match,
      (replacement) => {
        applyReplacement(target, match.offset, match.offset + match.length, replacement)
        clearUnderlines(target)
        setTimeout(() => void runCheck(target), RECHECK_DELAY_MS)
      }
    )
  })

  document.addEventListener(
    "input",
    (event) => {
      if (!settings.enabled) return
      const target = classifyEditable(event.target)
      if (!target) return
      dismissSuggestionPopup()
      clearUnderlines(target)
      debounceForElement(target.el, () => void runCheck(target), DEBOUNCE_MS)
    },
    true
  )
}

function clearAll() {
  for (const t of knownTargets) clearUnderlines(t)
  knownTargets.clear()
  dismissSuggestionPopup()
}

async function runCheck(target: EditableTarget) {
  if (!settings.enabled) return
  const text = readText(target)
  if (text.length < MIN_TEXT_LENGTH) {
    clearUnderlines(target)
    return
  }

  const previous = inflight.get(target.el)
  previous?.abort()
  const controller = new AbortController()
  inflight.set(target.el, controller)

  try {
    const matches = await check(text, settings.mode, controller.signal)
    if (controller.signal.aborted) return
    knownTargets.add(target)
    renderUnderlines(target, matches)
  } catch (err) {
    if ((err as { name?: string }).name === "AbortError") return
    // eslint-disable-next-line no-console
    console.warn("[grammar-pal] check failed", err)
  }
}

init()
