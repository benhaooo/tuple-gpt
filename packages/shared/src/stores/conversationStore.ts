import { defineStore } from 'pinia'
import { ref } from 'vue'
import { v4 as uuidv4 } from 'uuid'
import type { Conversation, ChatMessage, MessageStatus } from '../types'

export const useConversationStore = defineStore(
  'conversations',
  () => {
    const conversations = ref<Conversation[]>([])
    const activeConversationId = ref<string | null>(null)

    function getActiveConversation(): Conversation | undefined {
      if (!activeConversationId.value) return undefined
      return conversations.value.find(c => c.id === activeConversationId.value)
    }

    function createConversation(providerId: string, model: string, title?: string): Conversation {
      const now = new Date().toISOString()
      const conversation: Conversation = {
        id: uuidv4(),
        title: title || '新对话',
        messages: [],
        providerId,
        model,
        createdAt: now,
        updatedAt: now,
      }
      conversations.value.unshift(conversation)
      activeConversationId.value = conversation.id
      return conversation
    }

    function setActiveConversation(id: string) {
      activeConversationId.value = id
    }

    function deleteConversation(id: string) {
      const index = conversations.value.findIndex(c => c.id === id)
      if (index === -1) return
      conversations.value.splice(index, 1)
      if (activeConversationId.value === id) {
        activeConversationId.value =
          conversations.value.length > 0 ? conversations.value[0].id : null
      }
    }

    function renameConversation(id: string, title: string) {
      const conv = conversations.value.find(c => c.id === id)
      if (conv) {
        conv.title = title
        conv.updatedAt = new Date().toISOString()
      }
    }

    function addMessage(
      conversationId: string,
      message: Omit<ChatMessage, 'id' | 'timestamp'>,
    ): ChatMessage {
      const conv = conversations.value.find(c => c.id === conversationId)
      if (!conv) throw new Error(`Conversation ${conversationId} not found`)

      const fullMessage: ChatMessage = {
        ...message,
        id: uuidv4(),
        timestamp: new Date().toISOString(),
      }
      conv.messages.push(fullMessage)
      conv.updatedAt = fullMessage.timestamp

      // Auto-generate title from first user message
      if (
        conv.title === '新对话' &&
        message.role === 'user' &&
        conv.messages.filter(m => m.role === 'user').length === 1
      ) {
        conv.title = message.content.slice(0, 30) + (message.content.length > 30 ? '...' : '')
      }

      return fullMessage
    }

    function updateMessageContent(conversationId: string, messageId: string, content: string) {
      const conv = conversations.value.find(c => c.id === conversationId)
      if (!conv) return
      const msg = conv.messages.find(m => m.id === messageId)
      if (msg) {
        msg.content = content
        conv.updatedAt = new Date().toISOString()
      }
    }

    function updateMessageStatus(
      conversationId: string,
      messageId: string,
      status: MessageStatus,
      error?: string,
    ) {
      const conv = conversations.value.find(c => c.id === conversationId)
      if (!conv) return
      const msg = conv.messages.find(m => m.id === messageId)
      if (msg) {
        msg.status = status
        if (error) msg.error = error
      }
    }

    function deleteMessage(conversationId: string, messageId: string) {
      const conv = conversations.value.find(c => c.id === conversationId)
      if (!conv) return
      const index = conv.messages.findIndex(m => m.id === messageId)
      if (index !== -1) {
        conv.messages.splice(index, 1)
        conv.updatedAt = new Date().toISOString()
      }
    }

    function truncateAfterMessage(conversationId: string, messageId: string) {
      const conv = conversations.value.find(c => c.id === conversationId)
      if (!conv) return

      const index = conv.messages.findIndex(m => m.id === messageId)
      if (index === -1) return

      conv.messages.splice(index + 1)
      conv.updatedAt = new Date().toISOString()
    }

    function clearAll() {
      conversations.value.splice(0, conversations.value.length)
      activeConversationId.value = null
    }

    return {
      conversations,
      activeConversationId,
      getActiveConversation,
      createConversation,
      setActiveConversation,
      deleteConversation,
      renameConversation,
      addMessage,
      updateMessageContent,
      updateMessageStatus,
      deleteMessage,
      truncateAfterMessage,
      clearAll,
    }
  },
  {
    // Use LOCAL storage (not sync) - chat history can grow large
    chromePersist: {
      sync: false,
      debounce: 0,
    },
  },
)
