import { ref, onMounted } from 'vue'

export interface BrowserTab {
  id: number
  title: string
  url: string
  favIconUrl?: string
  windowId: number
}

export function useBrowserTabs() {
  const tabs = ref<BrowserTab[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchTabs() {
    loading.value = true
    error.value = null

    try {
      const allTabs = await chrome.tabs.query({})
      tabs.value = allTabs.map(tab => ({
        id: tab.id!,
        title: tab.title || '无标题',
        url: tab.url || '',
        favIconUrl: tab.favIconUrl,
        windowId: tab.windowId!,
      }))
    } catch (err) {
      error.value = err instanceof Error ? err.message : '获取标签页失败'
      console.error('Failed to fetch tabs:', err)
    } finally {
      loading.value = false
    }
  }

  // 监听标签页变化
  function setupTabListeners() {
    chrome.tabs.onCreated.addListener(() => fetchTabs())
    chrome.tabs.onRemoved.addListener(() => fetchTabs())
    chrome.tabs.onUpdated.addListener(() => fetchTabs())
  }

  onMounted(() => {
    fetchTabs()
    setupTabListeners()
  })

  return {
    tabs,
    loading,
    error,
    fetchTabs,
  }
}
