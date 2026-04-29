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
  petTooltipAlarmed: "Lots of issues — take a look."
} as const

export type StringKey = keyof typeof strings
