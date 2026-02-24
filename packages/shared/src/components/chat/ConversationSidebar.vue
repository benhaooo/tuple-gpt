<template>
  <div class="h-full flex flex-col bg-muted/30">
    <div class="flex items-center justify-between p-3 border-b border-border">
      <span class="text-xs font-semibold text-muted-foreground uppercase tracking-wider">对话列表</span>
      <button @click="$emit('close')" class="p-1 rounded hover:bg-accent">
        <XMarkIcon class="h-4 w-4 text-muted-foreground" />
      </button>
    </div>

    <div class="flex-1 overflow-y-auto">
      <button
        v-for="conv in conversations"
        :key="conv.id"
        @click="$emit('select', conv.id)"
        class="w-full text-left px-3 py-2 text-sm border-b border-border/50 hover:bg-accent transition-colors group"
        :class="{ 'bg-accent': conv.id === activeId }"
      >
        <div class="flex items-center justify-between">
          <span class="truncate flex-1 text-foreground">{{ conv.title }}</span>
          <button
            @click.stop="$emit('delete', conv.id)"
            class="p-0.5 rounded opacity-0 group-hover:opacity-100 hover:bg-destructive/10 transition-opacity"
          >
            <TrashIcon class="h-3 w-3 text-destructive" />
          </button>
        </div>
        <div class="text-xs text-muted-foreground mt-0.5">
          {{ formatTime(conv.updatedAt) }}
        </div>
      </button>

      <div v-if="conversations.length === 0" class="p-4 text-xs text-muted-foreground text-center">
        暂无对话
      </div>
    </div>

    <div class="p-2 border-t border-border">
      <button
        @click="$emit('new')"
        class="w-full py-1.5 text-xs bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
      >
        新建对话
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { XMarkIcon, TrashIcon } from '@heroicons/vue/24/outline'
import type { Conversation } from '../../types'

defineProps<{
  conversations: Conversation[]
  activeId: string | null
}>()

defineEmits<{
  (e: 'select', id: string): void
  (e: 'delete', id: string): void
  (e: 'new'): void
  (e: 'close'): void
}>()

function formatTime(iso: string): string {
  const date = new Date(iso)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`
  return `${date.getMonth() + 1}/${date.getDate()}`
}
</script>
