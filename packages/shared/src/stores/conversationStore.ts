import { defineStore } from 'pinia'
import { ref } from 'vue'
import { v4 as uuidv4 } from 'uuid'
import {
  addMessage as addCoreMessage,
  createConversation as createCoreConversation,
  deleteConversation as deleteCoreConversation,
  deleteMessage as deleteCoreMessage,
  getActiveConversation as getCoreActiveConversation,
  renameConversation as renameCoreConversation,
  truncateAfterMessage as truncateAfterCoreMessage,
  updateMessageContent as updateCoreMessageContent,
  updateMessageStatus as updateCoreMessageStatus,
  upsertConversation,
  type ChatMessage,
  type Conversation,
  type MessageStatus,
} from '@tuple-gpt/chat-core'

export const useConversationStore = defineStore(
  'conversations',
  () => {
    const conversations = ref<Conversation[]>([])
    const activeConversationId = ref<string | null>(null)

    function getActiveConversation(): Conversation | undefined {
      return getCoreActiveConversation(conversations.value, activeConversationId.value)
    }

    function createConversation(providerId: string, model: string, title?: string): Conversation {
      const conversation = createCoreConversation({
        providerId,
        model,
        title,
        createId: uuidv4,
      })
      conversations.value.unshift(conversation)
      activeConversationId.value = conversation.id
      return conversation
    }

    function replaceConversation(conversation: Conversation) {
      conversations.value = upsertConversation(conversations.value, conversation)
      activeConversationId.value = conversation.id
    }

    function setActiveConversation(id: string) {
      activeConversationId.value = id
    }

    function deleteConversation(id: string) {
      const result = deleteCoreConversation(conversations.value, activeConversationId.value, id)
      conversations.value = result.conversations
      activeConversationId.value = result.activeConversationId
    }

    function renameConversation(id: string, title: string) {
      conversations.value = renameCoreConversation(conversations.value, id, title)
    }

    function addMessage(
      conversationId: string,
      message: Omit<ChatMessage, 'id' | 'timestamp'> &
        Partial<Pick<ChatMessage, 'id' | 'timestamp'>>,
    ): ChatMessage {
      const conv = conversations.value.find(c => c.id === conversationId)
      if (!conv) throw new Error(`Conversation ${conversationId} not found`)

      const result = addCoreMessage(conv, message, { createId: uuidv4 })
      conversations.value = upsertConversation(conversations.value, result.conversation)
      return result.message
    }

    function updateMessageContent(conversationId: string, messageId: string, content: string) {
      conversations.value = updateCoreMessageContent(
        conversations.value,
        conversationId,
        messageId,
        content,
      )
    }

    function updateMessageStatus(
      conversationId: string,
      messageId: string,
      status: MessageStatus,
      error?: string,
    ) {
      conversations.value = updateCoreMessageStatus(
        conversations.value,
        conversationId,
        messageId,
        status,
        error,
      )
    }

    function deleteMessage(conversationId: string, messageId: string) {
      conversations.value = deleteCoreMessage(conversations.value, conversationId, messageId)
    }

    function truncateAfterMessage(conversationId: string, messageId: string) {
      conversations.value = truncateAfterCoreMessage(conversations.value, conversationId, messageId)
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
      replaceConversation,
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
