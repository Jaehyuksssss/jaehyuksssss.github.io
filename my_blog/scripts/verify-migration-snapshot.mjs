import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'

const root = new URL('../', import.meta.url)
const baseline = JSON.parse(readFileSync(new URL('./migration-baseline.json', import.meta.url), 'utf8'))
const changed = Object.entries(baseline.files).filter(([name, expected]) => {
  const actual = createHash('sha256').update(readFileSync(new URL(name, root))).digest('hex')
  return actual !== expected
}).map(([name]) => name)

assert.deepEqual(changed, [], 'Files changed since the original migration snapshot (post edits are allowed in regular CI)')
console.log('All ' + Object.keys(baseline.files).length + ' files match the original migration snapshot.')
