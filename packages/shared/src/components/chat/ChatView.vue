<template>
  <div class="flex-1 flex flex-col min-h-0">
    <!-- Empty state -->
    <div v-if="!chat.activeConversation.value" class="flex-1 flex items-center justify-center">
      <div class="text-center text-muted-foreground">
        <ChatBubbleLeftRightIcon class="h-12 w-12 mx-auto mb-3 opacity-50" />
        <p class="text-sm">开始一段新对话</p>
      </div>
    </div>

    <!-- Message list -->
    <MessageList
      v-else
      :messages="chat.messages.value"
      :is-streaming="chat.isStreaming.value"
      :parse-markdown="chat.parseMarkdown"
      @retry="chat.retryLastMessage"
      class="flex-1"
    />

    <!-- Chat input -->
    <ChatInput
      @send="chat.sendMessage"
      @stop="chat.stopStreaming"
      :is-streaming="chat.isStreaming.value"
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
const providerStore = useProviderStore()
</script>
