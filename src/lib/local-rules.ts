import type { Category, Match } from "./types"

type LocalRule = {
  pattern: RegExp
  replacements: string[] | ((match: RegExpMatchArray) => string[])
  message: string
  category: Category
}

const PAST_PARTICIPLES: Record<string, string> = {
  went: "gone",
  ate: "eaten",
  wrote: "written",
  did: "done",
  saw: "seen",
  took: "taken",
  spoke: "spoken",
  ran: "run",
  drank: "drunk",
  swam: "swum",
  broke: "broken",
  chose: "chosen",
  rode: "ridden",
  threw: "thrown",
  forgot: "forgotten",
  stole: "stolen",
  gave: "given",
  knew: "known",
  grew: "grown",
  drew: "drawn",
  blew: "blown",
  flew: "flown"
}

// Curated rules covering fundamental English errors the free LanguageTool
// tier misses or under-flags. Patterns stay narrow on purpose so the open
// web stays close to zero false positives.
const RULES: LocalRule[] = [
  // Make / take / do / have collocations
  {
    pattern: /\btake (a|the) decision\b/gi,
    replacements: (m) => [`make ${m[1]} decision`],
    message:
      'In standard English, decisions are made, not taken. Try "make a/the decision".',
    category: "grammar"
  },
  {
    pattern: /\btaking a decision\b/gi,
    replacements: ["making a decision"],
    message: 'Decisions are made, not taken. Try "making a decision".',
    category: "grammar"
  },
  {
    pattern: /\bdo (a|the) (mistake|decision)\b/gi,
    replacements: (m) => [`make ${m[1]} ${m[2]}`],
    message: 'Use "make" with mistakes and decisions, not "do".',
    category: "grammar"
  },
  {
    pattern: /\bdid a mistake\b/gi,
    replacements: ["made a mistake"],
    message: 'Mistakes are made, not done. Try "made a mistake".',
    category: "grammar"
  },
  {
    pattern: /\bmake (a|an|the) question\b/gi,
    replacements: (m) => [`ask ${m[1]} question`],
    message: `In English, you "ask" a question — you don't "make" one.`,
    category: "grammar"
  },
  {
    pattern: /\bmake (a|the) (photo|picture)\b/gi,
    replacements: (m) => [`take ${m[1]} ${m[2]}`],
    message: 'Photos and pictures are "taken" in English, not "made".',
    category: "grammar"
  },
  {
    pattern: /\bmake (a|the) (shower|bath)\b/gi,
    replacements: (m) => [`take ${m[1]} ${m[2]}`],
    message: 'You "take" a shower or a bath in English.',
    category: "grammar"
  },
  {
    pattern: /\bdo (a|the) party\b/gi,
    replacements: (m) => [`have ${m[1]} party`, `throw ${m[1]} party`],
    message: 'In English, you "have" or "throw" a party — not "do" one.',
    category: "grammar"
  },

  // Verb + preposition
  {
    pattern: /\bsay me\b/gi,
    replacements: ["tell me"],
    message: `"Say" doesn't take an indirect object — use "tell me" instead.`,
    category: "grammar"
  },
  {
    pattern: /\bexplain me\b/gi,
    replacements: ["explain to me"],
    message: '"Explain" needs "to" before the listener — "explain to me".',
    category: "grammar"
  },
  {
    pattern: /\b(tell|tells|told|telling) to (me|him|her|us|them|you)\b/gi,
    replacements: (m) => [`${m[1]} ${m[2]}`],
    message: '"Tell" takes its indirect object directly, with no "to".',
    category: "grammar"
  },
  {
    pattern: /\bdiscuss about\b/gi,
    replacements: ["discuss"],
    message: '"Discuss" is followed directly by its object — drop "about".',
    category: "grammar"
  },
  {
    pattern: /\b(depend|depends|depended|depending) of\b/gi,
    replacements: (m) => [`${m[1]} on`],
    message: 'Use "depend on", not "depend of".',
    category: "grammar"
  },
  {
    pattern: /\bmarried with (him|her|them|me|us|you)\b/gi,
    replacements: (m) => [`married to ${m[1]}`],
    message: 'Use "married to" when referring to a spouse.',
    category: "grammar"
  },
  {
    pattern:
      /\blisten(s|ed|ing)? (music|songs|a song|the radio|the podcast|podcasts)\b/gi,
    replacements: (m) => [`listen${m[1] ?? ""} to ${m[2]}`],
    message: 'Use "listen to" before the thing you are listening to.',
    category: "grammar"
  },
  {
    pattern: /\bsame like\b/gi,
    replacements: ["same as"],
    message: 'The standard collocation is "same as", not "same like".',
    category: "grammar"
  },

  // Modal + "of" instead of "have"
  {
    pattern: /\b(could|would|should|must|might) of\b/gi,
    replacements: (m) => [`${m[1]} have`],
    message: `After a modal, use "have", not "of". The contraction "could've" sounds like "could of" but is spelled "could have".`,
    category: "grammar"
  },

  // Common confusions
  {
    pattern: /\balot\b/gi,
    replacements: ["a lot"],
    message: '"Alot" is not a word — write "a lot" as two words.',
    category: "grammar"
  },
  {
    pattern: /\birregardless\b/gi,
    replacements: ["regardless"],
    message: '"Irregardless" is non-standard — use "regardless".',
    category: "grammar"
  },
  {
    pattern: /\byour welcome\b/gi,
    replacements: ["you're welcome"],
    message: `"You're welcome" is the contraction of "you are welcome". "Your" shows possession.`,
    category: "grammar"
  },
  {
    pattern: /\bbetween you and I\b/gi,
    replacements: ["between you and me"],
    message:
      'After a preposition, use the object pronoun "me". "Between you and me" is correct.',
    category: "grammar"
  },
  {
    pattern: /\b(for|to|with|about|from|by) (you|him|her|us|them) and I\b/gi,
    replacements: (m) => [`${m[1]} ${m[2]} and me`],
    message: `After a preposition, use "me", not "I". Test it by removing the other person: "for me" sounds right; "for I" doesn't.`,
    category: "grammar"
  },

  // Double comparatives / superlatives
  {
    pattern:
      /\bmore (better|easier|harder|worse|faster|slower|bigger|smaller|stronger|weaker|happier|sadder|younger|older|richer|poorer|warmer|colder|nearer|cheaper|cleaner|safer|nicer|kinder|smarter|deeper|higher|lower|longer|shorter|wider|brighter|darker|louder|quieter|softer|fresher|busier|prettier|funnier|simpler)\b/gi,
    replacements: (m) => [m[1]!],
    message:
      'Avoid double comparatives — the "-er" ending already means "more X".',
    category: "grammar"
  },
  {
    pattern:
      /\bmost (best|easiest|hardest|worst|fastest|slowest|biggest|smallest|strongest|weakest|happiest|saddest|youngest|oldest|richest|poorest|warmest|coldest|nearest|cheapest|cleanest|safest|nicest|kindest|smartest|deepest|highest|lowest|longest|shortest|widest|brightest|darkest|loudest|quietest|softest|freshest|busiest|prettiest|funniest|simplest)\b/gi,
    replacements: (m) => [m[1]!],
    message:
      'Avoid double superlatives — the "-est" ending already means "most X".',
    category: "grammar"
  },

  // Subject-verb agreement
  {
    pattern: /\b(he|she|it) don't\b/gi,
    replacements: (m) => [`${m[1]} doesn't`],
    message: `Use "doesn't" with he, she, or it (third person singular).`,
    category: "grammar"
  },
  {
    pattern: /\b(they|we|you) was\b/gi,
    replacements: (m) => [`${m[1]} were`],
    message: 'Use "were" with we, you, or they (not "was").',
    category: "grammar"
  },

  // Past participle after have / has / had
  {
    pattern:
      /\b(have|has|had|haven't|hasn't|hadn't|having)\s+(went|ate|wrote|did|saw|took|spoke|ran|drank|swam|broke|chose|rode|threw|forgot|stole|gave|knew|grew|drew|blew|flew)\b/gi,
    replacements: (m) => {
      const aux = m[1]!
      const verb = m[2]!.toLowerCase()
      const correct = PAST_PARTICIPLES[verb] ?? m[2]!
      return [`${aux} ${correct}`]
    },
    message:
      'After have/has/had, use the past participle (e.g. "have gone", not "have went").',
    category: "grammar"
  },

  // Article a / an before vowel/consonant sound
  {
    pattern:
      /\ba (apple|orange|elephant|umbrella|island|hour|honest|honor|heir|idea|item|onion|open|enemy|engineer|article|answer)\b/gi,
    replacements: (m) => [`an ${m[1]}`],
    message: 'Use "an" before words that begin with a vowel sound.',
    category: "grammar"
  },
  {
    pattern:
      /\ban (university|universal|unit|union|user|unique|useful|usual|uniform|european|euro|one|once)\b/gi,
    replacements: (m) => [`a ${m[1]}`],
    message: `Use "a" before words that begin with a consonant sound, even if spelled with a vowel ("a university" sounds like "yoo-niversity").`,
    category: "grammar"
  },

  // Yes/no question inversion — first-person "I" pairs with am/was/etc.
  {
    pattern:
      /(?<=^|[.!?,;:]\s+)I\s+(am|was|can|could|should|would|will|do|did|have|had|might|must)\s+(\S[^?!.,]*)\?/gi,
    replacements: (m) => [`${m[1]!.toLowerCase()} I ${m[2]}?`],
    message:
      "In a question, the auxiliary verb usually comes before the subject.",
    category: "grammar"
  },
  // Plural / second person — "you", "we", "they" — paired with are/were/do/have.
  {
    pattern:
      /(?<=^|[.!?,;:]\s+)(you|we|they)\s+(are|were|can|could|should|would|will|do|did|have|had|might|must)\s+(\S[^?!.,]*)\?/gi,
    replacements: (m) => [
      `${m[2]!.toLowerCase()} ${m[1]!.toLowerCase()} ${m[3]}?`
    ],
    message:
      "In a question, the auxiliary verb usually comes before the subject.",
    category: "grammar"
  },
  // Third-person singular — "he", "she", "it" — paired with is/was/does/has.
  {
    pattern:
      /(?<=^|[.!?,;:]\s+)(he|she|it)\s+(is|was|can|could|should|would|will|does|did|has|had|might|must)\s+(\S[^?!.,]*)\?/gi,
    replacements: (m) => [
      `${m[2]!.toLowerCase()} ${m[1]!.toLowerCase()} ${m[3]}?`
    ],
    message:
      "In a question, the auxiliary verb usually comes before the subject.",
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
      const raw =
        typeof rule.replacements === "function"
          ? rule.replacements(m)
          : rule.replacements
      out.push({
        offset,
        length: matched.length,
        message: rule.message,
        replacements: raw.map((r) => preserveCase(matched, r)),
        category: rule.category
      })
    }
  }
  return out
}
