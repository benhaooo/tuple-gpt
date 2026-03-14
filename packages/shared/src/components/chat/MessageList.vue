<template>
  <ScrollArea ref="listRef" class="h-full">
    <div class="p-3 space-y-4">
      <MessageBubble
        v-for="message in messages"
        :key="message.id"
        :message="message"
        :parse-markdown="parseMarkdown"
        @retry="$emit('retry')"
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
  parseMarkdown: (content: string) => string
}>()

defineEmits<{
  (e: 'retry'): void
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

// Auto-scroll to bottom when new content appears
watch(
  () => {
    const last = props.messages[props.messages.length - 1]
    return [props.messages.length, last?.content?.length ?? 0]
  },
  () => scrollToBottom(),
)
</script>
