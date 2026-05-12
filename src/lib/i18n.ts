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
  polishRewriteHeader: "Suggested rewrite (preview):",
  polishChangesHeader: "Changes",
  polishAccept: "Accept",
  polishSkip: "Skip",
  polishAcceptAll: "Accept all",
  polishDismiss: "Dismiss",
  polishCardApplied: "✓ applied",
  polishCardSkipped: "skipped",
  polishCardNotFound: "✓ (already applied or no longer present)",
  polishToastError: "Polish unavailable, try again shortly"
} as const

export type StringKey = keyof typeof strings
