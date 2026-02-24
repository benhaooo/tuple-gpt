<template>
  <div class="h-full flex bg-background text-foreground">
    <!-- Conversation sidebar -->
    <ConversationSidebar
      v-if="showSidebar"
      :conversations="conversationStore.conversations"
      :active-id="conversationStore.activeConversationId"
      @select="conversationStore.setActiveConversation"
      @delete="conversationStore.deleteConversation"
      @new="chat.newConversation"
      @close="showSidebar = false"
      class="w-56 flex-shrink-0 border-r border-border"
    />

    <!-- Main chat area -->
    <div class="flex-1 flex flex-col min-w-0">
      <!-- Header -->
      <header class="flex items-center justify-between px-3 py-2 border-b border-border flex-shrink-0">
        <div class="flex items-center gap-2 min-w-0">
          <button @click="showSidebar = !showSidebar" class="p-1.5 rounded-md hover:bg-accent flex-shrink-0">
            <Bars3Icon class="h-5 w-5 text-muted-foreground" />
          </button>
          <h2 class="text-sm font-medium truncate">
            {{ chat.activeConversation.value?.title || 'Tuple Chat' }}
          </h2>
        </div>
        <div class="flex items-center gap-1 flex-shrink-0">
          <ModelSelector />
          <button @click="chat.newConversation()" class="p-1.5 rounded-md hover:bg-accent" title="新对话">
            <PlusIcon class="h-5 w-5 text-muted-foreground" />
          </button>
        </div>
      </header>

      <!-- Chat view -->
      <ChatView />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { Bars3Icon, PlusIcon } from '@heroicons/vue/24/outline'
import { useConversationStore } from '../../stores/conversationStore'
import { useChat } from '../../composables/useChat'
import ConversationSidebar from './ConversationSidebar.vue'
import ChatView from './ChatView.vue'
import ModelSelector from './ModelSelector.vue'

const conversationStore = useConversationStore()
const chat = useChat()
const showSidebar = ref(false)
</script>
