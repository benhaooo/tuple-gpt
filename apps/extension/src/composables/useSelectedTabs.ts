import { ref } from 'vue'

export interface BrowserTab {
  id: number
  title: string
  url: string
  favIconUrl?: string
  windowId: number
}

const selectedTabs = ref<BrowserTab[]>([])

export function useSelectedTabs() {
  function add(tab: BrowserTab) {
    if (!selectedTabs.value.some(t => t.id === tab.id)) {
      selectedTabs.value.push(tab)
    }
  }

  function remove(tabId: number) {
    selectedTabs.value = selectedTabs.value.filter(t => t.id !== tabId)
  }

  function toggle(tab: BrowserTab) {
    const index = selectedTabs.value.findIndex(t => t.id === tab.id)
    if (index > -1) {
      selectedTabs.value.splice(index, 1)
    } else {
      selectedTabs.value.push(tab)
    }
  }

  function clear() {
    selectedTabs.value = []
  }

  return {
    selectedTabs,
    add,
    remove,
    toggle,
    clear,
  }
}
