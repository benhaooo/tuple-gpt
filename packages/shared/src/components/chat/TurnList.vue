<template>
  <ScrollArea ref="listRef" class="h-full">
    <div class="p-3 space-y-5">
      <div v-for="turn in turns" :key="turn.id" class="space-y-2">
        <MessageBubble
          v-for="message in turn.messages"
          :key="message.id"
          :message="message"
          :turn-id="turn.id"
          :assistant-meta="getAssistantMeta(turn, message)"
          :can-regenerate="message.role === 'assistant' && hasUserMessage(turn)"
          :actions-disabled="isStreaming"
          @regenerate="id => $emit('regenerate', id)"
          @delete="id => $emit('delete', id)"
          @edit-save="payload => $emit('edit-save', payload)"
          @edit-resend="payload => $emit('edit-resend', payload)"
        />
      </div>
    </div>
  </ScrollArea>
</template>

<script setup lang="ts">
import type { ComponentPublicInstance } from 'vue'
import { computed, ref, watch, nextTick } from 'vue'
import type { ChatMessage, ChatTurn, Provider } from '@tuple-gpt/chat-core'
import { getContentText } from '@tuple-gpt/chat-core'
import MessageBubble from './MessageBubble.vue'
import { ScrollArea } from '../ui/scroll-area'

const props = withDefaults(
  defineProps<{
    turns: ChatTurn[]
    isStreaming: boolean
    providers?: Provider[]
  }>(),
  {
    providers: () => [],
  },
)

defineEmits<{
  (e: 'regenerate', turnId: string): void
  (e: 'delete', turnId: string): void
  (e: 'edit-save', payload: { turnId: string; content: string }): void
  (e: 'edit-resend', payload: { turnId: string; content: string }): void
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

function hasUserMessage(turn: ChatTurn) {
  return turn.messages.some(message => message.role === 'user')
}

function getAssistantMeta(turn: ChatTurn, message: ChatMessage) {
  if (message.role !== 'assistant') return undefined

  const providerName = providerNameById.value.get(turn.providerId) ?? '未知服务商'
  return { model: turn.model, providerName }
}

function getTurnSignature(turn: ChatTurn) {
  const last = turn.messages[turn.messages.length - 1]
  return [
    turn.id,
    turn.status,
    turn.messages.length,
    last ? getContentText(last.content) : '',
  ].join(':')
}

watch(
  () => props.turns.map(getTurnSignature).join('|'),
  () => scrollToBottom(),
)
</script>
