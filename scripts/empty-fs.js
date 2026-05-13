// Stub for Node's `fs` in the browser bundle.
//
// harper.js (BinaryModule-*.js) contains a guarded `await import("fs")` for
// its Node code path. It uses /* webpackIgnore */ and /* @vite-ignore */
// magic comments, but Parcel (used by Plasmo) doesn't honor those, so it
// resolves the import to its empty Node-polyfill — which it emits as an
// async chunk named `_empty.<hash>.js`. Chrome rejects unpacked extensions
// containing files whose name starts with `_`.
//
// Aliasing `fs` to this file (see `alias` in root package.json) routes the
// chunk through our filename instead, sidestepping the underscore prefix.
// The Node code path in harper.js is gated by `typeof process !== "undefined"`
// and never runs in the extension at runtime, so the contents are irrelevant.
export default {}
