import assert from 'node:assert/strict'
import { readFileSync, readdirSync, existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { load } from 'cheerio'

const project = fileURLToPath(new URL('../', import.meta.url))
const dist = path.join(project, 'dist')
const baseline = JSON.parse(readFileSync(new URL('./migration-baseline.json', import.meta.url), 'utf8'))
for (const route of baseline.routes) {
  const file = route === '/404/' ? path.join(dist, '404.html') : path.join(dist, route, 'index.html')
  assert.ok(existsSync(file), 'Missing migrated route: ' + route)
}
let pageCount = 0
let imageCount = 0
const failures = []
for (const relative of readdirSync(dist, { recursive: true })) {
  if (!relative.endsWith('.html')) continue
  const html = readFileSync(path.join(dist, relative), 'utf8')
  const $ = load(html)
  pageCount++
  assert.ok($('title').text().length > 0, 'Missing title: ' + relative)
  assert.equal($('html').attr('lang'), 'ko', 'Missing language: ' + relative)
  const canonical = $('link[rel=canonical]').attr('href')
  assert.ok(canonical?.startsWith('https://jaehyuksssss.github.io/'), 'Invalid canonical: ' + relative)
  $('script[type="application/ld+json"]').each((_, el) => JSON.parse($(el).html()))
  const pageUrl = new URL(relative.replace(/index\.html$/, ''), 'https://jaehyuksssss.github.io/')
  $('img[src]').each((_, element) => {
    const src = $(element).attr('src')
    if (!src || /^(https?:|data:)/.test(src)) return
    const pathname = decodeURIComponent(new URL(src, pageUrl).pathname)
    if (!existsSync(path.join(dist, pathname))) failures.push(relative + ': ' + src)
    imageCount++
  })
  $('a[href]').each((_, element) => {
    const href = $(element).attr('href')
    if (!href || /^(https?:|mailto:|tel:|#)/.test(href)) return
    const pathname = decodeURIComponent(new URL(href, pageUrl).pathname)
    const target = path.join(dist, pathname)
    if (!existsSync(target) && !existsSync(path.join(target, 'index.html'))) failures.push(relative + ': broken link ' + href)
  })
}
assert.deepEqual(failures, [], 'Broken built links/assets')
assert.ok(existsSync(path.join(dist, 'sitemap-index.xml')))
const main = load(readFileSync(path.join(dist, 'index.html'), 'utf8'))
assert.equal(main('[data-topic="Frontend"]').length, 0, 'Frontend should not appear in the main navigation')
const archive = load(readFileSync(path.join(dist, 'articles/index.html'), 'utf8'))
assert.equal(archive('#category-select option[value="Frontend"]').length, 0, 'Frontend should not appear in the topic selector')
const postCount = Object.keys(baseline.files).filter(file => file.startsWith('contents/') && file.endsWith('.md')).length
const renderedPosts = main('[data-post-item]').length
assert.ok(renderedPosts >= postCount, 'All original posts must be available to search')
const games = load(readFileSync(path.join(dist, 'games/index.html'), 'utf8'))
assert.equal(games('.game-card').length, 11, 'All 11 games must remain linked')
console.log('Verified ' + baseline.routes.length + ' existing routes, ' + pageCount + ' HTML pages, ' + imageCount + ' image references, ' + renderedPosts + ' posts, and 11 games.')
