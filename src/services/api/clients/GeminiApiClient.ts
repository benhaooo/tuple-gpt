import { ApiClient } from '../interfaces/ApiClient';
import { Provider } from '@/stores/modules/llm';

// Gemini API客户端
export class GeminiApiClient implements ApiClient {
  private apiKey: string;
  private apiHost: string;
  
  constructor(provider: Provider) {
    this.apiKey = provider.apiKey;
    this.apiHost = provider.apiHost || 'https://generativelanguage.googleapis.com/v1';
  }
  
  async chatCompletion(messages: any[], options?: any): Promise<any> {
    // 将messages转换为Gemini格式
    const geminiMessages = this.convertMessagesToGeminiFormat(messages);
    
    const url = `${this.apiHost}/models/${options?.model || 'gemini-1.5-pro'}:generateContent?key=${this.apiKey}`;
    const headers = {
      'Content-Type': 'application/json'
    };
    
    const body = {
      contents: geminiMessages,
      generationConfig: {
        temperature: options?.temperature || 0.7,
        topK: options?.topK || 40,
        topP: options?.topP || 0.95,
        maxOutputTokens: options?.max_tokens || 8192,
        ...options
      }
    };
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body)
      });
      
      if (!response.ok) {
        throw new Error(`Gemini API error: ${response.status} ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Gemini API request failed:', error);
      throw error;
    }
  }
  
  private convertMessagesToGeminiFormat(messages: any[]): any[] {
    return messages.map(msg => {
      let role = msg.role === 'user' ? 'user' : 'model';
      
      // 处理系统消息
      if (msg.role === 'system') {
        role = 'user';
      }
      
      return {
        role,
        parts: [{text: msg.content}]
      };
    });
  }
  
  async listModels(): Promise<any> {
    const url = `${this.apiHost}/models?key=${this.apiKey}`;
    const headers = {
      'Content-Type': 'application/json'
    };
    
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers
      });
      
      if (!response.ok) {
        throw new Error(`Gemini API error: ${response.status} ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Gemini API request failed:', error);
      throw error;
    }
  }
  
  async embeddings(input: string | string[]): Promise<any> {
    const url = `${this.apiHost}/models/embedding-001:embedContent?key=${this.apiKey}`;
    const headers = {
      'Content-Type': 'application/json'
    };
    
    const body = {
      content: {
        parts: [{
          text: Array.isArray(input) ? input.join(' ') : input
        }]
      }
    };
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body)
      });
      
      if (!response.ok) {
        throw new Error(`Gemini API error: ${response.status} ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Gemini API request failed:', error);
      throw error;
    }
  }
} 