<template>
  <div v-if="selectedTabs.length > 0" class="px-1 py-2 w-full overflow-hidden">
    <ScrollArea class="w-full">
      <div class="flex items-center gap-2 flex-nowrap">
        <AttachmentPreviewItem
          v-for="tab in selectedTabs"
          :key="tab.id"
          :title="tab.title"
          class="flex-shrink-0"
          @remove="remove(tab.id)"
        >
          <template #icon>
            <img
              v-if="tab.favIconUrl"
              :src="tab.favIconUrl"
              :alt="tab.title"
              class="h-4 w-4 flex-shrink-0"
              @error="handleImageError"
            />
            <GlobeAltIcon v-else class="h-4 w-4 flex-shrink-0 text-muted-foreground" />
          </template>
        </AttachmentPreviewItem>
      </div>
      <ScrollBar orientation="horizontal" class="hidden" />
    </ScrollArea>
  </div>
</template>

<script setup lang="ts">
import { GlobeAltIcon } from '@heroicons/vue/24/outline'
import { ScrollArea, ScrollBar } from '@shared/components/ui/scroll-area'
import AttachmentPreviewItem from '@shared/components/chat/AttachmentPreviewItem.vue'
import { useSelectedTabs } from '../composables/useSelectedTabs'

const { selectedTabs, remove } = useSelectedTabs()

function handleImageError(event: Event) {
  const img = event.target as HTMLImageElement
  img.style.display = 'none'
}
</script>
