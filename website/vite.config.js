import { defineConfig } from 'vite'
import { resolve } from 'path'

// Configure the Vite base path and the bilingual multi-page entry points
export default defineConfig({
  base: '/',
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        changelog: resolve(__dirname, 'changelog.html'),
        enMain: resolve(__dirname, 'en/index.html'),
        enChangelog: resolve(__dirname, 'en/changelog.html'),
      },
    },
  },
})
