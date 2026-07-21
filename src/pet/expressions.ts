import type { Pal } from "../lib/types"

export type Expression =
  | "happy"
  | "neutral"
  | "curious"
  | "concerned"
  | "alarmed"

const CLASSIC_FACE = (
  expression: Expression,
  eyes: string,
  mouth: string,
  fill: string
) => `
<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false" data-pal="classic" data-expression="${expression}">
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

export const classicExpressions: Record<Expression, string> = {
  happy: CLASSIC_FACE("happy", EYES_HALF, MOUTH_HAPPY, "#fde68a"),
  neutral: CLASSIC_FACE("neutral", EYES_OPEN, MOUTH_FLAT, "#fde68a"),
  curious: CLASSIC_FACE("curious", EYES_OPEN, MOUTH_CURIOUS, "#fcd34d"),
  concerned: CLASSIC_FACE("concerned", EYES_WIDE, MOUTH_FROWN, "#fbbf24"),
  alarmed: CLASSIC_FACE("alarmed", EYES_WIDE, MOUTH_O, "#f87171")
}

const CAT_COAT_LIGHT = "#d8d5ce"
const CAT_COAT_MID = "#bbb7ae"
const CAT_COAT_DARK = "#cac5bc"
const CAT_PAW = "#d6d3cb"
const CAT_INNER_EAR = "#aaa7a0"
const CAT_LINE = "#3a3f46"
const CAT_IRIS = "#4d8588"
const CAT_BLUSH = "#d99b9b"

const CAT_EYE = (cx: number, extra = "") => `
  <ellipse cx="${cx}" cy="43" rx="1.75" ry="2.35" fill="${CAT_IRIS}" stroke="${CAT_LINE}" stroke-width="1"/>
  <circle cx="${cx - 0.45}" cy="42.2" r="0.38" fill="#eef7f5"/>
  ${extra}
`

const CAT_FRAME = (expression: Expression, face: string) => `
<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false" data-pal="cat" data-expression="${expression}">
  <defs>
    <linearGradient id="cat-coat-${expression}" x1="10" y1="8" x2="53" y2="57" gradientUnits="userSpaceOnUse">
      <stop stop-color="${CAT_COAT_LIGHT}"/>
      <stop offset=".56" stop-color="${CAT_COAT_MID}"/>
      <stop offset="1" stop-color="${CAT_COAT_DARK}"/>
    </linearGradient>
  </defs>
  <path
    d="M8.4 53.7 5.2 50.8l1.3-3.2-3.7-4.2 5-2.7c-.7-5.7-.2-11.6 1.4-17.2L8.9 10.2c-.1-3.7 2.2-4.8 5.2-2.7l11.1 9.2c4.8-1.6 10-1.6 15.3.1l9.3-8.1c1.8-1.6 3.2-.5 5 .1 3 1 3.9 3.1 3.4 6.3l-.4 5.9c2 5.5 2.5 12.5-.5 19.8l4.7 2.6-3.4 4.1 1.2 3.3-3.5 3.2C50 57 43 58 32 58s-18-1-23.6-4.3Z"
    fill="url(#cat-coat-${expression})"
    stroke="${CAT_LINE}"
    stroke-width="1.25"
    stroke-linejoin="round"/>
  <path d="m12 9.8 9.5 7.8-10.2 4.3Z" fill="${CAT_INNER_EAR}" opacity=".78"/>
  <path d="m50.8 10.7-7.2 6.8 10.8 3.5Z" fill="${CAT_INNER_EAR}" opacity=".78"/>
  <path d="M50.1 10.3c2.1 2.8 4.6 4.4 7.8 4.7" fill="none" stroke="${CAT_LINE}" stroke-width="1.1" stroke-linecap="round"/>
  ${face}
  <path
    d="M3.5 54.94c.1-3.15 2.8-4.83 6.1-4.69 3.5.14 6 2.03 5.9 4.76-.1 2.66-2.2 3.99-5.3 3.99H7.8c-2.7 0-4.4-1.47-4.3-4.06Z"
    fill="${CAT_PAW}"
    stroke="${CAT_LINE}"
    stroke-width="1.2"/>
  <path d="M7.4 55.78v1.54c0 .7.6 1.05 1.5 1.05m2.5-2.59v1.54c0 .7-.6 1.05-1.5 1.05" fill="none" stroke="${CAT_LINE}" stroke-width=".9" stroke-linecap="round"/>
  <path
    d="M48.5 54.94c.1-2.73 2.6-4.62 6.1-4.76 3.3-.14 5.9 1.54 5.9 4.69.1 2.59-1.6 4.06-4.3 4.06h-2.4c-3.1 0-5.2-1.33-5.3-3.99Z"
    fill="${CAT_PAW}"
    stroke="${CAT_LINE}"
    stroke-width="1.2"/>
  <path d="M52.6 55.78v1.54c0 .7.6 1.05 1.5 1.05m2.5-2.59v1.54c0 .7-.6 1.05-1.5 1.05" fill="none" stroke="${CAT_LINE}" stroke-width=".9" stroke-linecap="round"/>
</svg>
`.trim()

const CAT_HAPPY_FACE = `
  <path d="M17.3 43.3Q20 40.85 22.7 43.3M41.3 43.3Q44 40.85 46.7 43.3" fill="none" stroke="${CAT_LINE}" stroke-width="1.15" stroke-linecap="round"/>
  <ellipse cx="15.9" cy="47.1" rx="2.1" ry=".85" fill="${CAT_BLUSH}" opacity=".45"/>
  <ellipse cx="48.1" cy="47.1" rx="2.1" ry=".85" fill="${CAT_BLUSH}" opacity=".45"/>
  <path d="M30.7 47.2Q32 46.4 33.3 47.2 32 48.6 30.7 47.2Z" fill="${CAT_LINE}"/>
  <path d="M32 48.4v.8m0 0c-1.3 1.9-3.2 2.2-4.7.7m4.7-.7c1.3 1.9 3.2 2.2 4.7.7" fill="none" stroke="${CAT_LINE}" stroke-width="1.05" stroke-linecap="round"/>
`

const CAT_FIRST_ISSUE_FACE = `
  ${CAT_EYE(20)}
  ${CAT_EYE(44)}
  <path d="M30.7 47.6Q32 46.8 33.3 47.6 32 49 30.7 47.6Z" fill="${CAT_LINE}"/>
  <path d="M32 48.6v1m0 0c-.8 1.1-1.8 1.2-2.6.45m2.6-.45c.8 1.1 1.8 1.2 2.6.45" fill="none" stroke="${CAT_LINE}" stroke-width="1.25" stroke-linecap="round"/>
`

const CAT_NEUTRAL_FACE = `
  ${CAT_EYE(20)}
  ${CAT_EYE(44)}
  <path d="M30.7 47.6Q32 46.8 33.3 47.6 32 49 30.7 47.6Z" fill="${CAT_LINE}"/>
  <path d="M29.9 50.2h4.2" fill="none" stroke="${CAT_LINE}" stroke-width="1.25" stroke-linecap="round"/>
`

const CAT_CURIOUS_FACE = `
  ${CAT_EYE(20)}
  ${CAT_EYE(44)}
  <path d="M17.6 38.4c1.7-.8 3.5-.9 5.2-.3M41.8 38.2c1.5-.4 3-.2 4.4.5" fill="none" stroke="${CAT_LINE}" stroke-width="1.1" stroke-linecap="round"/>
  <path d="M30.7 47.6Q32 46.8 33.3 47.6 32 49 30.7 47.6Z" fill="${CAT_LINE}"/>
  <ellipse cx="32" cy="50.7" rx="1.05" ry="1.2" fill="none" stroke="${CAT_LINE}" stroke-width="1.1"/>
`

const CAT_CONCERNED_FACE = `
  ${CAT_EYE(20)}
  ${CAT_EYE(44)}
  <path d="M17.8 38.1c1.6-.5 3.2-.3 4.7.6M41.5 38.7c1.5-.9 3.1-1.1 4.7-.6" fill="none" stroke="${CAT_LINE}" stroke-width="1.2" stroke-linecap="round"/>
  <path d="M30.7 47.6Q32 46.8 33.3 47.6 32 49 30.7 47.6Z" fill="${CAT_LINE}"/>
  <path d="M29.8 51.2c1.4-1.1 3-1.1 4.4 0" fill="none" stroke="${CAT_LINE}" stroke-width="1.25" stroke-linecap="round"/>
`

export const catExpressions: Record<Expression, string> = {
  happy: CAT_FRAME("happy", CAT_HAPPY_FACE),
  neutral: CAT_FRAME("neutral", CAT_FIRST_ISSUE_FACE),
  curious: CAT_FRAME("curious", CAT_NEUTRAL_FACE),
  concerned: CAT_FRAME("concerned", CAT_CURIOUS_FACE),
  alarmed: CAT_FRAME("alarmed", CAT_CONCERNED_FACE)
}

export const expressions: Record<Pal, Record<Expression, string>> = {
  cat: catExpressions,
  classic: classicExpressions
}

export function expressionFor(pal: Pal, expression: Expression): string {
  return expressions[pal][expression]
}
