export const strings = {
  popupTitle: "Grammar Pal",
  popupFooter: "Pick a mode and start typing anywhere.",
  loading: "Loading…",

  enabledLabel: "Enabled",
  modeLabel: "Mode",
  modeFormal: "Formal",
  modeFormalDescription: "Stricter checks for work, school, and polished writing.",
  modeChill: "Chill",
  modeChillDescription: "Lighter suggestions that keep casual wording and tone.",
  palLabel: "Pal",
  palCatName: "Cat",
  palCatDescription: "Quiet, warm, and focused.",
  palClassicName: "Classic",
  palClassicDescription: "The original round pal.",

  applyLabel: "Apply",
  noSuggestions: "No suggestions available.",
  suggestionTitle: "Suggestion",

  petTooltipHappy: "All clean!",
  petTooltipNeutral: "A couple things to look at.",
  petTooltipCurious: "Some issues found.",
  petTooltipConcerned: "Several issues to fix.",
  petTooltipAlarmed: "Lots of issues — take a look.",

  polishLabel: "Polish to native (uses AI, opt-in)",
  polishCloudBadge: "Cloudflare AI fallback",
  polishCloudTitle: "Cloud polish is active",
  polishCloudBody:
    "Your browser's local AI is not ready, so polish suggestions use Gemma 4 on Cloudflare Workers AI. Local AI is usually faster and keeps your text on this device.",
  polishPrivacyPrefix: "See Cloudflare's ",
  polishPrivacyLink: "privacy policy",
  polishPrivacyUrl: "https://www.cloudflare.com/privacypolicy/",
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

  edgeLocalAiHintPrefix: "To use local AI on Edge, install ",
  edgeLocalAiHintCanaryLink: "Edge Canary or Dev",
  edgeLocalAiHintCanaryUrl: "https://www.microsoft.com/edge/download/insider",
  edgeLocalAiHintMiddle: " and enable ",
  edgeLocalAiHintFlagLink: "the Prompt API flag",
  edgeLocalAiHintFlagUrl:
    "edge://flags",
  edgeLocalAiHintSuffix: "."
} as const

export type StringKey = keyof typeof strings
