import { existsSync, readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import path from 'node:path'
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'

export const projectRoot = fileURLToPath(new URL('../', import.meta.url))

export function supportsRuntime(version) {
  const [major, minor] = version.split('.').map(Number)
  return major > 22 || (major === 22 && minor >= 19)
}

export function selectRuntime({ version, executable, nvmRoot, pinnedVersion, exists = existsSync }) {
  if (supportsRuntime(version)) return executable
  const pinned = path.join(nvmRoot, 'versions', 'node', 'v' + pinnedVersion, 'bin', 'node')
  if (exists(pinned)) return pinned
  throw new Error('Node.js 22.19+ is required. Run nvm install && nvm use, then npm run setup from the repository root.')
}

// All commands share the same runtime, including tests and plain TypeScript checks.
// Only use a pinned runtime if it is already installed; do not change nvm defaults.
export function runNode(args) {
  const required = readFileSync(path.join(projectRoot, '.nvmrc'), 'utf8').trim()
  let executable
  try {
    executable = selectRuntime({
      version: process.versions.node,
      executable: process.execPath,
      nvmRoot: process.env.NVM_DIR || path.join(homedir(), '.nvm'),
      pinnedVersion: required,
    })
  } catch (error) {
    console.error(error.message)
    process.exitCode = 1
    return
  }
  if (executable !== process.execPath) {
    console.info('[runtime] Using installed Node ' + required + '. Run nvm use to select it in your terminal.')
  }
  const child = spawn(executable, args, {
    cwd: projectRoot,
    stdio: 'inherit',
    env: { ...process.env, PATH: path.dirname(executable) + path.delimiter + (process.env.PATH || '') },
  })
  for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child.kill(signal))
  child.on('error', error => {
    console.error(error.message)
    process.exitCode = 1
  })
  child.on('exit', (code, signal) => {
    process.exitCode = code ?? (signal ? 130 : 1)
  })
}
