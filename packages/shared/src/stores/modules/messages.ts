import { defineStore } from 'pinia';
import { ref } from 'vue';
import { v4 as uuidv4 } from 'uuid';
import { Message } from '@shared/types/message';

/**
 * 消息管理Store
 */
export const useMessagesStore = defineStore('messages', () => {
  // 状态 - 以助手ID为键的消息映射
  const messages = ref<Record<string, Message[]>>({});

  // Getters
  /**
   * 获取特定助手的所有消息
   * @param assistantId 助手ID
   */
  const getMessagesByAssistantId = (assistantId: string): Message[] => {
    return messages.value[assistantId] || [];
  };

  /**
   * 获取特定消息
   * @param assistantId 助手ID
   * @param messageId 消息ID
   */
  const getMessage = (assistantId: string, messageId: string): Message | undefined => {
    const assistantMessages = messages.value[assistantId] || [];
    return assistantMessages.find(msg => msg.id === messageId);
  };

  // Actions
  /**
   * 添加消息
   * @param message 消息对象，可以包含id
   * @returns 添加的消息对象
   */
  function addMessage(message: Message | Omit<Message, 'id'>): Message {
    const newMessage: Message = {
      id: 'id' in message ? message.id : uuidv4(),
      ...message,
      createdAt: message.createdAt || new Date().toISOString()
    };

    // 确保助手的消息数组已初始化
    if (!messages.value[newMessage.assistantId]) {
      messages.value[newMessage.assistantId] = [];
    }

    messages.value[newMessage.assistantId]!.push(newMessage);

    return newMessage;
  }

  /**
   * 更新消息
   * @param assistantId 助手ID
   * @param messageId 消息ID
   * @param updates 要更新的字段
   * @returns 更新后的消息对象，如果未找到则返回undefined
   */
  function updateMessage(
    assistantId: string,
    messageId: string,
    updates: Partial<Omit<Message, 'id'>>
  ): Message | undefined {
    const assistantMessages = messages.value[assistantId];
    if (!assistantMessages) return undefined;

    const index = assistantMessages.findIndex(msg => msg.id === messageId);
    if (index === -1) return undefined;

    const currentMessage = assistantMessages[index];
    if (!currentMessage) return undefined;

    // 直接更新现有消息的属性
    Object.assign(currentMessage, updates);

    return currentMessage;
  }

  /**
   * 删除消息
   * @param assistantId 助手ID
   * @param messageId 消息ID
   * @returns 是否删除成功
   */
  function deleteMessage(assistantId: string, messageId: string): boolean {
    const assistantMessages = messages.value[assistantId];
    if (!assistantMessages) return false;

    const index = assistantMessages.findIndex(msg => msg.id === messageId);
    if (index === -1) return false;

    assistantMessages.splice(index, 1);

    return true;
  }

  /**
   * 清空特定助手的所有消息
   * @param assistantId 助手ID
   */
  function clearMessages(assistantId: string): void {
    if (messages.value[assistantId]) {
      messages.value[assistantId] = [];
    }
  }

  /**
   * 删除特定助手的所有消息
   * @param assistantId 助手ID
   */
  function deleteAssistantMessages(assistantId: string): void {
    if (assistantId in messages.value) {
      delete messages.value[assistantId];
    }
  }

  /**
   * 删除指定消息之后的所有消息（用于重试功能）
   * @param assistantId 助手ID
   * @param messageId 消息ID
   */
  function deleteMessagesAfter(assistantId: string, messageId: string): void {
    const assistantMessages = messages.value[assistantId];
    if (!assistantMessages) return;

    const index = assistantMessages.findIndex(msg => msg.id === messageId);
    if (index === -1) return;

    // 删除该消息之后的所有消息
    messages.value[assistantId] = assistantMessages.slice(0, index + 1);
  }

  /**
   * 获取指定父消息的所有子消息
   * @param assistantId 助手ID
   * @param parentMessageId 父消息ID
   */
  const getMessagesByParentId = (assistantId: string, parentMessageId: string): Message[] => {
    const assistantMessages = messages.value[assistantId] || [];
    return assistantMessages.filter(msg => msg.parentMessageId === parentMessageId);
  };

  /**
   * 获取消息列表（别名方法，用于兼容）
   * @param assistantId 助手ID
   */
  const getMessages = (assistantId: string): Message[] => {
    return getMessagesByAssistantId(assistantId);
  };



  return {
    // 状态
    messages,

    // Getters
    getMessagesByAssistantId,
    getMessage,
    getMessagesByParentId,
    getMessages,

    // Actions
    addMessage,
    updateMessage,
    deleteMessage,
    deleteMessagesAfter,
    clearMessages,
    deleteAssistantMessages
  };
});