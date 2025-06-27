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