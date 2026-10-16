import test from 'node:test'
import assert from 'node:assert/strict'
import path from 'node:path'
import { supportsRuntime, selectRuntime } from './runtime.mjs'

const options = {
  version: '20.10.0',
  executable: '/runtime/node',
  nvmRoot: '/test-nvm',
  pinnedVersion: '22.23.3',
}
test('runtime enforces the minimum version required by the installed toolchain', () => {
  for (const version of ['20.10.0', '22.12.0', '22.17.0', '22.18.0']) assert.equal(supportsRuntime(version), false)
  for (const version of ['22.19.0', '22.23.3', '24.0.0']) assert.equal(supportsRuntime(version), true)
})
test('supported runtimes do not depend on an nvm installation', () => {
  assert.equal(selectRuntime({ ...options, version: '22.23.3', exists: () => false }), options.executable)
})
test('older runtimes fall back to the already installed pinned runtime', () => {
  const pinned = path.join(options.nvmRoot, 'versions', 'node', 'v22.23.3', 'bin', 'node')
  assert.equal(selectRuntime({ ...options, exists: candidate => candidate === pinned }), pinned)
})
test('missing compatible runtimes produce setup instructions instead of starting the command', () => {
  assert.throws(() => selectRuntime({ ...options, exists: () => false }), /nvm install && nvm use/)
})
