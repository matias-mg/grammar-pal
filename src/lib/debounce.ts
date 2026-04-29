const timers = new WeakMap<Element, ReturnType<typeof setTimeout>>()

export function debounceForElement(
  el: Element,
  fn: () => void,
  ms: number
): void {
  const existing = timers.get(el)
  if (existing !== undefined) clearTimeout(existing)
  timers.set(el, setTimeout(fn, ms))
}

export function cancelDebounceForElement(el: Element): void {
  const existing = timers.get(el)
  if (existing !== undefined) {
    clearTimeout(existing)
    timers.delete(el)
  }
}
