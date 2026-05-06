<template>
  <div class="flex-1 flex flex-col min-h-0">
    <!-- Empty state -->
    <div v-if="!activeConversation" class="flex-1 flex items-center justify-center">
      <div class="text-center text-muted-foreground">
        <ChatBubbleLeftRightIcon class="h-12 w-12 mx-auto mb-3 opacity-50" />
        <p class="text-sm">开始一段新对话</p>
      </div>
    </div>

    <!-- Message list -->
    <MessageList
      v-else
      :messages="messages"
      :is-streaming="isStreaming"
      @regenerate="chat.regenerateAssistantMessage"
      @delete="handleDeleteMessage"
      @edit-save="handleSaveUserMessage"
      @edit-resend="handleResendUserMessage"
      class="flex-1 min-h-0"
    />

    <!-- Chat input -->
    <ChatInput
      @send="content => chat.sendMessage(content)"
      @stop="chat.stopStreaming"
      :is-streaming="isStreaming"
      :disabled="!providerStore.activeModel"
      class="flex-shrink-0"
    />
  </div>
</template>

<script setup lang="ts">
import { ChatBubbleLeftRightIcon } from '@heroicons/vue/24/outline'
import { useChat } from '../../composables/useChat'
import { useProviderStore } from '../../stores/providerStore'
import MessageList from './MessageList.vue'
import ChatInput from './ChatInput.vue'

const chat = useChat()
const { activeConversation, messages, isStreaming } = chat
const providerStore = useProviderStore()

async function handleDeleteMessage(messageId: string) {
  await chat.deleteMessage(messageId)
}

async function handleSaveUserMessage(payload: { messageId: string; content: string }) {
  await chat.saveUserMessage(payload.messageId, payload.content)
}

async function handleResendUserMessage(payload: { messageId: string; content: string }) {
  await chat.resendFromUserMessage(payload.messageId, payload.content)
}
</script>
