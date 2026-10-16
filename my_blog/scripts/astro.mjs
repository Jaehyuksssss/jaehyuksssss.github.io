import { existsSync, readFileSync } from "node:fs"
import path from "node:path"
import { projectRoot, runNode } from './runtime.mjs'

const astroRoot = path.join(projectRoot, "node_modules", "astro")
const manifest = path.join(astroRoot, "package.json")
if (!existsSync(manifest)) {
  console.error(
    "Astro dependencies are missing. Run nvm use && npm run setup from the repository root.",
  )
  process.exit(1)
}
const { bin } = JSON.parse(readFileSync(manifest, "utf8"))
const cli = path.resolve(astroRoot, typeof bin === "string" ? bin : bin.astro)
runNode([cli, ...process.argv.slice(2)])
