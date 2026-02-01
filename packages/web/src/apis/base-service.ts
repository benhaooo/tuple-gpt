/**
 * API 服务基类
 * 提供通用的 API 服务功能
 */

import { HttpClient, RequestConfig, ApiResponse } from './http-client';

// 定义 API 提供商类型
export enum ApiProvider {
  OPENAI = 'openai',
  AZURE = 'azure',
  DOUBAO = 'doubao',
  LOCAL = 'local',
}

// 定义 API 配置接口
export interface ApiConfig {
  host: string;
  key: string;
  type: ApiProvider;
}

// 定义请求数据接口
export interface RequestData {
  model: string;
  messages: any[];
  stream?: boolean;
  temperature?: number;
  max_tokens?: number;
  [key: string]: any;
}

// 定义聊天完成响应接口
export interface ChatCompletionResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * API 服务基类
 */
export abstract class BaseApiService {
  protected httpClient: HttpClient;
  protected config: ApiConfig;

  constructor(config: ApiConfig) {
    this.config = config;
    this.httpClient = new HttpClient(config.host);
    this.setupInterceptors();
  }

  /**
   * 设置拦截器
   */
  protected setupInterceptors(): void {
    // 添加认证拦截器
    this.httpClient.addRequestInterceptor((requestConfig) => {
      const headers = this.getAuthHeaders();
      return {
        ...requestConfig,
        headers: {
          ...requestConfig.headers,
          ...headers,
        },
      };
    });

    // 添加响应拦截器
    this.httpClient.addResponseInterceptor((response) => {
      // 可以在这里添加通用的响应处理逻辑
      return response;
    });

    // 添加错误拦截器
    this.httpClient.addErrorInterceptor((error) => {
      // 可以在这里添加通用的错误处理逻辑
      console.error(`${this.config.type} API Error:`, error);
      throw error;
    });
  }

  /**
   * 获取认证头
   */
  protected abstract getAuthHeaders(): Record<string, string>;

  /**
   * 构建聊天完成请求 URL
   */
  protected abstract buildChatCompletionUrl(model: string): string;

  /**
   * 处理请求数据
   */
  protected processRequestData(data: RequestData): RequestData {
    // 子类可以重写此方法来处理特定的数据转换
    return data;
  }

  /**
   * 聊天完成请求
   */
  async chatCompletion(data: RequestData): Promise<Response> {
    const processedData = this.processRequestData(data);
    const url = this.buildChatCompletionUrl(processedData.model);

    try {
      // 对于流式请求，直接返回 Response 对象
      if (processedData.stream) {
        const response = await this.httpClient.request({
          url,
          method: 'POST',
          body: JSON.stringify(processedData),
          headers: {
            'Content-Type': 'application/json',
            ...this.getAuthHeaders(),
          },
        });
        
        // 返回原始的 Response 对象用于流式处理
        return new Response(response.data, {
          status: response.status,
          statusText: response.statusText,
          headers: response.headers,
        });
      }

      // 非流式请求
      const response = await this.httpClient.post<ChatCompletionResponse>(url, processedData);
      
      // 创建一个包含 JSON 数据的 Response 对象
      return new Response(JSON.stringify(response.data), {
        status: response.status,
        statusText: response.statusText,
        headers: new Headers({
          'Content-Type': 'application/json',
        }),
      });

    } catch (error) {
      // 创建错误响应
      const errorResponse = {
        error: {
          message: error.message || 'Unknown error',
          type: 'api_error',
          code: error.status || 500,
        },
      };

      return new Response(JSON.stringify(errorResponse), {
        status: error.status || 500,
        statusText: error.message || 'Internal Server Error',
        headers: new Headers({
          'Content-Type': 'application/json',
        }),
      });
    }
  }

  /**
   * 更新配置
   */
  updateConfig(newConfig: Partial<ApiConfig>): void {
    this.config = { ...this.config, ...newConfig };
    if (newConfig.host) {
      this.httpClient = new HttpClient(newConfig.host);
      this.setupInterceptors();
    }
  }

  /**
   * 获取当前配置
   */
  getConfig(): ApiConfig {
    return { ...this.config };
  }
}

/**
 * OpenAI API 服务
 */
export class OpenAIApiService extends BaseApiService {
  protected getAuthHeaders(): Record<string, string> {
    return {
      'Authorization': `Bearer ${this.config.key}`,
    };
  }

  protected buildChatCompletionUrl(model: string): string {
    return '/v1/chat/completions';
  }
}

/**
 * Azure OpenAI API 服务
 */
export class AzureApiService extends BaseApiService {
  protected getAuthHeaders(): Record<string, string> {
    return {
      'api-key': this.config.key,
    };
  }

  protected buildChatCompletionUrl(model: string): string {
    return `/openai/deployments/${model}/chat/completions?api-version=2024-04-01-preview`;
  }
}

/**
 * 豆包 API 服务
 */
export class DoubaoApiService extends BaseApiService {
  protected getAuthHeaders(): Record<string, string> {
    return {
      'Authorization': `Bearer ${this.config.key}`,
    };
  }

  protected buildChatCompletionUrl(model: string): string {
    // 豆包需要通过代理
    const proxyUrl = 'http://localhost:3111/apis/proxy';
    const targetUrl = `${this.config.host}/chat/completions`;
    return `${proxyUrl}?apiUrl=${encodeURIComponent(targetUrl)}`;
  }

  protected setupInterceptors(): void {
    super.setupInterceptors();
    
    // 豆包特殊处理：更新 httpClient 的 baseURL 为代理地址
    this.httpClient = new HttpClient('http://localhost:3111');
    super.setupInterceptors();
  }
}

/**
 * 本地 API 服务
 */
export class LocalApiService extends BaseApiService {
  protected getAuthHeaders(): Record<string, string> {
    return {}; // 本地服务通常不需要认证
  }

  protected buildChatCompletionUrl(model: string): string {
    return '/api/chat';
  }
}

/**
 * API 服务工厂
 */
export class ApiServiceFactory {
  static createService(config: ApiConfig): BaseApiService {
    switch (config.type) {
      case ApiProvider.OPENAI:
        return new OpenAIApiService(config);
      case ApiProvider.AZURE:
        return new AzureApiService(config);
      case ApiProvider.DOUBAO:
        return new DoubaoApiService(config);
      case ApiProvider.LOCAL:
        return new LocalApiService(config);
      default:
        throw new Error(`Unsupported API provider: ${config.type}`);
    }
  }
}
