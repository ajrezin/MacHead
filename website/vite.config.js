import { defineConfig } from 'vite'
import { resolve } from 'path'

// 配置 Vite 根路径与中英双语多页面入口
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
