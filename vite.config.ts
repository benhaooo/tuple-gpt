import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { fileURLToPath, URL } from 'node:url';
import AutoImport from 'unplugin-auto-import/vite';
import Components from 'unplugin-vue-components/vite';
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers';
import type { PreRenderedAsset } from 'rollup';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    vue({
      script: {
        defineModel: true,
        propsDestructure: true
      }
    }),
    AutoImport({
      resolvers: [ElementPlusResolver()],
      imports: [
        'vue',
        'vue-router',
        'pinia'
      ],
      dts: true
    }),
    Components({
      resolvers: [
        ElementPlusResolver(),
      ],
      dts: true
    }),
  ],
  build: {
    rollupOptions: {
      output: {
        // 分包
        manualChunks(id: string): string | undefined {
          if (id.includes('node_modules')) {
            return 'vendor';
          }
          return undefined;
        },
        // 构建结构
        // js
        chunkFileNames: 'js/[name]-[hash].js',
        entryFileNames: 'js/[name]-[hash].js',
        assetFileNames(assetInfo: PreRenderedAsset): string {
          const name = assetInfo.name || '';

          // css
          if (name.endsWith('.css')) {
            return 'css/[name]-[hash].css';
          }

          // 图片
          const imgExts = ['.png', '.jpg', '.jpeg', '.gif', '.svg'];
          if (imgExts.some(ext => name.endsWith(ext))) {
            return 'img/[name]-[hash].[ext]';
          }

          // 其他资产类型，设置默认路径
          return 'assets/[name]-[hash][extname]';
        },
      },
    },
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
});