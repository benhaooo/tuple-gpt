<template>
  <ScrollArea ref="listRef" class="h-full">
    <div class="p-3 space-y-4">
      <MessageBubble
        v-for="(message, index) in messages"
        :key="message.id"
        :message="message"
        :assistant-meta="getAssistantMeta(message)"
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
import { computed, ref, watch, nextTick } from 'vue'
import type { ChatMessage, Provider } from '@tuple-gpt/chat-core'
import MessageBubble from './MessageBubble.vue'
import { ScrollArea } from '../ui/scroll-area'

const props = withDefaults(
  defineProps<{
    messages: ChatMessage[]
    isStreaming: boolean
    providers?: Provider[]
  }>(),
  {
    providers: () => [],
  },
)

defineEmits<{
  (e: 'regenerate', messageId: string): void
  (e: 'delete', messageId: string): void
  (e: 'edit-save', payload: { messageId: string; content: string }): void
  (e: 'edit-resend', payload: { messageId: string; content: string }): void
}>()

const listRef = ref<ComponentPublicInstance | null>(null)
const providerNameById = computed(
  () => new Map(props.providers.map(provider => [provider.id, provider.name])),
)

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

function getAssistantMeta(message: ChatMessage) {
  if (message.role !== 'assistant') return undefined

  const providerId = message.providerId
  const model = message.model ?? '未知模型'
  const providerName = providerId
    ? (providerNameById.value.get(providerId) ?? '未知服务商')
    : '未知服务商'

  return { model, providerName }
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
