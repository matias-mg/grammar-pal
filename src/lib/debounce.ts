const timers = new WeakMap<Element, Map<string, ReturnType<typeof setTimeout>>>()

export function debounceForElement(
  el: Element,
  fn: () => void,
  ms: number,
  key = "default"
): void {
  let perEl = timers.get(el)
  if (!perEl) {
    perEl = new Map()
    timers.set(el, perEl)
  }
  const existing = perEl.get(key)
  if (existing !== undefined) clearTimeout(existing)
  perEl.set(key, setTimeout(fn, ms))
}

export function cancelDebounceForElement(el: Element, key = "default"): void {
  const perEl = timers.get(el)
  const existing = perEl?.get(key)
  if (existing !== undefined) {
    clearTimeout(existing)
    perEl!.delete(key)
  }
}
