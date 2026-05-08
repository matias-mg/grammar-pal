export type Expression = "happy" | "neutral" | "curious" | "concerned" | "alarmed"

const FACE = (eyes: string, mouth: string, fill: string) => `
<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <circle cx="32" cy="32" r="28" fill="${fill}" stroke="#1f2328" stroke-width="2"/>
  ${eyes}
  ${mouth}
</svg>
`.trim()

const EYES_OPEN = `
  <circle cx="22" cy="28" r="3" fill="#1f2328"/>
  <circle cx="42" cy="28" r="3" fill="#1f2328"/>
`
const EYES_HALF = `
  <path d="M19 28 Q22 26 25 28" stroke="#1f2328" stroke-width="2.4" fill="none" stroke-linecap="round"/>
  <path d="M39 28 Q42 26 45 28" stroke="#1f2328" stroke-width="2.4" fill="none" stroke-linecap="round"/>
`
const EYES_WIDE = `
  <circle cx="22" cy="28" r="4" fill="#fff" stroke="#1f2328" stroke-width="1.5"/>
  <circle cx="42" cy="28" r="4" fill="#fff" stroke="#1f2328" stroke-width="1.5"/>
  <circle cx="22" cy="28" r="2" fill="#1f2328"/>
  <circle cx="42" cy="28" r="2" fill="#1f2328"/>
`

const MOUTH_HAPPY = `
  <path d="M22 42 Q32 50 42 42" stroke="#1f2328" stroke-width="2.4" fill="none" stroke-linecap="round"/>
`
const MOUTH_FLAT = `
  <path d="M24 44 H40" stroke="#1f2328" stroke-width="2.4" stroke-linecap="round"/>
`
const MOUTH_CURIOUS = `
  <circle cx="32" cy="44" r="2.4" fill="none" stroke="#1f2328" stroke-width="2"/>
`
const MOUTH_FROWN = `
  <path d="M22 46 Q32 40 42 46" stroke="#1f2328" stroke-width="2.4" fill="none" stroke-linecap="round"/>
`
const MOUTH_O = `
  <ellipse cx="32" cy="45" rx="4" ry="5" fill="#1f2328"/>
`

export const expressions: Record<Expression, string> = {
  happy:     FACE(EYES_HALF,  MOUTH_HAPPY,   "#fde68a"),
  neutral:   FACE(EYES_OPEN,  MOUTH_FLAT,    "#fde68a"),
  curious:   FACE(EYES_OPEN,  MOUTH_CURIOUS, "#fcd34d"),
  concerned: FACE(EYES_WIDE,  MOUTH_FROWN,   "#fbbf24"),
  alarmed:   FACE(EYES_WIDE,  MOUTH_O,       "#f87171")
}
