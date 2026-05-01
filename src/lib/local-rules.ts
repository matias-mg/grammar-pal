import type { Category, Match } from "./types"

type LocalRule = {
  pattern: RegExp
  replacements: string[]
  message: string
  category: Category
}

// Collocation errors the free LanguageTool tier misses (Premium-only rules).
// Keep patterns conservative to avoid false positives on the open web.
const RULES: LocalRule[] = [
  {
    pattern: /\btake a decision\b/gi,
    replacements: ["make a decision"],
    message:
      'Did you mean "make a decision"? In standard English, decisions are made, not taken.',
    category: "grammar"
  },
  {
    pattern: /\btake the decision\b/gi,
    replacements: ["make the decision"],
    message:
      'Did you mean "make the decision"? In standard English, decisions are made, not taken.',
    category: "grammar"
  },
  {
    pattern: /\btaking a decision\b/gi,
    replacements: ["making a decision"],
    message: 'Did you mean "making a decision"?',
    category: "grammar"
  },
  {
    pattern: /\bdo a mistake\b/gi,
    replacements: ["make a mistake"],
    message: 'Did you mean "make a mistake"? Mistakes are made, not done.',
    category: "grammar"
  },
  {
    pattern: /\bdid a mistake\b/gi,
    replacements: ["made a mistake"],
    message: 'Did you mean "made a mistake"?',
    category: "grammar"
  },
  {
    pattern: /\bdo a decision\b/gi,
    replacements: ["make a decision"],
    message: 'Did you mean "make a decision"?',
    category: "grammar"
  },
  {
    pattern: /\bsay me\b/gi,
    replacements: ["tell me"],
    message: 'Did you mean "tell me"? Use "tell" with an indirect object.',
    category: "grammar"
  },
  {
    pattern: /\bexplain me\b/gi,
    replacements: ["explain to me"],
    message: 'Use "explain to me" — "explain" takes "to" before the listener.',
    category: "grammar"
  }
]

function preserveCase(original: string, replacement: string): string {
  const first = original.charAt(0)
  const replFirst = replacement.charAt(0)
  if (!first || !replFirst) return replacement
  if (first === first.toUpperCase() && first !== first.toLowerCase()) {
    return replFirst.toUpperCase() + replacement.slice(1)
  }
  return replacement
}

export function runLocalRules(text: string): Match[] {
  const out: Match[] = []
  for (const rule of RULES) {
    for (const m of text.matchAll(rule.pattern)) {
      const offset = m.index ?? 0
      const matched = m[0]
      out.push({
        offset,
        length: matched.length,
        message: rule.message,
        replacements: rule.replacements.map((r) => preserveCase(matched, r)),
        category: rule.category
      })
    }
  }
  return out
}
