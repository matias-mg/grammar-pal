export type Mode = "formal" | "chill"

export type LocalAiDownloadChoice = "accepted" | "rejected" | null

export type Settings = {
  enabled: boolean
  mode: Mode
  polishEnabled: boolean
  localAiDownloadChoice: LocalAiDownloadChoice
}

export const DEFAULT_SETTINGS: Settings = {
  enabled: true,
  mode: "formal",
  polishEnabled: true,
  localAiDownloadChoice: null
}

export type Category = "grammar" | "style" | "other"

export type Match = {
  offset: number
  length: number
  message: string
  replacements: string[]
  category: Category
}
