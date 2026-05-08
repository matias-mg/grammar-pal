export type Mode = "formal" | "chill"

export type Settings = {
  enabled: boolean
  mode: Mode
}

export const DEFAULT_SETTINGS: Settings = {
  enabled: true,
  mode: "formal"
}

export type Category = "grammar" | "style" | "other"

export type Match = {
  offset: number
  length: number
  message: string
  replacements: string[]
  category: Category
}
