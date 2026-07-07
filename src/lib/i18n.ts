export const strings = {
  popupTitle: "Grammar Pal",
  popupFooter: "Pick a mode and start typing anywhere.",
  loading: "Loading…",

  enabledLabel: "Enabled",
  modeLabel: "Mode",
  modeFormal: "Formal",
  modeChill: "Chill",

  applyLabel: "Apply",
  noSuggestions: "No suggestions available.",
  suggestionTitle: "Suggestion",

  petTooltipHappy: "All clean!",
  petTooltipNeutral: "A couple things to look at.",
  petTooltipCurious: "Some issues found.",
  petTooltipConcerned: "Several issues to fix.",
  petTooltipAlarmed: "Lots of issues — take a look.",

  polishLabel: "Polish to native (uses AI, opt-in)",
  polishPrivacyPrefix: "Your text is sent to Google's AI. See ",
  polishPrivacyLink: "privacy policy",
  polishPrivacySuffix: ".",
  polishTitle: "Polish to native English",
  polishAccept: "Accept",
  polishSkip: "Skip",
  polishLoading: "AI checking...",
  polishPopoverAriaLabel: "Polish suggestion",
  polishToastError: "Polish unavailable, try again shortly",

  localAiModalTitle: "Make Grammar Pal much faster and fully private",
  localAiModalBody:
    "One-time download for faster suggestions, offline support, and full privacy.",
  localAiModalBodyLearnMorePrefix: " Learn more ",
  localAiModalBodyLearnMoreLink: "here",
  localAiModalBodyLearnMoreUrl: "https://developer.chrome.com/docs/ai/prompt-api",
  localAiModalBodyLearnMoreUrlEdge:
    "https://learn.microsoft.com/en-us/microsoft-edge/web-platform/prompt-api",
  localAiModalNote: "Powered by your browser’s official local AI — not by Grammar Pal.",
  localAiModalAccept: "Enable local AI",
  localAiModalReject: "Not now",
  localAiModalAriaLabel: "Enable local AI",

  popupPolishPrivacyLocal:
    "Running locally via your browser's built-in AI — your text never leaves your device.",

  edgeLocalAiHintPrefix: "Using cloud AI. To enable on-device AI on Edge, install ",
  edgeLocalAiHintCanaryLink: "Edge Canary or Dev",
  edgeLocalAiHintCanaryUrl: "https://www.microsoft.com/edge/download/insider",
  edgeLocalAiHintMiddle: " and enable ",
  edgeLocalAiHintFlagLink: "the Prompt API flag",
  edgeLocalAiHintFlagUrl:
    "edge://flags",
  edgeLocalAiHintSuffix: "."
} as const

export type StringKey = keyof typeof strings
