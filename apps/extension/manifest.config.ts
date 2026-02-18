import { defineManifest } from '@crxjs/vite-plugin'
import pkg from './package.json'

export default defineManifest({
  manifest_version: 3,
  name: pkg.name,
  version: pkg.version,
  permissions: ['sidePanel', 'storage', 'activeTab', 'webNavigation'],
  host_permissions: [
    "https://*.youtube.com/*",
    "https://*.bilibili.com/*",
    "<all_urls>"
  ],
  icons: {
    '48': 'public/logo.png',
  },
  action: {
    default_title: 'Click to open sidebar',
    default_icon: {
      '48': 'public/logo.png',
    },
  },
  options_page: 'src/options/index.html',
  side_panel: {
    default_path: 'src/sidepanel/index.html',
  },
  background: {
    service_worker: 'src/background/index.ts',
    type: 'module',
  },
  content_scripts: [
    {
      // 在哔哩哔哩视频页面注入脚本
      matches: ['https://www.bilibili.com/video/*'],
      js: ['src/content/bilibili.ts'],
      run_at: 'document_idle'
    },
    {
      // 在YouTube视频页面注入脚本
      matches: ['https://www.youtube.com/watch*'],
      js: ['src/content/youtube.ts'],
      run_at: 'document_idle'
    },
  ],
})
