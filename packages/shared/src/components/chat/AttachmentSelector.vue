<template>
  <DropdownMenu>
    <DropdownMenuTrigger as-child>
      <slot name="trigger">
        <Button
          variant="ghost"
          size="icon-sm"
          class="size-8 rounded-full text-muted-foreground"
          :disabled="disabled"
          title="添加附件"
        >
          <PlusIcon class="h-4 w-4" />
        </Button>
      </slot>
    </DropdownMenuTrigger>

    <DropdownMenuContent align="start" class="w-56">
      <!-- 文件 -->
      <DropdownMenuItem disabled>
        <DocumentIcon class="h-4 w-4" />
        <span>文件</span>
        <span class="ml-auto text-xs text-muted-foreground">即将推出</span>
      </DropdownMenuItem>

      <!-- 图片 -->
      <DropdownMenuItem disabled>
        <PhotoIcon class="h-4 w-4" />
        <span>图片</span>
        <span class="ml-auto text-xs text-muted-foreground">即将推出</span>
      </DropdownMenuItem>

      <!-- 浏览器标签页 - 子菜单 -->
      <DropdownMenuSub>
        <DropdownMenuSubTrigger>
          <GlobeAltIcon class="h-4 w-4" />
          <span>浏览器标签页</span>
          <span v-if="modelValue.length > 0" class="ml-auto text-xs text-primary">
            {{ modelValue.length }}
          </span>
        </DropdownMenuSubTrigger>

        <DropdownMenuSubContent class="h-[420px] w-[420px] overflow-hidden p-0">
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
                  v-for="tab in tabs"
                  :key="tab.id"
                  @click="handleToggleTab(tab)"
                  class="flex w-full items-center gap-2.5 cursor-pointer px-2.5 py-2.5 rounded-md transition-colors"
                  :class="isTabSelected(tab.id)
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
                <div v-if="tabs.length === 0" class="px-3 py-10 text-center">
                  <div class="text-sm text-muted-foreground">没有打开的标签页</div>
                </div>
              </div>
            </div>
          </ScrollArea>
        </DropdownMenuSubContent>
      </DropdownMenuSub>
    </DropdownMenuContent>
  </DropdownMenu>
</template>

<script setup lang="ts">
import { PlusIcon, DocumentIcon, PhotoIcon, GlobeAltIcon } from '@heroicons/vue/24/outline'
import { Button } from '../ui/button'
import { ScrollArea } from '../ui/scroll-area'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from '../ui/dropdown-menu'
import { useBrowserTabs, type BrowserTab } from '../../composables/useBrowserTabs'

const props = defineProps<{
  disabled?: boolean
  modelValue: BrowserTab[]
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', tabs: BrowserTab[]): void
}>()

const { tabs, loading, error } = useBrowserTabs()

function isTabSelected(tabId: number): boolean {
  return (props.modelValue || []).some(tab => tab.id === tabId)
}

function handleToggleTab(tab: BrowserTab) {
  const currentTabs = [...props.modelValue]
  const index = currentTabs.findIndex(t => t.id === tab.id)

  if (index > -1) {
    currentTabs.splice(index, 1)
  } else {
    currentTabs.push(tab)
  }

  emit('update:modelValue', currentTabs)
}

function handleImageError(event: Event) {
  const img = event.target as HTMLImageElement
  img.style.display = 'none'
}
</script>
