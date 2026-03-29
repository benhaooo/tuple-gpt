import type { PlatformConfig } from '@shared/types/platform'
import type { MessageAttachment } from '@shared/types/chat'
import TabSelector from '../components/TabSelector.vue'
import TabPreview from '../components/TabPreview.vue'
import { useSelectedTabs } from '../composables/useSelectedTabs'
import { extractMultipleTabsContent } from '../composables/useTabContent'

export function createExtensionPlatform(): PlatformConfig {
  const { selectedTabs, clear } = useSelectedTabs()

  return {
    InputActions: TabSelector,
    InputPreview: TabPreview,

    async prepareContext() {
      if (!selectedTabs.value.length) return null

      const tabContents = await extractMultipleTabsContent(selectedTabs.value)
      console.log("🚀 ~ createExtensionPlatform ~ tabContents:", tabContents)
      const validContents = tabContents.filter(c => !c.error)

      if (!validContents.length) return null

      const pages = validContents.map(c =>
        `<page title="${c.title}" url="${c.url}">\n${c.content}\n</page>`,
      ).join('\n\n')

      const context = `\n\n<attached_pages>\n${pages}\n</attached_pages>`

      const attachments: MessageAttachment[] = tabContents.map(c => ({
        id: c.tabId,
        type: 'tab',
        title: c.title,
        url: c.url,
        icon: selectedTabs.value.find(t => t.id === c.tabId)?.favIconUrl,
        extractedContent: c.content,
      }))

      return { context, attachments }
    },

    clearAfterSend() {
      clear()
    },
  }
}
