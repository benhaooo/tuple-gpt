import { Provider } from '@/types/llm';
import { ApiClient } from './interfaces/ApiClient';
import { OpenAIApiClient } from './clients/OpenAIApiClient';
import { GeminiApiClient } from './clients/GeminiApiClient';
import { AnthropicApiClient } from './clients/AnthropicApiClient';
import { AzureOpenAIApiClient } from './clients/AzureOpenAIApiClient';

// API客户端工厂
export class ApiClientFactory {
  // 根据方案一，移除了缓存逻辑，确保每次都创建新的客户端实例
  
  // 工厂方法: 根据提供商类型和配置创建客户端
  static createClient(provider: Provider): ApiClient {
    // 直接创建新的客户端实例，不使用缓存
    let client: ApiClient;
    
    switch (provider.type?.toLowerCase()) {
      case 'openai':
      case '302ai':
      case 'silicon':
      case 'moonshot':
      case 'modelscope':
      case 'doubao':
      case 'minimax':
      case 'openrouter':
      case 'ollama':
      case 'grok':
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
    
    return client;
  }
}