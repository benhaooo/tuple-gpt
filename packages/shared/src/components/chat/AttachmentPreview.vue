<template>
  <div v-if="tabs.length > 0" class="px-1 py-2 w-full overflow-hidden">
    <ScrollArea class="w-full">
      <div class="flex items-center gap-2 flex-nowrap">
        <div
          v-for="tab in tabs"
          :key="tab.id"
          class="group relative flex items-center gap-2 rounded-md border bg-muted/50 px-2.5 py-1.5 text-sm hover:bg-muted transition-colors flex-shrink-0 max-w-[200px]"
        >
          <!-- Favicon -->
          <img
            v-if="tab.favIconUrl"
            :src="tab.favIconUrl"
            :alt="tab.title"
            class="h-3.5 w-3.5 flex-shrink-0"
            @error="handleImageError"
          />
          <GlobeAltIcon v-else class="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />

          <!-- 标题 -->
          <span class="truncate text-xs font-medium">{{ tab.title }}</span>

          <!-- 删除按钮 -->
          <button
            @click="$emit('remove', tab.id)"
            class="flex-shrink-0 rounded-full p-0.5 hover:bg-destructive/10 transition-colors"
            title="移除"
          >
            <XMarkIcon class="h-3 w-3 text-muted-foreground hover:text-destructive" />
          </button>
        </div>
      </div>
      <ScrollBar orientation="horizontal" class="hidden" />
    </ScrollArea>
  </div>
</template>

<script setup lang="ts">
import { GlobeAltIcon, XMarkIcon } from '@heroicons/vue/24/outline'
import { ScrollArea, ScrollBar } from '../ui/scroll-area'
import type { BrowserTab } from '../../composables/useBrowserTabs'

defineProps<{
  tabs: BrowserTab[]
}>()

defineEmits<{
  (e: 'remove', tabId: number): void
}>()

function handleImageError(event: Event) {
  const img = event.target as HTMLImageElement
  img.style.display = 'none'
}
</script>
