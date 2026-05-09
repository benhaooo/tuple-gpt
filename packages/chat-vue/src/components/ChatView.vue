<template>
  <div class="flex-1 flex flex-col min-h-0">
    <!-- Empty state -->
    <div v-if="!activeConversation" class="flex-1 flex items-center justify-center">
      <div class="text-center text-muted-foreground">
        <ChatBubbleLeftRightIcon class="h-12 w-12 mx-auto mb-3 opacity-50" />
        <p class="text-sm">开始一段新对话</p>
      </div>
    </div>

    <!-- Turn list -->
    <TurnList
      v-else
      :turns="turns"
      :is-streaming="isStreaming"
      :providers="providerStore.providers"
      @regenerate="chat.regenerateTurn"
      @delete="handleDeleteTurn"
      @edit-save="handleSaveUserMessage"
      @edit-resend="handleResendTurn"
      class="flex-1 min-h-0"
    />

    <!-- Chat input -->
    <ChatInput
      @send="(content, mode) => chat.sendMessage(content, mode)"
      @stop="chat.stopStreaming"
      :is-streaming="isStreaming"
      :disabled="!providerStore.activeModel"
      class="flex-shrink-0"
    />
  </div>
</template>

<script setup lang="ts">
import { ChatBubbleLeftRightIcon } from '@heroicons/vue/24/outline'
import { useChat } from '../composables/useChat'
import { useProviderStore } from '../stores/provider'
import TurnList from './TurnList.vue'
import ChatInput from './ChatInput.vue'

const chat = useChat()
const { activeConversation, turns, isStreaming } = chat
const providerStore = useProviderStore()

async function handleDeleteTurn(turnId: string) {
  await chat.deleteTurn(turnId)
}

async function handleSaveUserMessage(payload: { turnId: string; content: string }) {
  await chat.saveUserMessage(payload.turnId, payload.content)
}

async function handleResendTurn(payload: { turnId: string; content: string }) {
  await chat.resendTurn(payload.turnId, payload.content)
}
</script>
