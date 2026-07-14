// Grammar Pal wires TWO independent engines into the same input listener:
//
//   • Harper (local, always-on): runs on a 400 ms debounce, key="default".
//     See src/background.ts. Produces underlines.
//
//   • Polish via Gemini (network, opt-in): runs on a 3500 ms debounce
//     (key="polish") AND on the "##" shortcut. See src/lib/engine-polish.ts.
//     Produces animated Gemini-gradient underlines (polish-underlines.ts);
//     clicking one opens a per-chunk Accept/Skip popover.
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
import {
  getPolishBackend,
  polish,
  triggerLocalAiDownload,
  type PolishBackendKind
} from "../lib/engine-polish"
import {
  isMeaningfulPolishChange,
  rememberPolishText
} from "../lib/polish-state"
import { getSettings, onSettingsChange, setSettings } from "../lib/storage"
import { DEFAULT_SETTINGS, type Settings } from "../lib/types"
import { applyReplacement } from "../overlay/apply-replacement"
import {
  dismissLocalAiModal,
  isLocalAiModalOpen,
  showLocalAiModal
} from "../overlay/local-ai-modal"
import {
  dismissPolishPopover,
  showPolishPopover
} from "../overlay/polish-popover"
import {
  hideAllPolishLoading,
  hidePolishLoading,
  showPolishLoading
} from "../overlay/polish-loading"
import { showPolishToast } from "../overlay/polish-toast"
import {
  clearPolishUnderlines,
  getPolishTargets,
  removePolishAnchor,
  renderPolishUnderlines,
  setPolishUnderlineClickHandler,
  setPolishUnderlineInteractionStartHandler,
  shiftPolishAnchorsAfter
} from "../overlay/polish-underlines"
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

const POLISH_DEBOUNCE_GEMINI_MS = 3500
const POLISH_DEBOUNCE_PROMPT_API_MS = 1500
const MIN_POLISH_LENGTH = 10
const POLISH_CHANGE_THRESHOLD = 0.03
const POLISH_TRIGGER = "##"
const POLISH_FOCUSOUT_GRACE_MS = 500
const CONTENT_INSTANCE_KEY = "__grammarPalContentInstance"

let settings: Settings = DEFAULT_SETTINGS
let polishBackend: PolishBackendKind = "gemini"
let polishDebounceMs = POLISH_DEBOUNCE_GEMINI_MS
let modalShownThisSession = false
const inflight = new WeakMap<Element, AbortController>()
const knownTargets = new Set<EditableTarget>()
const lastCount = new WeakMap<Element, number>()
const englishTargets = new WeakSet<HTMLElement>()
let focusedTarget: EditableTarget | null = null

const polishInflight = new WeakMap<Element, AbortController>()
const lastPolishedText = new WeakMap<Element, string>()
const polishTextHistory = new WeakMap<Element, Set<string>>()
// Host editors may echo an accepted replacement through a later input or DOM
// mutation. Matching the resulting text is durable; a microtask-only flag is
// not, especially in React and ProseMirror editors.
const expectedAppliedPolishText = new WeakMap<Element, string>()
const lastSeenText = new WeakMap<Element, string>()
// Suppresses the input-listener clear for the synthetic input event fired by
// applyReplacement when we accept a polish change — otherwise the act of
// accepting one chunk would wipe the remaining polish underlines.
const applyingPolish = new WeakSet<Element>()

// MutationObserver fallback for hosts that swallow the native `input` event.
// Concrete repro: ChatGPT's compose box (ProseMirror) does not fire `input`
// on Ctrl+A + Delete, so the input-listener cleanup never runs and the
// underlines float above text that no longer exists. The MO catches the
// DOM mutation directly and runs the same cleanup path.
const domObservers = new WeakMap<Element, MutationObserver>()
let lastPolishInteractionAt = 0

function rememberSettledPolishText(el: Element, text: string): void {
  let history = polishTextHistory.get(el)
  if (!history) {
    history = new Set<string>()
    polishTextHistory.set(el, history)
  }
  rememberPolishText(history, text)
  lastPolishedText.set(el, text)
}

function hasSettledPolishText(el: Element, text: string): boolean {
  return polishTextHistory.get(el)?.has(text) ?? false
}

function isExpectedPolishApplication(el: Element, text: string): boolean {
  const expected = expectedAppliedPolishText.get(el)
  if (expected === undefined) return false
  if (expected === text) return true
  if (!applyingPolish.has(el)) expectedAppliedPolishText.delete(el)
  return false
}

type ContentInstance = {
  cleanup: () => void
}

function attachMutationObserver(target: EditableTarget): void {
  if (target.kind !== "contenteditable") return
  if (domObservers.has(target.el)) return
  lastSeenText.set(target.el, readText(target))
  const observer = new MutationObserver(() => handleEditableMutation(target))
  observer.observe(target.el, {
    childList: true,
    characterData: true,
    subtree: true
  })
  domObservers.set(target.el, observer)
}

function detachMutationObserver(el: Element): void {
  const observer = domObservers.get(el)
  if (!observer) return
  observer.disconnect()
  domObservers.delete(el)
}

function handleEditableMutation(target: EditableTarget): void {
  if (!settings.enabled) return

  const text = readText(target)
  if (lastSeenText.get(target.el) === text) return
  lastSeenText.set(target.el, text)

  const isApplying =
    applyingPolish.has(target.el) ||
    isExpectedPolishApplication(target.el, text)

  dismissSuggestionPopup()
  clearUnderlines(target)
  if (!isApplying) {
    dismissPolishPopover()
    clearPolishUnderlines(target)
    hidePolishLoading(target)
    polishInflight.get(target.el)?.abort()
  }
  inflight.get(target.el)?.abort()

  if (text.trim().length === 0) {
    cancelDebounceForElement(target.el)
    cancelDebounceForElement(target.el, "polish")
    polishInflight.get(target.el)?.abort()
    if (isApplying) {
      clearPolishUnderlines(target)
      dismissPolishPopover()
    }
    lastCount.set(target.el, 0)
    if (focusedTarget?.el === target.el && englishTargets.has(target.el)) {
      setPetCount(0)
    }
  }
  // No runCheck scheduling here. For normal typing the native `input` event
  // fires alongside the mutation and handles re-checking; for the swallowed-
  // input case (Ctrl+A + Delete) the field is empty so there's nothing to
  // check.
}

function init(): () => void {
  const listenerAbort = new AbortController()
  void getSettings().then((s) => {
    if (listenerAbort.signal.aborted) return
    settings = s
    setPetMode(s.mode)
    applyEnabledState()
  })
  void getPolishBackend().then((backend) => {
    if (listenerAbort.signal.aborted) return
    polishBackend = backend
    polishDebounceMs =
      backend === "prompt-api"
        ? POLISH_DEBOUNCE_PROMPT_API_MS
        : POLISH_DEBOUNCE_GEMINI_MS
  })
  const unsubscribeSettings = onSettingsChange((s) => {
    if (listenerAbort.signal.aborted) return
    const prev = settings
    settings = s
    setPetMode(s.mode)
    applyEnabledState()
    if (s.enabled && s.mode !== prev.mode) recheckAll()
    if (!s.polishEnabled) {
      clearAllPolish()
      dismissLocalAiModal()
    }
  })

  setPolishUnderlineInteractionStartHandler(() => {
    lastPolishInteractionAt = performance.now()
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

  setPolishUnderlineClickHandler((target, anchor, span) => {
    const rect = span.getBoundingClientRect()
    showPolishPopover(
      { left: rect.left, top: rect.top, width: rect.width, height: rect.height },
      anchor.change,
      {
        onAccept: () => {
          // Re-verify the substring at offset before mutating — text may have
          // drifted between render and click. On mismatch, drop just this
          // anchor and bail silently.
          const current = readText(target)
          const slice = current.slice(
            anchor.offset,
            anchor.offset + anchor.length
          )
          if (slice !== anchor.change.original) {
            removePolishAnchor(target, anchor)
            return
          }
          const nextText =
            current.slice(0, anchor.offset) +
            anchor.change.replacement +
            current.slice(anchor.offset + anchor.length)
          expectedAppliedPolishText.set(target.el, nextText)
          cancelDebounceForElement(target.el, "polish")
          polishInflight.get(target.el)?.abort()
          applyingPolish.add(target.el)
          try {
            applyReplacement(
              target,
              anchor.offset,
              anchor.offset + anchor.length,
              anchor.change.replacement
            )
            const appliedText = readText(target)
            if (appliedText === nextText) {
              rememberSettledPolishText(target.el, appliedText)
            } else {
              expectedAppliedPolishText.delete(target.el)
            }
          } finally {
            queueMicrotask(() => applyingPolish.delete(target.el))
          }
          const delta = anchor.change.replacement.length - anchor.length
          removePolishAnchor(target, anchor)
          if (delta !== 0) {
            shiftPolishAnchorsAfter(target, anchor.offset, delta)
          }
          setTimeout(() => void runCheck(target), RECHECK_DELAY_MS)
        },
        onSkip: () => {
          removePolishAnchor(target, anchor)
        }
      }
    )
  })

  document.addEventListener(
    "input",
    (event) => {
      if (!settings.enabled) return
      const target = classifyEditable(event.target)
      if (!target) return
      const text = readText(target)

      // Synthetic input event from applyReplacement when accepting a polish
      // chunk — preserve remaining polish underlines and don't kick the
      // polish debounce. Harper still clears and re-checks normally so its
      // offsets stay accurate against the new text.
      const isApplying =
        applyingPolish.has(target.el) ||
        isExpectedPolishApplication(target.el, text)

      dismissSuggestionPopup()
      clearUnderlines(target)
      if (!isApplying) {
        dismissPolishPopover()
        clearPolishUnderlines(target)
        hidePolishLoading(target)
        polishInflight.get(target.el)?.abort()
      }

      // Abort any in-flight Harper check synchronously. Otherwise a check
      // kicked off against pre-edit text can resolve after the user has
      // cleared the field (Ctrl+A + Delete) and re-paint stale underlines
      // anchored to text that no longer exists.
      inflight.get(target.el)?.abort()

      lastSeenText.set(target.el, text)

      // Fast-path for an emptied / whitespace-only field: cancel pending
      // work, reset counters, and don't bother queuing Harper or polish.
      // The clearUnderlines() above has already wiped the overlay.
      if (text.trim().length === 0) {
        cancelDebounceForElement(target.el)
        cancelDebounceForElement(target.el, "polish")
        polishInflight.get(target.el)?.abort()
        // Wipe polish state even on the applying path: an empty field has
        // no surviving anchors to preserve.
        if (isApplying) {
          clearPolishUnderlines(target)
          dismissPolishPopover()
        }
        lastCount.set(target.el, 0)
        if (focusedTarget?.el === target.el && englishTargets.has(target.el)) {
          setPetCount(0)
        }
        return
      }

      // Harper (always-on).
      debounceForElement(target.el, () => void runCheck(target), DEBOUNCE_MS)

      // Polish (opt-in).
      if (!settings.polishEnabled) return
      if (isApplying) return

      // Path B — "##" shortcut: strip marker, dispatch native input, fire now.
      const triggerStart = findTrailingPolishTrigger(text)
      if (triggerStart >= 0) {
        const stripped =
          text.slice(0, triggerStart) +
          text.slice(triggerStart + POLISH_TRIGGER.length)
        const removed = stripTrailingMarker(target, POLISH_TRIGGER)
        if (!removed) return
        // Cancel AFTER stripTrailingMarker: the synthetic input event it
        // dispatches re-enters this listener and (because the text no longer
        // ends with the trigger) schedules a fresh polish debounce, which
        // would fire a second Gemini call 3.5 s later against the same text.
        cancelDebounceForElement(target.el, "polish")
        void runPolish(target, stripped, true)
        return
      }

      // Path A — debounced polish (1.5 s for Prompt API / 3.5 s for Gemini),
      // subject to 3 % gate inside runPolish.
      debounceForElement(
        target.el,
        () => void runPolish(target, readText(target), false),
        polishDebounceMs,
        "polish"
      )

      maybeOfferLocalAiDownload()
    },
    { capture: true, signal: listenerAbort.signal }
  )

  document.addEventListener(
    "focusin",
    (event) => {
      if (!settings.enabled) return
      const target = classifyEditable(event.target)
      if (!target) return
      focusedTarget = target
      attachMutationObserver(target)
      if (!lastPolishedText.has(target.el)) {
        rememberSettledPolishText(target.el, readText(target))
      }
      if (englishTargets.has(target.el)) {
        attachPetTo(target.el)
        setPetCount(lastCount.get(target.el) ?? 0)
      } else {
        detachPet()
      }
    },
    { capture: true, signal: listenerAbort.signal }
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
          const justClickedPolish =
            performance.now() - lastPolishInteractionAt <
            POLISH_FOCUSOUT_GRACE_MS
          if (justClickedPolish) return
          focusedTarget = null
          detachPet()
          dismissPolishPopover()
          detachMutationObserver(target.el)
        }
      }, 0)
    },
    { capture: true, signal: listenerAbort.signal }
  )

  return () => {
    listenerAbort.abort()
    unsubscribeSettings()
    setPolishUnderlineInteractionStartHandler(null)
    clearAll()
    clearAllPolish()
    dismissLocalAiModal()
    hidePet()
    if (focusedTarget) {
      detachMutationObserver(focusedTarget.el)
      focusedTarget = null
    }
  }
}

function applyEnabledState() {
  if (!settings.enabled) {
    clearAll()
    hidePet()
    clearAllPolish()
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

function clearAllPolish() {
  for (const t of getPolishTargets()) {
    clearPolishUnderlines(t)
    hidePolishLoading(t)
  }
  hideAllPolishLoading()
  dismissPolishPopover()
}

function maybeOfferLocalAiDownload(): void {
  if (modalShownThisSession) return
  if (!settings.polishEnabled) return
  if (polishBackend !== "downloadable") return
  if (settings.localAiDownloadChoice !== null) return
  if (isLocalAiModalOpen()) return
  modalShownThisSession = true
  showLocalAiModal({
    onAccept: async () => {
      await setSettings({ localAiDownloadChoice: "accepted" })
      // Fire-and-forget: the download can take a long time. The cached
      // backend will flip to "prompt-api" once the worker finishes, and the
      // 1.5 s debounce will kick in on the next browser session.
      void triggerLocalAiDownload()
    },
    onReject: async () => {
      await setSettings({ localAiDownloadChoice: "rejected" })
    }
  })
}

function findTrailingPolishTrigger(text: string): number {
  const effectiveEnd = text.replace(/[\r\n]+$/u, "").length
  if (effectiveEnd < POLISH_TRIGGER.length) return -1
  const start = effectiveEnd - POLISH_TRIGGER.length
  return text.slice(start, effectiveEnd) === POLISH_TRIGGER ? start : -1
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

    // Belt-and-suspenders against the Ctrl+A + Delete race: if the field's
    // text changed while Harper was running, the match offsets no longer
    // line up with the DOM. Drop this result; the next debounced runCheck
    // will repaint against the current text.
    if (readText(target) !== text) {
      clearUnderlines(target)
      return
    }

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
    if (hasSettledPolishText(target.el, text)) return

    const last = lastPolishedText.get(target.el)
    if (
      last !== undefined &&
      !isMeaningfulPolishChange(last, text, POLISH_CHANGE_THRESHOLD)
    ) return
  }

  polishInflight.get(target.el)?.abort()
  const controller = new AbortController()
  polishInflight.set(target.el, controller)

  const loadingToken = showPolishLoading(target)
  let result: Awaited<ReturnType<typeof polish>>
  try {
    result = await polish(text, controller.signal)
  } finally {
    hidePolishLoading(target, loadingToken)
  }
  if (controller.signal.aborted) return
  if (readText(target) !== text) return

  if (result === null) {
    showPolishToast(target)
    return
  }

  rememberSettledPolishText(target.el, text)
  if (result.changes.length === 0) return

  renderPolishUnderlines(target, result.changes)
}

const globalState = globalThis as typeof globalThis & {
  [CONTENT_INSTANCE_KEY]?: ContentInstance
}
globalState[CONTENT_INSTANCE_KEY]?.cleanup()
globalState[CONTENT_INSTANCE_KEY] = { cleanup: init() }
