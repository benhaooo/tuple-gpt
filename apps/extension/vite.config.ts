import path from 'node:path'
import { crx } from '@crxjs/vite-plugin'
import { createGenerator } from 'unocss'
import vue from '@vitejs/plugin-vue'
import { promises as fs } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { defineConfig, type Plugin } from 'vite'
import zip from 'vite-plugin-zip-pack'
import manifest from './manifest.config.ts'
import { name, version } from './package.json'
import unoConfig from './uno.config'

import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import UnoCSS from 'unocss/vite'

const zipFileName = `crx-${name.replaceAll('/', '-')}-${version}.zip`
const shadowUnoStylesModuleId = 'virtual:tuple-gpt-shadow-uno-styles'
const resolvedShadowUnoStylesModuleId = `\0${shadowUnoStylesModuleId}`

type ShadowStylesManifest = {
  sources?: Array<{
    dir: string
    extensions: string[]
  }>
}

function shadowUnoStylesPlugin(): Plugin {
  const contentSourceDir = path.resolve(__dirname, 'src/content')

  async function collectSourceFiles(dir: string, extensions: string[]): Promise<string[]> {
    const entries = await fs.readdir(dir, { withFileTypes: true })
    const files = await Promise.all(
      entries.map(async entry => {
        const entryPath = path.join(dir, entry.name)

        if (entry.isDirectory()) {
          return collectSourceFiles(entryPath, extensions)
        }

        if (entry.isFile() && extensions.some(ext => entry.name.endsWith(ext))) {
          return [entryPath]
        }

        return []
      }),
    )

    return files.flat()
  }

  async function collectUiVueSourceFiles(addWatchFile: (file: string) => void): Promise<string[]> {
    const manifestUrl = import.meta.resolve('@tuple-gpt/ui-vue/shadow-styles.json')
    if (!manifestUrl.startsWith('file://')) return []

    const manifestFile = fileURLToPath(manifestUrl)
    addWatchFile(manifestFile)
    const manifest = JSON.parse(await fs.readFile(manifestFile, 'utf-8')) as ShadowStylesManifest
    const packageRoot = path.dirname(manifestFile)

    return (
      await Promise.all(
        (manifest.sources ?? []).map(source =>
          collectSourceFiles(path.resolve(packageRoot, source.dir), source.extensions),
        ),
      )
    ).flat()
  }

  return {
    name: 'tuple-gpt:shadow-uno-styles',
    resolveId(id) {
      if (id === shadowUnoStylesModuleId) {
        return resolvedShadowUnoStylesModuleId
      }
    },
    async load(id) {
      if (id !== resolvedShadowUnoStylesModuleId) return null

      const sourceFiles = [
        ...(await collectSourceFiles(contentSourceDir, ['.vue'])),
        ...(await collectUiVueSourceFiles(file => this.addWatchFile(file))),
      ]
      const sources = await Promise.all(
        sourceFiles.map(async file => {
          this.addWatchFile(file)
          return fs.readFile(file, 'utf-8')
        }),
      )

      const uno = await createGenerator(unoConfig)
      const { css } = await uno.generate(sources.join('\n'), {
        minify: true,
        preflights: false,
        safelist: true,
      })

      return `export default ${JSON.stringify(css)}`
    },
  }
}

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  plugins: [
    shadowUnoStylesPlugin(),
    UnoCSS({
      mode: 'global',
      content: {
        pipeline: {
          // 扫描所有 Vue 和 TS/JS 文件
          include: [/\.vue$/, /\.vue\?vue/, /\.ts$/, /\.html$/],
          // 【核心】排除掉所有的 Web Component 组件文件
          exclude: [/\.ce\.vue($|\?)/, /src\/content.*\.vue$/],
        },
      },
    }),

    // 实例 2：Shadow DOM 模式（专门用于 Content Script 的 Web Component）
    UnoCSS({
      mode: 'shadow-dom',
      content: {
        pipeline: {
          // 【核心】只包含 Web Component 文件
          include: [/\.ce\.vue($|\?)/, /src\/content.*\.vue$/],
        },
      },
    }),
    vue({
      customElement: true,
    }),
    crx({ manifest }),
    zip({
      outDir: './Out',
      outFileName: zipFileName,
    }),
    AutoImport({}),
    Components({}),
  ],
  server: {
    cors: {
      origin: [/chrome-extension:\/\//],
    },
  },
})
