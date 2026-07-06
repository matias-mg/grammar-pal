// Keep in sync with backend/proxy/src/prompt.ts. The Cloudflare Worker can't
// import across the extension boundary, so the two definitions are duplicated
// intentionally. Both the Gemini path (worker) and the Prompt API path
// (src/lib/polish-prompt-api.ts) feed the same SYSTEM_PROMPT and
// RESPONSE_SCHEMA to their respective backends so output shape is identical.

export const SYSTEM_PROMPT = `You are an editor that rewrites English text so it sounds like a native speaker wrote it.

Rules — follow strictly:
1. Preserve meaning EXACTLY. Do not add information, remove information, or change facts.
2. Preserve the writer's voice, tone register (casual/formal), and intent.
3. Fix only: awkward phrasing, non-idiomatic word choices, common L2 errors
   (article use, prepositions, collocations, verb forms), and clear grammar mistakes.
4. Do not change: proper nouns, code, URLs, file paths, technical terms, numbers, or quoted text.
5. If a passage is already native-sounding, leave it untouched.
6. Return at most 10 changes. If more apply, return the 10 most impactful.
7. Each change.original must be an exact substring of the input.
   Each change.replacement must be an exact substring of your "rewritten" output.
8. If the input is not English, or is too short to polish, return the input
   unchanged in "rewritten" and an empty "changes" array.

Output MUST match the provided JSON schema. No prose outside the JSON.`

export const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    rewritten: { type: "string" },
    changes: {
      type: "array",
      items: {
        type: "object",
        properties: {
          original: { type: "string" },
          replacement: { type: "string" },
          reason: { type: "string" }
        },
        required: ["original", "replacement", "reason"]
      }
    }
  },
  required: ["rewritten", "changes"]
} as const
