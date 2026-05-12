// Chrome rejects unpacked extensions that contain files starting with `_`
// (the prefix is reserved for system use). Parcel — which Plasmo bundles
// with — emits `_empty.<hash>.js` stubs for Node builtins that get
// polyfilled to nothing in the browser (harper.js pulls some in).
//
// This script walks the build output, renames any file whose basename
// starts with `_` to drop the prefix, and patches every reference inside
// the bundled JS so the runtime asset registry still resolves.
//
// Wired into `pnpm build` as a post-step.
import { promises as fs } from "node:fs"
import { dirname, join, relative } from "node:path"
import { fileURLToPath } from "node:url"

const here = dirname(fileURLToPath(import.meta.url))
const buildDirs = [
  join(here, "..", "build", "chrome-mv3-prod"),
  join(here, "..", "build", "chrome-mv3-dev")
]

async function walk(dir) {
  const out = []
  let entries
  try {
    entries = await fs.readdir(dir, { withFileTypes: true })
  } catch {
    return out
  }
  for (const e of entries) {
    const p = join(dir, e.name)
    if (e.isDirectory()) out.push(...(await walk(p)))
    else out.push(p)
  }
  return out
}

export async function fixDir(root) {
  const files = await walk(root)
  if (files.length === 0) return false

  const renames = []
  for (const file of files) {
    const base = file.split(/[\\/]/).pop()
    if (base.startsWith("_")) {
      const newBase = base.replace(/^_+/, "x_")
      const newPath = join(file, "..", newBase)
      renames.push({ from: file, to: newPath, oldBase: base, newBase })
    }
  }

  if (renames.length === 0) return false

  const textExts = /\.(js|mjs|cjs|json|html|css|map)$/
  const patchTargets = files.filter((f) => textExts.test(f))

  for (const r of renames) {
    for (const target of patchTargets) {
      let body
      try {
        body = await fs.readFile(target, "utf8")
      } catch {
        continue
      }
      if (!body.includes(r.oldBase)) continue
      const next = body.split(r.oldBase).join(r.newBase)
      if (next !== body) await fs.writeFile(target, next)
    }
    await fs.rename(r.from, r.to)
    console.log(
      `[fix-underscore-files] ${relative(root, r.from)} → ${r.newBase}`
    )
  }
  return true
}

const invokedDirectly =
  process.argv[1] && process.argv[1].replace(/\\/g, "/").endsWith("fix-underscore-files.mjs")

if (invokedDirectly) {
  let touched = false
  for (const dir of buildDirs) {
    const did = await fixDir(dir)
    touched = touched || did
  }
  if (!touched) {
    console.log("[fix-underscore-files] no underscore-prefixed files found")
  }
}
