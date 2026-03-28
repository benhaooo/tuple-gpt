import { ref, onMounted } from 'vue'
import type { BrowserTab } from './useSelectedTabs'
import { getErrorMessage } from '@tuple-gpt/shared'

export function useBrowserTabs() {
  const tabs = ref<BrowserTab[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchTabs() {
    loading.value = true
    error.value = null

    try {
      const allTabs = await chrome.tabs.query({})
      tabs.value = allTabs.flatMap(tab => tab.id && tab.id !== chrome.tabs.TAB_ID_NONE ? [{
        id: tab.id,
        title: tab.title || '',
        url: tab.url || '',
        favIconUrl: tab.favIconUrl,
        windowId: tab.windowId,
      }] : [])
    } catch (err) {
      error.value = getErrorMessage(err, '获取标签页失败')
      console.error('Failed to fetch tabs:', err)
    } finally {
      loading.value = false
    }
  }

  onMounted(() => {
    fetchTabs()
    chrome.tabs.onCreated.addListener(() => fetchTabs())
    chrome.tabs.onRemoved.addListener(() => fetchTabs())
    chrome.tabs.onUpdated.addListener(() => fetchTabs())
  })

  return {
    tabs,
    loading,
    error,
    fetchTabs,
  }
}
