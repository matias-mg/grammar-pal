export type Mode = "formal" | "chill"

export type Settings = {
  enabled: boolean
  mode: Mode
  polishEnabled: boolean
}

export const DEFAULT_SETTINGS: Settings = {
  enabled: true,
  mode: "formal",
  polishEnabled: false
}

export type Category = "grammar" | "style" | "other"

export type Match = {
  offset: number
  length: number
  message: string
  replacements: string[]
  category: Category
}
