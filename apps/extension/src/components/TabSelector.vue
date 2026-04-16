<template>
  <Popover v-model:open="isOpen">
    <PopoverTrigger as-child>
      <button
        type="button"
        :disabled="disabled"
        class="relative inline-flex items-center justify-center rounded-lg p-1.5 text-muted-foreground transition-colors disabled:opacity-50 disabled:pointer-events-none"
        :class="isOpen ? 'bg-muted text-foreground' : 'hover:bg-muted hover:text-foreground'"
        title="浏览器标签页"
      >
        <GlobeAltIcon class="h-4 w-4" />
        <span
          v-if="selectedTabs.length > 0"
          class="absolute -top-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-primary text-[9px] font-medium text-primary-foreground"
        >
          {{ selectedTabs.length }}
        </span>
      </button>
    </PopoverTrigger>

    <PopoverContent align="start" class="h-[420px] w-[420px] overflow-hidden p-0">
      <ScrollArea class="h-full w-full">
        <div class="p-1.5">
          <!-- 加载状态 -->
          <div v-if="loading" class="flex items-center justify-center py-10">
            <div class="text-sm text-muted-foreground">加载中...</div>
          </div>

          <!-- 错误状态 -->
          <div v-else-if="error" class="px-3 py-10 text-center">
            <div class="text-sm text-destructive">{{ error }}</div>
          </div>

          <!-- 标签页列表 -->
          <div v-else class="flex flex-col gap-1">
            <button
              v-for="tab in allTabs"
              :key="tab.id"
              @click="toggle(tab)"
              class="flex w-full items-center gap-2.5 cursor-pointer px-2.5 py-2.5 rounded-md transition-colors"
              :class="isSelected(tab.id)
                ? 'bg-primary/15'
                : 'hover:bg-accent'"
            >
              <!-- Favicon -->
              <div class="flex-shrink-0">
                <img
                  v-if="tab.favIconUrl"
                  :src="tab.favIconUrl"
                  :alt="tab.title"
                  class="h-4 w-4"
                  @error="handleImageError"
                />
                <div v-else class="h-4 w-4 rounded bg-muted" />
              </div>

              <!-- 标题和 URL -->
              <div class="min-w-0 flex-1 space-y-0.5 text-left">
                <div class="truncate text-sm font-medium">
                  {{ tab.title }}
                </div>
                <div class="truncate text-xs text-muted-foreground">
                  {{ tab.url }}
                </div>
              </div>
            </button>

            <!-- 空状态 -->
            <div v-if="allTabs.length === 0" class="px-3 py-10 text-center">
              <div class="text-sm text-muted-foreground">没有打开的标签页</div>
            </div>
          </div>
        </div>
      </ScrollArea>
    </PopoverContent>
  </Popover>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { GlobeAltIcon } from '@heroicons/vue/24/outline'
import { ScrollArea } from '@shared/components/ui/scroll-area'
import { Popover, PopoverTrigger, PopoverContent } from '@shared/components/ui/popover'
import { useBrowserTabs } from '../composables/useBrowserTabs'
import { useSelectedTabs } from '../composables/useSelectedTabs'

defineProps<{
  disabled?: boolean
}>()

const { tabs: allTabs, loading, error } = useBrowserTabs()
const { selectedTabs, toggle } = useSelectedTabs()
const isOpen = ref(false)

function isSelected(tabId: number) {
  return selectedTabs.value.some(tab => tab.id === tabId)
}

function handleImageError(event: Event) {
  const img = event.target as HTMLImageElement
  img.style.display = 'none'
}
</script>
