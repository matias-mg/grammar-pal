const DEFAULT_CHANGE_RATIO = 0.03
const DEFAULT_MIN_CHANGED_CHARACTERS = 3

export const POLISH_TEXT_HISTORY_LIMIT = 8

export function rememberPolishText(
  history: Set<string>,
  text: string,
  limit = POLISH_TEXT_HISTORY_LIMIT
): void {
  history.delete(text)
  history.add(text)

  while (history.size > limit) {
    const oldest = history.values().next().value
    if (oldest === undefined) return
    history.delete(oldest)
  }
}

export function isMeaningfulPolishChange(
  previous: string,
  current: string,
  changeRatio = DEFAULT_CHANGE_RATIO,
  minChangedCharacters = DEFAULT_MIN_CHANGED_CHARACTERS
): boolean {
  if (previous === current) return false

  const longestLength = Math.max(previous.length, current.length, 1)
  const editsRequiredForRatio = Math.floor(longestLength * changeRatio) + 1
  const requiredEdits = Math.max(
    minChangedCharacters,
    editsRequiredForRatio
  )

  return editDistanceIsAtLeast(previous, current, requiredEdits)
}

// Determines whether the Levenshtein distance reaches `threshold` without
// calculating distances larger than that threshold. Polish only needs a
// yes/no answer for its change gate, and the narrow diagonal band keeps this
// inexpensive for the multi-thousand-character inputs the extension accepts.
function editDistanceIsAtLeast(
  left: string,
  right: string,
  threshold: number
): boolean {
  if (threshold <= 0) return true
  if (Math.abs(left.length - right.length) >= threshold) return true

  let start = 0
  const sharedLength = Math.min(left.length, right.length)
  while (start < sharedLength && left[start] === right[start]) start += 1

  let leftEnd = left.length
  let rightEnd = right.length
  while (
    leftEnd > start &&
    rightEnd > start &&
    left[leftEnd - 1] === right[rightEnd - 1]
  ) {
    leftEnd -= 1
    rightEnd -= 1
  }

  const leftLength = leftEnd - start
  const rightLength = rightEnd - start
  if (Math.max(leftLength, rightLength) < threshold) return false
  if (Math.abs(leftLength - rightLength) >= threshold) return true
  if (leftLength === 0 || rightLength === 0) {
    return Math.max(leftLength, rightLength) >= threshold
  }

  const capped = threshold
  let previous = new Uint32Array(rightLength + 1)
  let current = new Uint32Array(rightLength + 1)
  previous.fill(capped)
  for (let column = 0; column <= Math.min(rightLength, capped - 1); column++) {
    previous[column] = column
  }

  for (let row = 1; row <= leftLength; row++) {
    current.fill(capped)
    if (row < capped) current[0] = row

    const firstColumn = Math.max(1, row - capped + 1)
    const lastColumn = Math.min(rightLength, row + capped - 1)
    for (let column = firstColumn; column <= lastColumn; column++) {
      const substitutionCost =
        left[start + row - 1] === right[start + column - 1] ? 0 : 1
      current[column] = Math.min(
        capped,
        previous[column]! + 1,
        current[column - 1]! + 1,
        previous[column - 1]! + substitutionCost
      )
    }

    const swap = previous
    previous = current
    current = swap
  }

  return previous[rightLength]! >= threshold
}
