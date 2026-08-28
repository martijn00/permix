import path from 'node:path'

import tailwindcss from '@tailwindcss/vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import react from '@vitejs/plugin-react'
import mdx from 'fumadocs-mdx/vite'
import { nitro } from 'nitro/vite'
import { defineConfig } from 'vite'

const changelogFile = path.resolve(import.meta.dirname, '../CHANGELOG.md')

export default defineConfig({
  server: {
    port: 3000,
    fs: {
      allow: ['..'],
    },
  },
  plugins: [
    {
      name: 'watch-changelog',
      configureServer(server) {
        server.watcher.add(changelogFile)
      },
      handleHotUpdate({ file, server }) {
        if (file !== changelogFile) {
          return
        }
        const changelogModule = [
          ...server.moduleGraph.urlToModuleMap.values(),
        ].find((mod) => mod.file?.endsWith('changelog.mdx'))
        if (changelogModule) {
          return [changelogModule]
        }
      },
    },
    mdx(),
    tailwindcss(),
    tanstackStart({
      prerender: {
        enabled: true,
      },
    }),
    react(),
    nitro({
      preset: 'vercel',
    }),
  ],
  resolve: {
    tsconfigPaths: true,
    alias: {
      tslib: 'tslib/tslib.es6.js',
    },
  },
})
