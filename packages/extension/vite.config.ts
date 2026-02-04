import path from 'node:path'
import { crx } from '@crxjs/vite-plugin'
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'
import zip from 'vite-plugin-zip-pack'
import manifest from './manifest.config.ts'
import { name, version } from './package.json'

import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers'
import UnoCSS from 'unocss/vite'


export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@shared': path.resolve(__dirname, '../shared/src'),
    },
  },
  plugins: [
    UnoCSS({
      mode: 'global',
      content: {
        pipeline: {
          // 扫描所有 Vue 和 TS/JS 文件
          include: [/\.vue$/, /\.vue\?vue/, /\.ts$/, /\.html$/],
          // 【核心】排除掉所有的 Web Component 组件文件
          exclude: [/\.ce\.vue($|\?)/, /src\/content.*\.vue$/]
        }
      }
    }),

    // 实例 2：Scoped 模式（专门用于 Content Script 的 Web Component）
    UnoCSS({
      mode: 'vue-scoped',
      content: {
        pipeline: {
          // 【核心】只包含 Web Component 文件
          include: [/\.ce\.vue($|\?)/, /src\/content.*\.vue$/]
        }
      }
    }),
    vue({
      customElement: true,
    }),
    crx({ manifest }),
    zip({
      outDir: './Out',
      outFileName: `crx-${name}-${version}.zip`,
    }),
    AutoImport({
      resolvers: [ElementPlusResolver()],
    }),
    Components({
      resolvers: [ElementPlusResolver()],
    }),
  ],
  server: {
    cors: {
      origin: [
        /chrome-extension:\/\//,
      ],
    },
  },
})
