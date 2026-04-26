<template>
  <ScrollArea ref="listRef" class="h-full">
    <div class="p-3 space-y-4">
      <MessageBubble
        v-for="(message, index) in messages"
        :key="message.id"
        :message="message"
        :can-regenerate="message.role === 'assistant' && hasPreviousUser(index)"
        :actions-disabled="isStreaming"
        @regenerate="id => $emit('regenerate', id)"
        @delete="id => $emit('delete', id)"
        @edit-save="payload => $emit('edit-save', payload)"
        @edit-resend="payload => $emit('edit-resend', payload)"
      />
    </div>
  </ScrollArea>
</template>

<script setup lang="ts">
import type { ComponentPublicInstance } from 'vue'
import { ref, watch, nextTick } from 'vue'
import type { ChatMessage } from '../../types'
import MessageBubble from './MessageBubble.vue'
import { ScrollArea } from '../ui/scroll-area'

const props = defineProps<{
  messages: ChatMessage[]
  isStreaming: boolean
}>()

defineEmits<{
  (e: 'regenerate', messageId: string): void
  (e: 'delete', messageId: string): void
  (e: 'edit-save', payload: { messageId: string; content: string }): void
  (e: 'edit-resend', payload: { messageId: string; content: string }): void
}>()

const listRef = ref<ComponentPublicInstance | null>(null)

function scrollToBottom() {
  nextTick(() => {
    const root = listRef.value?.$el as HTMLElement | undefined
    const viewport = root?.querySelector('[data-slot="scroll-area-viewport"]') as HTMLElement | null
    if (!viewport) return
    viewport.scrollTop = viewport.scrollHeight
  })
}

function hasPreviousUser(index: number) {
  return props.messages.slice(0, index).some(message => message.role === 'user')
}

// Auto-scroll to bottom when new content appears
watch(
  () => {
    const last = props.messages[props.messages.length - 1]
    return [props.messages.length, last?.content?.length ?? 0]
  },
  () => scrollToBottom(),
)
</script>
