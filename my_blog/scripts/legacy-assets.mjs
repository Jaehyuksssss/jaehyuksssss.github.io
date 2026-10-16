import { readdirSync, existsSync, statSync, readFileSync } from 'node:fs'
import { mkdir, copyFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../', import.meta.url))
const contentRoot = path.join(root, 'contents')
const staticRoot = path.join(root, 'static')
const assetTypes = /\.(png|jpe?g|gif|webp|svg|avif|pdf|excalidraw)$/i
const mime = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.pdf': 'application/pdf' }

export function assetManifest() {
  const assets = new Map()
  for (const relative of readdirSync(contentRoot, { recursive: true })) {
    if (!assetTypes.test(relative)) continue
    const source = path.join(contentRoot, relative)
    if (!statSync(source).isFile()) continue
    assets.set('/content-assets/' + relative.split(path.sep).join('/'), source)
  }
  // Old posts reference /images/foo even when foo lives at static/foo.
  for (const directory of [staticRoot, path.join(contentRoot, 'images')]) {
    for (const name of readdirSync(directory)) {
      if (!assetTypes.test(name) || existsSync(path.join(staticRoot, 'images', name))) continue
      const alias = '/images/' + name
      if (!assets.has(alias)) assets.set(alias, path.join(directory, name))
    }
  }
  return assets
}

export function resolveContentImage(url, sourceFile) {
  if (!url || /^(?:[a-z]+:|\/|#)/i.test(url)) return url
  const absolute = path.resolve(path.dirname(sourceFile), decodeURI(url))
  const relative = path.relative(contentRoot, absolute)
  if (relative.startsWith('..') || !existsSync(absolute)) return url
  return encodeURI('/content-assets/' + relative.split(path.sep).join('/'))
}

export function remarkLegacyImages() {
  return (tree, file) => {
    function walk(node) {
      if ((node.type === 'image' || node.type === 'definition') && file.path) {
        node.url = resolveContentImage(node.url, file.path)
      }
      node.children?.forEach(walk)
    }
    walk(tree)
  }
}

export function rehypeExternalLinks() {
  return tree => {
    function walk(node) {
      if (node.tagName === 'a' && /^https?:\/\//.test(node.properties?.href || '')) {
        node.properties.target = '_blank'
        node.properties.rel = ['noopener', 'noreferrer', 'nofollow']
      }
      node.children?.forEach(walk)
    }
    walk(tree)
  }
}

export function legacyAssets() {
  return {
    name: 'preserve-existing-content-assets',
    hooks: {
      'astro:server:setup': ({ server }) => {
        server.middlewares.use((req, res, next) => {
          let pathname
          try { pathname = decodeURI(new URL(req.url, 'http://localhost').pathname) } catch { return next() }
          const source = assetManifest().get(pathname)
          if (!source) return next()
          res.setHeader('Content-Type', mime[path.extname(source)] || 'application/octet-stream')
          res.end(readFileSync(source))
        })
      },
      'astro:build:done': async ({ dir }) => {
        const output = fileURLToPath(dir)
        for (const [url, source] of assetManifest()) {
          const destination = path.join(output, url.slice(1))
          await mkdir(path.dirname(destination), { recursive: true })
          await copyFile(source, destination)
        }
      },
    },
  }
}
