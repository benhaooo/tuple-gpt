import { ApiClient } from '../interfaces/ApiClient';
import { Provider } from '@/stores/modules/llm';

// Anthropic API客户端
export class AnthropicApiClient implements ApiClient {
  private apiKey: string;
  private apiHost: string;
  
  constructor(provider: Provider) {
    this.apiKey = provider.apiKey;
    this.apiHost = provider.apiHost || 'https://api.anthropic.com/v1';
  }
  
  async chatCompletion(messages: any[], options?: any): Promise<any> {
    const url = `${this.apiHost}/messages`;
    const headers = {
      'x-api-key': this.apiKey,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json'
    };
    
    // 将OpenAI格式消息转换为Anthropic格式
    const anthropicMessages = this.convertMessagesToAnthropicFormat(messages);
    
    const body = {
      messages: anthropicMessages,
      model: options?.model || 'claude-3-opus-20240229',
      max_tokens: options?.max_tokens || 1024,
      ...options
    };
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body)
      });
      
      if (!response.ok) {
        throw new Error(`Anthropic API error: ${response.status} ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Anthropic API request failed:', error);
      throw error;
    }
  }

  /**
   * 流式聊天完成
   * 实现Anthropic的流式处理逻辑，支持thinking模型
   */
  async chatCompletionStream(messages: any[], options?: any): Promise<void> {
    const url = `${this.apiHost}/messages`;
    const headers = {
      'x-api-key': this.apiKey,
      'Content-Type': 'application/json',
      'anthropic-version': '2023-06-01',
      'Accept': 'text/event-stream'
    };

    // 转换消息格式
    const anthropicMessages = this.convertMessagesToAnthropicFormat(messages);
    const systemMessage = messages.find(msg => msg.role === 'system');

    const body = {
      model: options?.model || 'claude-3-sonnet-20240229',
      messages: anthropicMessages,
      max_tokens: options?.max_tokens || 2048,
      stream: true,
      ...(systemMessage && { system: systemMessage.content }),
      ...options
    };

    // 从options中提取回调
    const onChunk = options?.onChunk;
    const onComplete = options?.onComplete;
    const onError = options?.onError;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        const errorText = await response.text();
        const error = new Error(`Anthropic API error: ${response.status} ${response.statusText} - ${errorText}`);
        if (onError) onError(error);
        throw error;
      }

      if (!response.body) {
        const error = new Error('响应中没有响应体');
        if (onError) onError(error);
        throw error;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';
      let fullResponse: any = null;
      let accumulatedContent = '';
      let accumulatedThinking = '';

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.substring(6);

              if (data === '[DONE]') {
                if (onComplete) onComplete(fullResponse);
                return;
              }

              try {
                const chunk = JSON.parse(data);

                // 更新完整响应
                if (!fullResponse && chunk.message) {
                  fullResponse = chunk.message;
                }

                // 处理Anthropic特有的thinking响应格式
                if (chunk.type === 'content_block_delta' && chunk.delta) {
                  if (chunk.delta.type === 'text_delta') {
                    const content = chunk.delta.text || '';

                    // 检查是否是thinking内容
                    if (this.isThinkingContent(chunk, content)) {
                      accumulatedThinking += content;

                      const thinkingChunk = {
                        ...chunk,
                        type: 'thinking',
                        content: content,
                        accumulated: accumulatedThinking
                      };

                      if (onChunk) await onChunk(thinkingChunk);
                    } else {
                      accumulatedContent += content;

                      const contentChunk = {
                        ...chunk,
                        type: 'content',
                        content: content,
                        accumulated: accumulatedContent
                      };

                      if (onChunk) await onChunk(contentChunk);
                    }
                  }
                } else {
                  // 其他类型的响应块，直接传递
                  if (onChunk) await onChunk(chunk);
                }
              } catch (error) {
                console.error('处理Anthropic响应块失败:', error);
              }
            }
          }
        }

        if (onComplete) onComplete(fullResponse);
      } catch (error) {
        const streamError = new Error(`流读取错误: ${error}`);
        if (onError) onError(streamError);
        throw streamError;
      } finally {
        reader.releaseLock();
      }
    } catch (error) {
      console.error('Anthropic 流式 API 请求失败:', error);
      if (onError && error instanceof Error) onError(error);
      throw error;
    }
  }

  /**
   * 判断是否是thinking内容
   * 扩展点：根据Anthropic thinking模型的实际格式进行调整
   */
  private isThinkingContent(chunk: any, content: string): boolean {
    // 根据Anthropic thinking模型的实际格式判断
    // 示例实现：检查特定的标记或字段

    if (chunk.content_block && chunk.content_block.type === 'thinking') {
      return true;
    }

    // 检查内容模式
    if (content.includes('<thinking>') || content.includes('</thinking>')) {
      return true;
    }

    // 默认返回false，表示是普通内容
    return false;
  }

  private convertMessagesToAnthropicFormat(messages: any[]): any[] {
    // 提取系统消息
    const systemMessage = messages.find(msg => msg.role === 'system');
    const systemContent = systemMessage ? systemMessage.content : '';
    
    // 过滤掉系统消息
    const nonSystemMessages = messages.filter(msg => msg.role !== 'system');
    
    // 转换为Anthropic格式
    return nonSystemMessages.map(msg => {
      return {
        role: msg.role === 'assistant' ? 'assistant' : 'user',
        content: msg.content
      };
    });
  }
  
  async listModels(): Promise<any> {
    // Anthropic API 目前不支持列出模型的端点，返回预定义列表
    return {
      data: [
        { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus' },
        { id: 'claude-3-sonnet-20240229', name: 'Claude 3 Sonnet' },
        { id: 'claude-3-haiku-20240229', name: 'Claude 3 Haiku' },
        { id: 'claude-2.1', name: 'Claude 2.1' },
        { id: 'claude-instant-1.2', name: 'Claude Instant 1.2' }
      ]
    };
  }
} 