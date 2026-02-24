<template>
  <div ref="listRef" class="p-3 space-y-4 overflow-y-auto">
    <MessageBubble
      v-for="message in messages"
      :key="message.id"
      :message="message"
      :parse-markdown="parseMarkdown"
      @retry="$emit('retry')"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'
import type { ChatMessage } from '../../types'
import MessageBubble from './MessageBubble.vue'

const props = defineProps<{
  messages: ChatMessage[]
  isStreaming: boolean
  parseMarkdown: (content: string) => string
}>()

defineEmits<{
  (e: 'retry'): void
}>()

const listRef = ref<HTMLDivElement>()

// Auto-scroll to bottom when new content appears
watch(
  () => {
    const last = props.messages[props.messages.length - 1]
    return [props.messages.length, last?.content?.length ?? 0]
  },
  () => {
    nextTick(() => {
      if (listRef.value) {
        listRef.value.scrollTop = listRef.value.scrollHeight
      }
    })
  },
)
</script>
