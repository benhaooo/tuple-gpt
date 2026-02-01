import { useToast } from 'vue-toast-notification';
import { useMessagesStore } from '@/stores/modules/messages';
import { useAssistantsStore } from '@/stores/modules/assistants';
import { LlmService } from '@/services/LlmService';
import type { Message, MessageBlock, ErrorBlock } from '@/types/message';
import type { Assistant } from '@/types/assistant';
import { generateUniqueId } from '@/utils/commonUtils';

export interface SendMessageOptions {
  files?: any[]; // 多文件数组
  mentionedModels?: any[]; // @选择的模型列表
  temperature?: number;
  maxTokens?: number;
}

export interface StreamCallbacks {
  onStart?: () => void;
  onChunk?: (chunk: string) => void;
  onComplete?: (message: Message) => void;
  onError?: (error: Error) => void;
}

export interface IMessageService {
  sendMessage(assistantId: string, content: string, options?: SendMessageOptions): Promise<Message>;
  sendStreamMessage(assistantId: string, content: string, callbacks?: StreamCallbacks): Promise<void>;
  retryMessage(assistantId: string, messageId: string): Promise<void>;
  stopMessage(messageId: string): Promise<void>;
}

/**
 * 消息服务 - 处理消息发送的业务逻辑
 * 职责：
 * 1. 验证输入数据
 * 2. 协调 Store 和 LLM 服务
 * 3. 处理流式响应
 * 4. 统一错误处理
 */
export class MessageService implements IMessageService {
  private _messagesStore?: ReturnType<typeof useMessagesStore>;
  private _assistantsStore?: ReturnType<typeof useAssistantsStore>;
  private llmService = LlmService.getInstance();
  private toast = useToast();
  
  // 正在进行的请求映射，用于停止请求
  private activeRequests = new Map<string, AbortController>();

  private get messagesStore() {
    if (!this._messagesStore) {
      this._messagesStore = useMessagesStore();
    }
    return this._messagesStore;
  }

  private get assistantsStore() {
    if (!this._assistantsStore) {
      this._assistantsStore = useAssistantsStore();
    }
    return this._assistantsStore;
  }

  /**
   * 发送消息（非流式）
   */
  async sendMessage(
    assistantId: string, 
    content: string, 
    options: SendMessageOptions = {}
  ): Promise<Message> {
    try {
      // 1. 验证输入
      this.validateInput(assistantId, content);
      
      // 2. 获取助手信息
      const assistant = this.getAssistant(assistantId);
      
      // 3. 创建并添加用户消息
      const userMessage = this.createUserMessage(assistantId, content, options);
      this.messagesStore.addMessage(userMessage);
      
      // 4. 创建助手消息占位符
      const assistantMessage = this.createAssistantMessage(assistantId, assistant);
      this.messagesStore.addMessage(assistantMessage);
      
      // 5. 发送 LLM 请求
      const response = await this.sendLlmRequest(assistantId, assistantMessage.id, assistant, options);
      
      // 6. 更新助手消息
      const finalMessage = this.updateAssistantMessage(assistantMessage, response);
      
      return finalMessage;
    } catch (error) {
      this.handleError(error as Error, assistantId);
      throw error;
    }
  }

  /**
   * 发送流式消息（支持多模型并发）
   */
  async sendStreamMessage(
    assistantId: string,
    content: string,
    callbacks: StreamCallbacks = {},
    options: SendMessageOptions = {}
  ): Promise<void> {
    try {
      // 1. 验证输入
      this.validateInput(assistantId, content);

      // 2. 获取助手信息
      const assistant = this.getAssistant(assistantId);

      // 3. 创建并添加用户消息
      const userMessage = this.createUserMessage(assistantId, content, options);
      this.messagesStore.addMessage(userMessage);

      // 4. 调用开始回调
      callbacks.onStart?.();

      // 5. 检查是否有@选择的模型
      const mentionedModels = options.mentionedModels || [];

      if (mentionedModels.length > 0) {
        // 多模型并发请求
        await this.sendMultiModelRequests(assistantId, userMessage.id, mentionedModels, assistant, callbacks);
      } else {
        // 单模型请求（使用助手默认模型）
        const assistantMessage = this.createAssistantMessage(assistantId, assistant, userMessage.id);
        this.messagesStore.addMessage(assistantMessage);
        await this.sendStreamLlmRequest(assistantId, assistantMessage.id, assistant, callbacks);
      }

    } catch (error) {
      callbacks.onError?.(error as Error);
    }
  }

  /**
   * 发送多模型并发请求
   */
  private async sendMultiModelRequests(
    assistantId: string,
    parentMessageId: string,
    mentionedModels: any[],
    assistant: Assistant,
    callbacks: StreamCallbacks = {}
  ): Promise<void> {
    const promises: Promise<void>[] = [];

    for (const model of mentionedModels) {
      // 为每个模型创建独立的助手消息
      const assistantMessage = this.createAssistantMessage(assistantId, assistant, parentMessageId, model);
      this.messagesStore.addMessage(assistantMessage);

      // 创建独立的回调，避免多个请求之间的干扰
      const modelCallbacks: StreamCallbacks = {
        onStart: () => {
          // 可以在这里添加特定模型的开始处理逻辑
        },
        onChunk: (chunk) => {
          // 传递给原始回调，但可以添加模型标识
          callbacks.onChunk?.(chunk);
        },
        onComplete: (message) => {
          // 传递给原始回调
          callbacks.onComplete?.(message);
        },
        onError: (error) => {
          // 传递给原始回调
          callbacks.onError?.(error);
        }
      };

      // 创建临时助手配置，使用@选择的模型
      const tempAssistant = {
        ...assistant,
        model: model
      };

      // 发送流式请求
      const promise = this.sendStreamLlmRequest(assistantId, assistantMessage.id, tempAssistant, modelCallbacks);
      promises.push(promise);
    }

    // 等待所有请求完成
    try {
      await Promise.allSettled(promises);
    } catch (error) {
      console.error('多模型请求中出现错误:', error);
    }
  }

  /**
   * 重试消息
   */
  async retryMessage(assistantId: string, messageId: string): Promise<void> {
    try {
      // 1. 验证要重试的消息
      const message = this.messagesStore.getMessage(assistantId, messageId);
      if (!message) {
        throw new Error('消息不存在');
      }

      // 2. 获取助手信息
      const assistant = this.getAssistant(assistantId);

      if (message.role === 'user') {
        // 重试用户消息：重新生成以该用户消息为parent的助手回复
        const childMessages = this.messagesStore.getMessagesByParentId(assistantId, message.id);
        const assistantMessages = childMessages.filter(msg => msg.role === 'assistant');

        if (assistantMessages.length > 0) {
          // 重新生成现有的助手回复
          for (const assistantMessage of assistantMessages) {
            await this.regenerateAssistantMessage(assistantId, assistantMessage.id, assistant);
          }
        } else {
          // 如果没有助手回复，创建新的助手回复
          await this.generateAssistantReply(assistantId, assistant, message.id);
        }
      } else if (message.role === 'assistant') {
        // 重试助手消息：使用原始模型重新生成该助手消息的内容
        if (!message.parentMessageId) {
          throw new Error('该助手消息没有对应的用户消息，无法重试');
        }

        const parentMessage = this.messagesStore.getMessage(assistantId, message.parentMessageId);
        if (!parentMessage || parentMessage.role !== 'user') {
          throw new Error('找不到对应的用户消息，无法重试');
        }

        // 使用原始消息的模型重新生成
        const originalModel = message.model;
        await this.regenerateAssistantMessage(assistantId, message.id, assistant, originalModel);
      } else {
        throw new Error('无效的消息类型');
      }

    } catch (error) {
      this.handleError(error as Error, assistantId);
      throw error;
    }
  }

  /**
   * 停止消息生成
   */
  async stopMessage(messageId: string): Promise<void> {
    const controller = this.activeRequests.get(messageId);
    if (controller) {
      controller.abort();
      this.activeRequests.delete(messageId);
      this.toast.info('已停止消息生成');
    }
  }

  // ==================== 私有方法 ====================

  /**
   * 基于现有用户消息生成助手回复（用于重试功能）
   */
  private async generateAssistantReply(
    assistantId: string,
    assistant: Assistant,
    parentMessageId: string,
    callbacks: StreamCallbacks = {}
  ): Promise<void> {
    try {
      // 1. 创建助手消息占位符
      const assistantMessage = this.createAssistantMessage(assistantId, assistant, parentMessageId);
      this.messagesStore.addMessage(assistantMessage);

      // 2. 发送流式LLM请求生成回复
      await this.sendStreamLlmRequest(assistantId, assistantMessage.id, assistant, callbacks);

    } catch (error) {
      console.error('生成助手回复失败:', error);
      throw error;
    }
  }

  /**
   * 重新生成现有助手消息的内容
   */
  private async regenerateAssistantMessage(
    assistantId: string,
    messageId: string,
    assistant: Assistant,
    originalModel?: any,
    callbacks: StreamCallbacks = {}
  ): Promise<void> {
    try {
      // 1. 获取现有消息
      const existingMessage = this.messagesStore.getMessage(assistantId, messageId);
      if (!existingMessage || existingMessage.role !== 'assistant') {
        throw new Error('消息不存在或不是助手消息');
      }

      // 2. 重置消息内容和状态
      this.messagesStore.updateMessage(assistantId, messageId, {
        status: 'sending',
        blocks: [{ type: 'text' as const, content: '' }],
        model: originalModel || assistant.model
      });

      // 3. 创建临时助手配置（如果有原始模型）
      const tempAssistant = originalModel ? {
        ...assistant,
        model: originalModel
      } : assistant;

      // 4. 发送流式LLM请求重新生成内容
      await this.sendStreamLlmRequest(assistantId, messageId, tempAssistant, callbacks);

    } catch (error) {
      console.error('重新生成助手消息失败:', error);
      throw error;
    }
  }

  /**
   * 验证输入数据
   */
  private validateInput(assistantId: string, content: string): void {
    if (!assistantId) {
      throw new Error('助手ID不能为空');
    }
    
    if (!content || !content.trim()) {
      throw new Error('消息内容不能为空');
    }
    
    if (content.length > 10000) {
      throw new Error('消息内容过长，请控制在10000字符以内');
    }
  }

  /**
   * 获取助手信息
   */
  private getAssistant(assistantId: string): Assistant {
    const assistant = this.assistantsStore.getAssistantById(assistantId);
    if (!assistant) {
      throw new Error('助手不存在或已被删除');
    }

    if (!assistant.model) {
      throw new Error('助手未配置模型');
    }

    return assistant;
  }

  /**
   * 创建用户消息
   */
  private createUserMessage(
    assistantId: string,
    content: string,
    options: SendMessageOptions = {}
  ): Message {
    const blocks: MessageBlock[] = [
      { type: 'text', content }
    ];

    // 处理多文件格式
    if (options.files && options.files.length > 0) {
      options.files.forEach(file => {
        if (file.type === 'image') {
          blocks.push({
            type: 'image',
            content: {
              url: file.data || file.preview,
              alt: file.name || '用户上传的图片'
            }
          });
        } else if (file.type === 'audio') {
          blocks.push({
            type: 'file',
            content: {
              name: file.name,
              url: file.data,
              size: file.size,
              type: file.format
            }
          });
        }
      });
    }

    return {
      id: generateUniqueId(),
      assistantId,
      role: 'user',
      status: 'success',
      blocks,
      createdAt: new Date().toISOString()
    };
  }

  /**
   * 创建助手消息占位符
   */
  private createAssistantMessage(
    assistantId: string,
    assistant: Assistant,
    parentMessageId?: string,
    customModel?: any
  ): Message {
    return {
      id: generateUniqueId(),
      assistantId,
      role: 'assistant',
      status: 'sending',
      blocks: [{ type: 'text' as const, content: '' }],
      createdAt: new Date().toISOString(),
      model: customModel || assistant.model,
      parentMessageId
    };
  }

  /**
   * 发送 LLM 请求（非流式）
   */
  private async sendLlmRequest(
    assistantId: string,
    messageId: string,
    assistant: Assistant,
    options: SendMessageOptions = {}
  ): Promise<any> {
    // 构建消息历史
    const messages = this.buildChatMessages(assistantId);

    // 构建请求选项
    const requestOptions = {
      model: assistant.model?.id,
      temperature: options.temperature || assistant.settings?.temperature || 0.7,
      max_tokens: options.maxTokens || assistant.settings?.max_tokens || 2048,
      stream: false
    };

    // 更新消息状态为发送中
    this.messagesStore.updateMessage(assistantId, messageId, { status: 'sending' });

    try {
      const response = await this.llmService.chat(messages, requestOptions);

      // 更新消息状态为成功
      this.messagesStore.updateMessage(assistantId, messageId, {
        status: 'success',
        usage: response.usage
      });

      return response;
    } catch (error) {
      // 对于非流式请求，也使用统一的错误处理
      this.handleStreamError(error, assistant, assistantId, messageId);
      // 不再重新抛出错误，避免重复处理
    }
  }

  /**
   * 发送流式 LLM 请求
   */
  private async sendStreamLlmRequest(
    assistantId: string,
    messageId: string,
    assistant: Assistant,
    callbacks: StreamCallbacks = {}
  ): Promise<void> {
    // 创建 AbortController 用于取消请求
    const controller = new AbortController();
    this.activeRequests.set(messageId, controller);

    try {
      // 构建消息历史
      const messages = this.buildChatMessages(assistantId);

      // 构建请求选项
      const requestOptions = {
        model: assistant.model?.id,
        temperature: assistant.settings?.temperature || 0.7,
        max_tokens: assistant.settings?.max_tokens || 2048,
        stream: true
      };

      // 更新消息状态为发送中
      this.messagesStore.updateMessage(assistantId, messageId, { status: 'sending' });

      let accumulatedContent = '';
      let accumulatedThinking = '';
      let messageBlocks: any[] = [];

      await this.llmService.chatStream(messages, {
        onStart: () => {
          callbacks.onStart?.();
        },
        onChunk: (chunk) => {
          if (controller.signal.aborted) return;

          // 处理thinking类型的块
          if (chunk.type === 'thinking') {
            accumulatedThinking = chunk.accumulated || '';

            // 更新或添加thinking块
            const thinkingBlockIndex = messageBlocks.findIndex(block => block.type === 'thinking');
            const thinkingBlock = {
              type: 'thinking' as const,
              content: {
                content: accumulatedThinking,
                status: 'thinking' as const,
                startTime: new Date().toISOString()
              }
            };

            if (thinkingBlockIndex >= 0) {
              messageBlocks[thinkingBlockIndex] = thinkingBlock;
            } else {
              messageBlocks.unshift(thinkingBlock); // thinking块放在最前面
            }
          }

          // 处理content类型的块
          else if (chunk.type === 'content' || chunk.content) {
            const content = chunk.accumulated || this.extractChunkContent(chunk);
            if (content) {
              accumulatedContent = content;

              // 更新或添加文本块
              const textBlockIndex = messageBlocks.findIndex(block => block.type === 'text');
              const textBlock = {
                type: 'text' as const,
                content: accumulatedContent
              };

              if (textBlockIndex >= 0) {
                messageBlocks[textBlockIndex] = textBlock;
              } else {
                messageBlocks.push(textBlock);
              }
            }
          }

          // 实时更新消息内容
          if (messageBlocks.length > 0) {
            this.messagesStore.updateMessage(assistantId, messageId, {
              blocks: [...messageBlocks],
              status: 'sending'
            });
          }

          callbacks.onChunk?.(chunk);
        },
        onComplete: (response) => {
          if (controller.signal.aborted) return;

          // 更新thinking块状态为完成
          if (messageBlocks.length > 0) {
            const thinkingBlockIndex = messageBlocks.findIndex(block => block.type === 'thinking');
            if (thinkingBlockIndex >= 0) {
              const thinkingBlock = messageBlocks[thinkingBlockIndex];
              if (thinkingBlock.content && typeof thinkingBlock.content === 'object') {
                thinkingBlock.content.status = 'complete';
                thinkingBlock.content.endTime = new Date().toISOString();
              }
            }

            // 更新最终消息状态，包含完成的thinking块
            this.messagesStore.updateMessage(assistantId, messageId, {
              blocks: [...messageBlocks],
              status: 'success',
              usage: response?.usage
            });
          } else {
            // 没有消息块时的常规更新
            this.messagesStore.updateMessage(assistantId, messageId, {
              status: 'success',
              usage: response?.usage
            });
          }

          const finalMessage = this.messagesStore.getMessage(assistantId, messageId);
          if (finalMessage) {
            callbacks.onComplete?.(finalMessage);
          }
          this.activeRequests.delete(messageId);
        },
        onError: (error) => {
          if (controller.signal.aborted) return;

          this.handleStreamError(error, assistant, assistantId, messageId);
          callbacks.onError?.(error);
          this.activeRequests.delete(messageId);
        }
      }, requestOptions);

    } catch (error) {
      this.handleStreamError(error, assistant, assistantId, messageId);
      callbacks.onError?.(error as Error);
      this.activeRequests.delete(messageId);
      // 不再重新抛出错误，避免重复处理
    }
  }

  /**
   * 构建聊天消息历史
   */
  private buildChatMessages(assistantId: string): any[] {
    const messages = this.messagesStore.getMessages(assistantId);
    const assistant = this.assistantsStore.getAssistantById(assistantId);

    const chatMessages: any[] = [];

    // 添加系统消息
    if (assistant?.prompt) {
      chatMessages.push({
        role: 'system',
        content: assistant.prompt
      });
    }

    // 添加历史消息（只包含成功的消息）
    messages
      .filter(msg => msg.status === 'success')
      .forEach(msg => {
        const messageContent = this.buildMessageContent(msg.blocks);
        if (messageContent) {
          chatMessages.push({
            role: msg.role,
            content: messageContent
          });
        }
      });

    return chatMessages;
  }

  /**
   * 构建消息内容（支持多模态）
   */
  private buildMessageContent(blocks: MessageBlock[]): any {
    const textBlocks = blocks.filter(block => block.type === 'text');
    const imageBlocks = blocks.filter(block => block.type === 'image');

    // 如果只有文本，返回字符串
    if (imageBlocks.length === 0) {
      return textBlocks
        .map(block => typeof block.content === 'string' ? block.content : '')
        .join('\n')
        .trim();
    }

    // 如果有图片，返回多模态格式（OpenAI格式）
    const content: any[] = [];

    // 添加文本内容
    const textContent = textBlocks
      .map(block => typeof block.content === 'string' ? block.content : '')
      .join('\n')
      .trim();

    if (textContent) {
      content.push({
        type: 'text',
        text: textContent
      });
    }

    // 添加图片内容
    imageBlocks.forEach(block => {
      if (typeof block.content === 'object' && block.content && 'url' in block.content) {
        content.push({
          type: 'image_url',
          image_url: {
            url: block.content.url
          }
        });
      }
    });

    return content.length > 0 ? content : null;
  }

  /**
   * 提取文本内容（保留用于其他地方使用）
   */
  private extractTextContent(blocks: MessageBlock[]): string {
    return blocks
      .filter(block => block.type === 'text')
      .map(block => typeof block.content === 'string' ? block.content : '')
      .join('\n')
      .trim();
  }

  /**
   * 提取流式响应块的内容
   */
  private extractChunkContent(chunk: any): string {
    // 处理不同 API 的响应格式
    if (chunk.choices && chunk.choices[0]?.delta?.content) {
      return chunk.choices[0].delta.content;
    }

    if (chunk.content) {
      return chunk.content;
    }

    if (typeof chunk === 'string') {
      return chunk;
    }

    return '';
  }

  /**
   * 更新助手消息
   */
  private updateAssistantMessage(message: Message, response: any): Message {
    const content = response.choices?.[0]?.message?.content || response.content || '';

    const updatedMessage = {
      ...message,
      blocks: [{ type: 'text' as const, content }],
      status: 'success' as const,
      usage: response.usage
    };

    this.messagesStore.updateMessage(message.assistantId, message.id, updatedMessage);

    return updatedMessage;
  }

  /**
   * 处理流式请求错误
   */
  private handleStreamError(error: any, assistant: Assistant, assistantId: string, messageId: string): void {
    // 统一的错误记录点
    console.error('API请求失败:', error);

    // 只处理API错误，其他错误不添加错误块
    if (!this.isApiError(error)) {
      this.messagesStore.updateMessage(assistantId, messageId, {
        status: 'error'
      });
      return;
    }

    // 检查是否已经有错误块，避免重复添加
    const currentMessage = this.messagesStore.getMessage(assistantId, messageId);
    const hasErrorBlock = currentMessage?.blocks?.some(block => block.type === 'error');

    if (hasErrorBlock) {
      return; // 已经有错误块，不重复添加
    }

    // 创建错误块
    const errorBlock: MessageBlock = {
      type: 'error',
      content: this.createErrorBlock(error, assistant)
    };

    // 添加错误块到消息
    const updatedBlocks = [...(currentMessage?.blocks || []), errorBlock];
    this.messagesStore.updateMessage(assistantId, messageId, {
      status: 'error',
      blocks: updatedBlocks
    });
  }

  /**
   * 判断是否为API错误
   */
  private isApiError(error: any): boolean {
    // 如果错误已经是标准化的ErrorBlock格式，说明是API错误
    if (error.type && error.message) {
      return true;
    }

    // 检查是否有HTTP状态码
    if (error.status || error.response?.status) {
      return true;
    }

    // 检查是否有API错误结构
    if (error.error) {
      return true;
    }

    return false;
  }

  /**
   * 创建错误块
   */
  private createErrorBlock(error: any, assistant: Assistant): ErrorBlock {
    // 如果错误已经是标准化的ErrorBlock格式
    if (error.type && error.message) {
      return {
        type: error.type,
        code: error.code,
        message: error.message,
        details: error.details,
        timestamp: error.timestamp || new Date().toISOString(),
        provider: error.provider || assistant.model?.provider,
        model: error.model || assistant.model?.id,
        originalError: error.originalError
      };
    }

    // 如果是普通错误，创建基本的错误块
    return {
      type: 'unknown',
      message: error.message || '发生未知错误',
      details: error.stack || String(error),
      timestamp: new Date().toISOString(),
      provider: assistant.model?.provider,
      model: assistant.model?.id,
      originalError: error
    };
  }

  /**
   * 统一错误处理（仅用于非流式请求）
   */
  private handleError(error: Error, assistantId?: string, messageId?: string): void {
    console.error('MessageService Error:', error);

    // 更新消息状态
    if (assistantId && messageId) {
      this.messagesStore.updateMessage(assistantId, messageId, {
        status: 'error'
      });
    }
  }
}

// 单例模式导出
let messageServiceInstance: MessageService | null = null;

export function useMessageService(): MessageService {
  if (!messageServiceInstance) {
    messageServiceInstance = new MessageService();
  }
  return messageServiceInstance;
}

// 直接导出实例，用于组件中的导入（现在安全了，因为使用了懒加载）
export const messageService = useMessageService();
