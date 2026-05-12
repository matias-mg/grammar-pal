export type PolishChange = {
  original: string
  replacement: string
  reason: string
}

export type PolishResult = {
  rewritten: string
  changes: PolishChange[]
}
