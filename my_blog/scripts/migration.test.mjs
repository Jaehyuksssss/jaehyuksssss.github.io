import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { assetManifest, resolveContentImage } from './legacy-assets.mjs'
import { matchesCategory } from '../astro/lib/filter.ts'
import { games } from '../astro/lib/games.ts'

const root = new URL('../', import.meta.url)
const baseline = JSON.parse(readFileSync(new URL('./migration-baseline.json', import.meta.url), 'utf8'))
test('all original posts, assets, and game files remain available', () => {
  for (const name of Object.keys(baseline.files)) {
    assert.ok(existsSync(new URL(name, root)), 'Missing original file: ' + name)
  }
})
test('original assets and game implementations remain byte-for-byte identical', () => {
  for (const [name, expected] of Object.entries(baseline.files)) {
    // A live blog must allow editing its posts. Full historical comparison is
    // available separately through npm run test:snapshot.
    if (name.endsWith('.md')) continue
    const actual = createHash('sha256').update(readFileSync(new URL(name, root))).digest('hex')
    assert.equal(actual, expected, 'Original file changed: ' + name)
  }
})
test('legacy root image aliases point to preserved assets', () => {
  const assets = assetManifest()
  for (const name of ['ci-cd-01.png', 'pemkey.png', 'eb.png', 'kube-2.png']) {
    assert.ok(assets.has('/images/' + name), 'Missing legacy alias ' + name)
    assert.ok(existsSync(assets.get('/images/' + name)))
  }
})
test('relative Markdown images resolve without modifying Markdown', () => {
  assert.equal(resolveContentImage('images/ISR-test.png', fileURLToPath(new URL('contents/next/nextjs-isr-learning.md', root))), '/content-assets/next/images/ISR-test.png')
  assert.equal(resolveContentImage('/images/jenkins/jenkins-pipeline-overview.png', '/unused.md'), '/images/jenkins/jenkins-pipeline-overview.png')
  assert.equal(resolveContentImage('https://example.com/test.png', '/unused.md'), 'https://example.com/test.png')
})
test('category filters retain old category URLs and support topic groups', () => {
  assert.ok(matchesCategory(['TIL', 'AWS'], 'Infrastructure'))
  assert.ok(matchesCategory(['React'], 'Frontend'))
  assert.ok(matchesCategory(['Next', 'Jenkins'], 'Jenkins'))
  assert.ok(matchesCategory(['JavaScript'], 'javascript'))
  assert.ok(matchesCategory(['TIL'], 'All'))
  assert.equal(matchesCategory(['AWS'], 'React'), false)
})
test('every game page has its own Supabase like key', () => {
  for (const game of games) {
    const page = readFileSync(new URL(`../astro/pages/${game.slug}.astro`, import.meta.url), 'utf8')
    assert.match(page, new RegExp(`<GameLike slug=["']${game.slug}["']`), `Missing game like: ${game.slug}`)
  }
})
