import { ApiClient } from '../interfaces/ApiClient';
import { Provider } from '@shared/stores/modules/llm';

// Azure OpenAI API客户端
export class AzureOpenAIApiClient implements ApiClient {
  private apiKey: string;
  private apiHost: string;
  private apiVersion: string;
  
  constructor(provider: Provider) {
    this.apiKey = provider.apiKey;
    this.apiHost = provider.apiHost;
    this.apiVersion = provider.apiVersion || '2023-05-15';
  }
  
  async chatCompletion(messages: any[], options?: any): Promise<any> {
    // 从选项中提取部署名
    const deploymentId = options?.model || options?.deployment_id;
    
    if (!deploymentId) {
      throw new Error('Azure OpenAI requires a deployment_id or model');
    }
    
    const url = `${this.apiHost}/openai/deployments/${deploymentId}/chat/completions?api-version=${this.apiVersion}`;
    const headers = {
      'api-key': this.apiKey,
      'Content-Type': 'application/json'
    };
    
    const body = {
      messages,
      ...options
    };
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body)
      });
      
      if (!response.ok) {
        throw new Error(`Azure OpenAI API error: ${response.status} ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Azure OpenAI API request failed:', error);
      throw error;
    }
  }
  
  async listModels(): Promise<any> {
    const url = `${this.apiHost}/openai/deployments?api-version=${this.apiVersion}`;
    const headers = {
      'api-key': this.apiKey,
      'Content-Type': 'application/json'
    };
    
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers
      });
      
      if (!response.ok) {
        throw new Error(`Azure OpenAI API error: ${response.status} ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Azure OpenAI API request failed:', error);
      throw error;
    }
  }
  
  async embeddings(input: string | string[]): Promise<any> {
    // 从选项中提取部署名
    const deploymentId = 'text-embedding-ada-002'; // 假设这是默认的嵌入模型部署
    
    const url = `${this.apiHost}/openai/deployments/${deploymentId}/embeddings?api-version=${this.apiVersion}`;
    const headers = {
      'api-key': this.apiKey,
      'Content-Type': 'application/json'
    };
    
    const body = {
      input: Array.isArray(input) ? input : [input]
    };
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body)
      });
      
      if (!response.ok) {
        throw new Error(`Azure OpenAI API error: ${response.status} ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Azure OpenAI API request failed:', error);
      throw error;
    }
  }
} 