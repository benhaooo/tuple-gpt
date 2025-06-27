import { Provider } from '@/stores/modules/llm';
import { ApiClient } from './interfaces/ApiClient';
import { OpenAIApiClient } from './clients/OpenAIApiClient';
import { GeminiApiClient } from './clients/GeminiApiClient';
import { AnthropicApiClient } from './clients/AnthropicApiClient';
import { AzureOpenAIApiClient } from './clients/AzureOpenAIApiClient';

// API客户端工厂
export class ApiClientFactory {
  // 单例模式: 缓存不同提供商的客户端实例
  private static clients: { [key: string]: ApiClient } = {};
  
  // 工厂方法: 根据提供商类型和配置创建客户端
  static createClient(provider: Provider): ApiClient {
    // 如果已存在此提供商的客户端实例，则返回
    const cacheKey = `${provider.type}-${provider.id}`;
    
    if (this.clients[cacheKey]) {
      return this.clients[cacheKey];
    }
    
    // 根据类型创建新的客户端实例
    let client: ApiClient;
    
    switch (provider.type.toLowerCase()) {
      case 'openai':
        client = new OpenAIApiClient(provider);
        break;
        
      case 'gemini':
        client = new GeminiApiClient(provider);
        break;
        
      case 'anthropic':
        client = new AnthropicApiClient(provider);
        break;
        
      case 'azure-openai':
        client = new AzureOpenAIApiClient(provider);
        break;
        
      default:
        throw new Error(`Unsupported provider type: ${provider.type}`);
    }
    
    // 缓存客户端实例
    this.clients[cacheKey] = client;
    
    return client;
  }
  
  // 清除特定提供商的客户端缓存
  static clearClient(providerId: string): void {
    const keys = Object.keys(this.clients).filter(key => key.includes(providerId));
    keys.forEach(key => delete this.clients[key]);
  }
  
  // 清除所有客户端缓存
  static clearAllClients(): void {
    this.clients = {};
  }
}

// 使用示例
export function createApiClient(provider: Provider): ApiClient {
  return ApiClientFactory.createClient(provider);
} 