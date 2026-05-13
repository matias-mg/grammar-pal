// Parcel (Plasmo's bundler) doesn't follow harper.js's package.json
// "exports" map, so we import from the dist files directly. TypeScript's
// resolver doesn't see those deep paths as declared, so we re-export the
// same types from the canonical subpaths it does understand.
declare module "harper.js/dist/index.js" {
  export * from "harper.js"
}
declare module "harper.js/dist/binaryInlined.js" {
  export { binaryInlined } from "harper.js/binaryInlined"
}
