import { defineConfig } from 'astro/config'
import react from '@astrojs/react'
import sitemap from '@astrojs/sitemap'
import { unified } from '@astrojs/markdown-remark'
import { fileURLToPath } from 'node:url'
import { legacyAssets, remarkLegacyImages, rehypeExternalLinks } from './scripts/legacy-assets.mjs'

const fromRoot = path => fileURLToPath(new URL(path, import.meta.url))

export default defineConfig({
  site: 'https://jaehyuksssss.github.io',
  srcDir: './astro',
  publicDir: './static',
  output: 'static',
  trailingSlash: 'always',
  integrations: [react(), sitemap(), legacyAssets()],
  markdown: {
    processor: unified({
      remarkPlugins: [remarkLegacyImages],
      rehypePlugins: [rehypeExternalLinks],
      shikiConfig: { theme: 'github-dark' },
    }),
  },
  vite: {
    envPrefix: ['PUBLIC_', 'GATSBY_'],
    resolve: {
      alias: [
        { find: 'components/Common/Template', replacement: fromRoot('./astro/components/ReactFrame.tsx') },
        { find: 'components', replacement: fromRoot('./src/components') },
        { find: 'hooks', replacement: fromRoot('./src/hooks') },
        { find: 'lib', replacement: fromRoot('./src/lib') },
      ],
    },
  },
})
