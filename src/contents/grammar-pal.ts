// Grammar Pal wires TWO independent engines into the same input listener:
//
//   • Harper (local, always-on): runs on a 400 ms debounce, key="default".
//     See src/background.ts. Produces underlines.
//
//   • Polish via Gemini (network, opt-in): runs on a 3500 ms debounce
//     (key="polish") AND on the "##" shortcut. See src/lib/engine-polish.ts.
//     Produces the polish panel.
//
// These engines must remain fully separate — never route grammar through
// Gemini, or polish through Harper. See CLAUDE.md "Dual-engine architecture".

import type { PlasmoCSConfig } from "plasmo"

import { cancelDebounceForElement, debounceForElement } from "../lib/debounce"
import {
  classifyEditable,
  readText,
  stripTrailingMarker,
  type EditableTarget
} from "../lib/editable"
import { check } from "../lib/engine"
import { polish } from "../lib/engine-polish"
import { getSettings, onSettingsChange } from "../lib/storage"
import { DEFAULT_SETTINGS, type Settings } from "../lib/types"
import { applyReplacement } from "../overlay/apply-replacement"
import {
  dismissPolishPanel,
  showPolishPanel
} from "../overlay/polish-panel"
import { showPolishToast } from "../overlay/polish-toast"
import {
  dismissSuggestionPopup,
  showSuggestionPopup
} from "../overlay/suggestion-popup"
import {
  clearUnderlines,
  renderUnderlines,
  setUnderlineClickHandler
} from "../overlay/underlines"
import {
  attachPetTo,
  detachPet,
  hidePet,
  setPetCount,
  setPetMode
} from "../pet/pet"

export const config: PlasmoCSConfig = {
  matches: ["<all_urls>"],
  run_at: "document_idle",
  all_frames: false
}

const DEBOUNCE_MS = 400
const MIN_TEXT_LENGTH = 5
const RECHECK_DELAY_MS = 50

const POLISH_DEBOUNCE_MS = 3500
const MIN_POLISH_LENGTH = 10
const POLISH_CHANGE_THRESHOLD = 0.03
const POLISH_TRIGGER = "##"

let settings: Settings = DEFAULT_SETTINGS
const inflight = new WeakMap<Element, AbortController>()
const knownTargets = new Set<EditableTarget>()
const lastCount = new WeakMap<Element, number>()
const englishTargets = new WeakSet<HTMLElement>()
let focusedTarget: EditableTarget | null = null

const polishInflight = new WeakMap<Element, AbortController>()
const lastPolishedText = new WeakMap<Element, string>()

function init() {
  void getSettings().then((s) => {
    settings = s
    setPetMode(s.mode)
    applyEnabledState()
  })
  onSettingsChange((s) => {
    const prev = settings
    settings = s
    setPetMode(s.mode)
    applyEnabledState()
    if (s.enabled && s.mode !== prev.mode) recheckAll()
    if (!s.polishEnabled) dismissPolishPanel()
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

      // Harper (always-on).
      debounceForElement(target.el, () => void runCheck(target), DEBOUNCE_MS)

      // Polish (opt-in).
      if (!settings.polishEnabled) return

      const text = readText(target)

      // Path B — "##" shortcut: strip marker, dispatch native input, fire now.
      if (text.endsWith(POLISH_TRIGGER)) {
        cancelDebounceForElement(target.el, "polish")
        const stripped = text.slice(0, -POLISH_TRIGGER.length)
        stripTrailingMarker(target, POLISH_TRIGGER)
        void runPolish(target, stripped, true)
        return
      }

      // Path A — 3.5 s debounce (subject to 3 % gate inside runPolish).
      debounceForElement(
        target.el,
        () => void runPolish(target, readText(target), false),
        POLISH_DEBOUNCE_MS,
        "polish"
      )
    },
    true
  )

  document.addEventListener(
    "focusin",
    (event) => {
      if (!settings.enabled) return
      const target = classifyEditable(event.target)
      if (!target) return
      focusedTarget = target
      if (englishTargets.has(target.el)) {
        attachPetTo(target.el)
        setPetCount(lastCount.get(target.el) ?? 0)
      } else {
        detachPet()
      }
    },
    true
  )

  document.addEventListener(
    "focusout",
    (event) => {
      if (!settings.enabled) return
      const target = classifyEditable(event.target)
      if (!target) return
      // Defer so a refocus to another editable field can take over first.
      setTimeout(() => {
        if (focusedTarget?.el === target.el) {
          focusedTarget = null
          detachPet()
          dismissPolishPanel()
        }
      }, 0)
    },
    true
  )
}

function applyEnabledState() {
  if (!settings.enabled) {
    clearAll()
    hidePet()
    dismissPolishPanel()
    return
  }
  if (focusedTarget && englishTargets.has(focusedTarget.el)) {
    attachPetTo(focusedTarget.el)
    setPetCount(lastCount.get(focusedTarget.el) ?? 0)
  }
}

function clearAll() {
  for (const t of knownTargets) clearUnderlines(t)
  knownTargets.clear()
  dismissSuggestionPopup()
}

function recheckAll() {
  dismissSuggestionPopup()
  for (const t of knownTargets) {
    clearUnderlines(t)
    void runCheck(t)
  }
}

async function runCheck(target: EditableTarget) {
  if (!settings.enabled) return
  const text = readText(target)
  if (text.length < MIN_TEXT_LENGTH) {
    clearUnderlines(target)
    lastCount.set(target.el, 0)
    if (focusedTarget?.el === target.el && englishTargets.has(target.el)) {
      setPetCount(0)
    }
    return
  }

  const previous = inflight.get(target.el)
  previous?.abort()
  const controller = new AbortController()
  inflight.set(target.el, controller)

  try {
    const result = await check(text, settings.mode, controller.signal)
    if (controller.signal.aborted) return

    if (!result.isEnglish) {
      englishTargets.delete(target.el)
      clearUnderlines(target)
      lastCount.set(target.el, 0)
      if (focusedTarget?.el === target.el) detachPet()
      return
    }

    englishTargets.add(target.el)
    knownTargets.add(target)
    renderUnderlines(target, result.matches)
    lastCount.set(target.el, result.matches.length)
    if (focusedTarget?.el === target.el) {
      attachPetTo(target.el)
      setPetCount(result.matches.length)
    }
  } catch (err) {
    if ((err as { name?: string }).name === "AbortError") return
    // eslint-disable-next-line no-console
    console.warn("[grammar-pal] check failed", err)
  }
}

async function runPolish(
  target: EditableTarget,
  text: string,
  fromShortcut: boolean
) {
  if (!settings.enabled || !settings.polishEnabled) return

  if (text.length < MIN_POLISH_LENGTH) return

  if (!fromShortcut) {
    const last = lastPolishedText.get(target.el)
    if (last !== undefined) {
      const newLen = text.length
      const oldLen = last.length
      const delta = Math.abs(newLen - oldLen) / Math.max(newLen, oldLen, 1)
      if (delta <= POLISH_CHANGE_THRESHOLD) return
    }
  }

  polishInflight.get(target.el)?.abort()
  const controller = new AbortController()
  polishInflight.set(target.el, controller)

  const result = await polish(text, controller.signal)
  if (controller.signal.aborted) return

  if (result === null) {
    showPolishToast(target)
    return
  }

  lastPolishedText.set(target.el, text)
  if (result.changes.length === 0) return

  showPolishPanel(target, result, () => {
    setTimeout(() => void runCheck(target), RECHECK_DELAY_MS)
  })
}

init()
