/**
 * 统一的 HTTP 客户端
 * 提供请求/响应拦截、错误处理、重试机制等功能
 */

// 定义请求配置接口
export interface RequestConfig extends RequestInit {
  url: string;
  timeout?: number;
  retries?: number;
  retryDelay?: number;
}

// 定义响应接口
export interface ApiResponse<T = any> {
  data: T;
  status: number;
  statusText: string;
  headers: Headers;
}

// 定义错误接口
export interface ApiError extends Error {
  status?: number;
  response?: Response;
  config?: RequestConfig;
}

// 定义拦截器类型
export type RequestInterceptor = (config: RequestConfig) => RequestConfig | Promise<RequestConfig>;
export type ResponseInterceptor = (response: Response) => Response | Promise<Response>;
export type ErrorInterceptor = (error: ApiError) => Promise<never> | ApiError;

/**
 * HTTP 客户端类
 */
export class HttpClient {
  private baseURL: string;
  private defaultTimeout: number;
  private requestInterceptors: RequestInterceptor[] = [];
  private responseInterceptors: ResponseInterceptor[] = [];
  private errorInterceptors: ErrorInterceptor[] = [];

  constructor(baseURL: string = '', timeout: number = 30000) {
    this.baseURL = baseURL;
    this.defaultTimeout = timeout;
  }

  /**
   * 添加请求拦截器
   */
  addRequestInterceptor(interceptor: RequestInterceptor): void {
    this.requestInterceptors.push(interceptor);
  }

  /**
   * 添加响应拦截器
   */
  addResponseInterceptor(interceptor: ResponseInterceptor): void {
    this.responseInterceptors.push(interceptor);
  }

  /**
   * 添加错误拦截器
   */
  addErrorInterceptor(interceptor: ErrorInterceptor): void {
    this.errorInterceptors.push(interceptor);
  }

  /**
   * 构建完整的 URL
   */
  private buildURL(url: string): string {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    return `${this.baseURL}${url.startsWith('/') ? url : '/' + url}`;
  }

  /**
   * 创建带超时的 fetch 请求
   */
  private async fetchWithTimeout(url: string, config: RequestInit, timeout: number): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        ...config,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  /**
   * 执行请求拦截器
   */
  private async executeRequestInterceptors(config: RequestConfig): Promise<RequestConfig> {
    let processedConfig = config;
    for (const interceptor of this.requestInterceptors) {
      processedConfig = await interceptor(processedConfig);
    }
    return processedConfig;
  }

  /**
   * 执行响应拦截器
   */
  private async executeResponseInterceptors(response: Response): Promise<Response> {
    let processedResponse = response;
    for (const interceptor of this.responseInterceptors) {
      processedResponse = await interceptor(processedResponse);
    }
    return processedResponse;
  }

  /**
   * 执行错误拦截器
   */
  private async executeErrorInterceptors(error: ApiError): Promise<never> {
    let processedError = error;
    for (const interceptor of this.errorInterceptors) {
      try {
        processedError = await interceptor(processedError);
      } catch (interceptedError) {
        throw interceptedError;
      }
    }
    throw processedError;
  }

  /**
   * 延迟函数
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 核心请求方法
   */
  async request<T = any>(config: RequestConfig): Promise<ApiResponse<T>> {
    try {
      // 执行请求拦截器
      const processedConfig = await this.executeRequestInterceptors(config);
      
      const {
        url,
        timeout = this.defaultTimeout,
        retries = 0,
        retryDelay = 1000,
        ...fetchConfig
      } = processedConfig;

      const fullURL = this.buildURL(url);
      let lastError: ApiError;

      // 重试逻辑
      for (let attempt = 0; attempt <= retries; attempt++) {
        try {
          if (attempt > 0) {
            await this.delay(retryDelay * attempt);
          }

          const response = await this.fetchWithTimeout(fullURL, fetchConfig, timeout);
          
          // 执行响应拦截器
          const processedResponse = await this.executeResponseInterceptors(response);

          if (!processedResponse.ok) {
            const error: ApiError = new Error(`HTTP ${processedResponse.status}: ${processedResponse.statusText}`);
            error.status = processedResponse.status;
            error.response = processedResponse;
            error.config = processedConfig;
            throw error;
          }

          const data = await processedResponse.json();
          
          return {
            data,
            status: processedResponse.status,
            statusText: processedResponse.statusText,
            headers: processedResponse.headers,
          };

        } catch (error) {
          lastError = error as ApiError;
          lastError.config = processedConfig;
          
          // 如果是最后一次尝试，或者不是网络错误，直接抛出
          if (attempt === retries || (error as ApiError).status) {
            break;
          }
        }
      }

      // 执行错误拦截器
      return await this.executeErrorInterceptors(lastError!);

    } catch (error) {
      return await this.executeErrorInterceptors(error as ApiError);
    }
  }

  /**
   * GET 请求
   */
  async get<T = any>(url: string, config?: Partial<RequestConfig>): Promise<ApiResponse<T>> {
    return this.request<T>({
      url,
      method: 'GET',
      ...config,
    });
  }

  /**
   * POST 请求
   */
  async post<T = any>(url: string, data?: any, config?: Partial<RequestConfig>): Promise<ApiResponse<T>> {
    return this.request<T>({
      url,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
      headers: {
        'Content-Type': 'application/json',
        ...config?.headers,
      },
      ...config,
    });
  }

  /**
   * PUT 请求
   */
  async put<T = any>(url: string, data?: any, config?: Partial<RequestConfig>): Promise<ApiResponse<T>> {
    return this.request<T>({
      url,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
      headers: {
        'Content-Type': 'application/json',
        ...config?.headers,
      },
      ...config,
    });
  }

  /**
   * DELETE 请求
   */
  async delete<T = any>(url: string, config?: Partial<RequestConfig>): Promise<ApiResponse<T>> {
    return this.request<T>({
      url,
      method: 'DELETE',
      ...config,
    });
  }
}

// 创建默认的 HTTP 客户端实例
export const httpClient = new HttpClient();

// 添加默认的请求拦截器
httpClient.addRequestInterceptor((config) => {
  // 添加默认的 Content-Type
  if (!config.headers) {
    config.headers = {};
  }
  
  if (!config.headers['Content-Type'] && config.method !== 'GET') {
    config.headers['Content-Type'] = 'application/json';
  }

  return config;
});

// 添加默认的错误拦截器
httpClient.addErrorInterceptor((error) => {
  // 使用统一的错误处理机制
  const { handleError, createApiError, ErrorSeverity } = require('@/utils/error-handler');

  const apiError = createApiError(
    error.message,
    error.status,
    error.status >= 500 ? ErrorSeverity.HIGH : ErrorSeverity.MEDIUM
  );

  apiError.context = {
    url: error.config?.url,
    method: error.config?.method,
    status: error.status,
  };

  handleError(apiError, 'HTTP Client');
  throw error;
});
