<template>
  <div class="h-full flex flex-col bg-gradient-to-b from-background to-muted/20">
    <!-- Header -->
    <div class="px-4 py-4 border-b border-border/50 backdrop-blur-sm">
      <div class="flex items-center justify-between mb-3">
        <div class="flex items-center gap-2">
          <div class="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <ChatBubbleLeftRightIcon class="h-4 w-4 text-primary" />
          </div>
          <span class="text-sm font-semibold">对话历史</span>
        </div>
        <Button variant="ghost" size="icon-sm" @click="$emit('close')" class="hover:bg-muted/50">
          <XMarkIcon class="h-4 w-4" />
        </Button>
      </div>

      <!-- New Conversation Button -->
      <Button
        size="sm"
        class="w-full shadow-sm hover:shadow transition-shadow"
        @click="$emit('new')"
      >
        <PlusIcon class="h-4 w-4 mr-1.5" />
        新建对话
      </Button>
    </div>

    <!-- Conversations List -->
    <ScrollArea class="flex-1">
      <div v-if="conversations.length > 0" class="p-2 space-y-1">
        <div
          v-for="conv in conversations"
          :key="conv.id"
          class="group relative"
        >
          <Button
            variant="ghost"
            @click="$emit('select', conv.id)"
            class="h-auto w-full justify-start rounded-lg px-3 py-2 text-left"
            :class="conv.id === activeId ? 'bg-accent' : ''"
          >
            <div class="w-full min-w-0">
              <div class="truncate text-sm font-medium">{{ conv.title }}</div>
              <div class="mt-0.5 truncate text-xs text-muted-foreground">
                {{ formatTime(conv.updatedAt) }}
              </div>
            </div>
          </Button>

          <Button
            variant="ghost"
            size="icon-sm"
            @click.stop="$emit('delete', conv.id)"
            class="absolute top-2 right-2 size-6 opacity-0 group-hover:opacity-100"
          >
            <TrashIcon class="h-3.5 w-3.5 text-muted-foreground" />
          </Button>
        </div>
      </div>

      <div v-else class="px-4 pt-10 text-center">
        <ChatBubbleLeftRightIcon class="mx-auto h-8 w-8 text-muted-foreground/50" />
        <p class="mt-2 text-sm text-muted-foreground">暂无对话</p>
      </div>
    </ScrollArea>
  </div>
</template>

<script setup lang="ts">
import {
  ChatBubbleLeftRightIcon,
  XMarkIcon,
  TrashIcon,
  PlusIcon
} from '@heroicons/vue/24/outline'
import type { Conversation } from '../../types'
import { Button } from '../ui/button'
import { ScrollArea } from '../ui/scroll-area'

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
