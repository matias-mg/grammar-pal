// Ambient typings for the Chromium built-in Prompt API (Chrome 148+ in
// extensions). Covers only what Grammar Pal calls — extend as needed.

type LanguageModelAvailability =
  | "available"
  | "downloadable"
  | "downloading"
  | "unavailable"

type LanguageModelExpected = {
  type: "text"
  languages?: string[]
}

type LanguageModelOptions = {
  expectedInputs?: LanguageModelExpected[]
  expectedOutputs?: LanguageModelExpected[]
}

type LanguageModelInitialPrompt = {
  role: "system" | "user" | "assistant"
  content: string
}

type DownloadProgressEvent = Event & { loaded: number }

type LanguageModelMonitor = {
  addEventListener(
    type: "downloadprogress",
    listener: (event: DownloadProgressEvent) => void
  ): void
}

type LanguageModelCreateOptions = LanguageModelOptions & {
  initialPrompts?: LanguageModelInitialPrompt[]
  temperature?: number
  topK?: number
  signal?: AbortSignal
  monitor?: (m: LanguageModelMonitor) => void
}

type LanguageModelPromptOptions = {
  signal?: AbortSignal
  responseConstraint?: unknown
  omitResponseConstraintInput?: boolean
}

interface LanguageModelSession {
  prompt(input: string, options?: LanguageModelPromptOptions): Promise<string>
  promptStreaming(
    input: string,
    options?: LanguageModelPromptOptions
  ): AsyncIterable<string>
  clone(options?: { signal?: AbortSignal }): Promise<LanguageModelSession>
  destroy(): void
  readonly contextUsage: number
  readonly contextWindow: number
}

interface LanguageModelStatic {
  availability(options?: LanguageModelOptions): Promise<LanguageModelAvailability>
  create(options?: LanguageModelCreateOptions): Promise<LanguageModelSession>
  params(): Promise<{
    defaultTopK: number
    maxTopK: number
    defaultTemperature: number
    maxTemperature: number
  }>
}

declare const LanguageModel: LanguageModelStatic | undefined
