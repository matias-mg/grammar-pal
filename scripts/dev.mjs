// Wrapper around `plasmo dev` that re-runs the underscore-file fix on every
// build write. Plasmo's Parcel pipeline emits `_empty.<hash>.js` stubs that
// Chrome refuses to load (filenames starting with `_` are reserved). The prod
// build invokes scripts/fix-underscore-files.mjs as a post-step; dev mode has
// no such hook, so we watch the dev output and rename/patch on each change.
import { spawn } from "node:child_process"
import { watch } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { fixDir } from "./fix-underscore-files.mjs"

const here = dirname(fileURLToPath(import.meta.url))
const projectRoot = join(here, "..")
const devDir = join(projectRoot, "build", "chrome-mv3-dev")

const child = spawn("plasmo", ["dev"], {
  stdio: "inherit",
  shell: true,
  cwd: projectRoot
})

child.on("exit", (code) => process.exit(code ?? 0))
process.on("SIGINT", () => child.kill("SIGINT"))
process.on("SIGTERM", () => child.kill("SIGTERM"))

let scheduled = null
let running = false
let dirty = false

async function runFix() {
  if (running) {
    dirty = true
    return
  }
  running = true
  try {
    await fixDir(devDir)
  } catch (err) {
    console.error("[dev-fix-watcher]", err)
  } finally {
    running = false
    if (dirty) {
      dirty = false
      schedule()
    }
  }
}

function schedule() {
  if (scheduled) clearTimeout(scheduled)
  scheduled = setTimeout(() => {
    scheduled = null
    runFix()
  }, 500)
}

async function startWatcher() {
  for (;;) {
    try {
      watch(devDir, { recursive: true }, () => schedule())
      console.log("[dev-fix-watcher] watching", devDir)
      schedule()
      return
    } catch (err) {
      if (err.code === "ENOENT") {
        await new Promise((r) => setTimeout(r, 500))
        continue
      }
      throw err
    }
  }
}

startWatcher().catch((err) => {
  console.error("[dev-fix-watcher] fatal", err)
  process.exit(1)
})
