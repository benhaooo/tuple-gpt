import { ErrorBlock } from '@tuple-gpt/shared';

/**
 * API错误转换器
 * 将各种原始错误转换为统一的ErrorBlock格式
 */
export class ApiErrorConverter {
  /**
   * 将原始错误转换为标准ErrorBlock
   */
  static convertToErrorBlock(error: any, provider: string, model?: string): ErrorBlock {
    // 网络错误
    if (error.name === 'TypeError' && error.message && error.message.includes('fetch')) {
      return {
        type: 'network',
        message: '网络连接失败，请检查网络设置',
        details: error.message || '网络连接失败',
        timestamp: new Date().toISOString(),
        provider,
        model,
        originalError: error
      };
    }

    // 超时错误
    if (error.name === 'AbortError' || (error.message && error.message.includes('timeout'))) {
      return {
        type: 'timeout',
        message: '请求超时，请稍后重试',
        details: error.message || '请求超时',
        timestamp: new Date().toISOString(),
        provider,
        model,
        originalError: error
      };
    }

    // HTTP错误
    if (error.status || error.response?.status) {
      return this.convertHttpError(error, provider, model);
    }

    // API特定错误
    if (error.error || error.message) {
      return this.convertApiError(error, provider, model);
    }

    // 未知错误
    return {
      type: 'unknown',
      message: '发生未知错误，请稍后重试',
      details: error.message || String(error),
      timestamp: new Date().toISOString(),
      provider,
      model,
      originalError: error
    };
  }

  /**
   * 转换HTTP错误
   */
  private static convertHttpError(error: any, provider: string, model?: string): ErrorBlock {
    const status = error.status || error.response?.status;
    const statusText = error.statusText || error.response?.statusText;
    
    let type: ErrorBlock['type'] = 'api';
    let message = 'API请求失败';

    switch (status) {
      case 400:
        type = 'validation';
        message = '请求参数错误，请检查输入内容';
        break;
      case 401:
        type = 'auth';
        message = 'API密钥无效，请检查配置';
        break;
      case 403:
        type = 'auth';
        message = '访问被拒绝，请检查API权限';
        break;
      case 429:
        type = 'quota';
        message = '请求频率过高或余额不足，请稍后重试';
        break;
      case 500:
      case 502:
      case 503:
      case 504:
        type = 'api';
        message = 'AI服务暂时不可用，请稍后重试';
        break;
      default:
        type = 'api';
        message = `API请求失败 (${status})`;
    }

    return {
      type,
      code: status,
      message,
      details: `${status} ${statusText}`,
      timestamp: new Date().toISOString(),
      provider,
      model,
      originalError: error
    };
  }

  /**
   * 转换API特定错误
   */
  private static convertApiError(error: any, provider: string, model?: string): ErrorBlock {
    // OpenAI格式错误
    if (error.error?.type || error.error?.code) {
      return this.convertOpenAIError(error, provider, model);
    }

    // Anthropic格式错误
    if (error.error?.type && provider.toLowerCase().includes('anthropic')) {
      return this.convertAnthropicError(error, provider, model);
    }

    // Gemini格式错误
    if (error.error?.code && provider.toLowerCase().includes('gemini')) {
      return this.convertGeminiError(error, provider, model);
    }

    // 通用错误
    const message = error.error?.message || error.message || '请求失败';
    return {
      type: 'api',
      message: this.getUserFriendlyMessage(message),
      details: message,
      timestamp: new Date().toISOString(),
      provider,
      model,
      originalError: error
    };
  }

  /**
   * 转换OpenAI错误
   */
  private static convertOpenAIError(error: any, provider: string, model?: string): ErrorBlock {
    const apiError = error.error;
    let type: ErrorBlock['type'] = 'api';

    switch (apiError.type) {
      case 'invalid_request_error':
        type = 'validation';
        break;
      case 'authentication_error':
        type = 'auth';
        break;
      case 'permission_error':
        type = 'auth';
        break;
      case 'rate_limit_error':
        type = 'quota';
        break;
      case 'insufficient_quota':
        type = 'quota';
        break;
      case 'server_error':
        type = 'api';
        break;
    }

    return {
      type,
      code: apiError.code,
      message: this.getUserFriendlyMessage(apiError.message),
      details: apiError.message,
      timestamp: new Date().toISOString(),
      provider,
      model,
      originalError: error
    };
  }

  /**
   * 转换Anthropic错误
   */
  private static convertAnthropicError(error: any, provider: string, model?: string): ErrorBlock {
    const apiError = error.error;
    let type: ErrorBlock['type'] = 'api';

    switch (apiError.type) {
      case 'invalid_request_error':
        type = 'validation';
        break;
      case 'authentication_error':
        type = 'auth';
        break;
      case 'permission_error':
        type = 'auth';
        break;
      case 'rate_limit_error':
        type = 'quota';
        break;
      case 'api_error':
        type = 'api';
        break;
    }

    return {
      type,
      message: this.getUserFriendlyMessage(apiError.message),
      details: apiError.message,
      timestamp: new Date().toISOString(),
      provider,
      model,
      originalError: error
    };
  }

  /**
   * 转换Gemini错误
   */
  private static convertGeminiError(error: any, provider: string, model?: string): ErrorBlock {
    const apiError = error.error;
    let type: ErrorBlock['type'] = 'api';

    switch (apiError.code) {
      case 400:
        type = 'validation';
        break;
      case 401:
      case 403:
        type = 'auth';
        break;
      case 429:
        type = 'quota';
        break;
      case 500:
      case 503:
        type = 'api';
        break;
    }

    return {
      type,
      code: apiError.code,
      message: this.getUserFriendlyMessage(apiError.message),
      details: apiError.message,
      timestamp: new Date().toISOString(),
      provider,
      model,
      originalError: error
    };
  }

  /**
   * 获取用户友好的错误消息
   */
  private static getUserFriendlyMessage(originalMessage: string): string {
    if (!originalMessage) {
      return '发生未知错误';
    }

    const message = originalMessage.toLowerCase();

    if (message.includes('api key') || message.includes('unauthorized') || message.includes('authentication')) {
      return 'API密钥无效，请检查配置';
    }

    if (message.includes('rate limit') || message.includes('too many requests')) {
      return '请求频率过高，请稍后重试';
    }

    if (message.includes('quota') || message.includes('billing') || message.includes('insufficient')) {
      return 'API余额不足，请检查账户设置';
    }

    if (message.includes('model') && message.includes('not found')) {
      return '指定的模型不存在或不可用';
    }

    if (message.includes('timeout') || message.includes('timed out')) {
      return '请求超时，请稍后重试';
    }

    if (message.includes('network') || message.includes('connection')) {
      return '网络连接失败，请检查网络设置';
    }

    if (message.includes('server error') || message.includes('internal error')) {
      return 'AI服务暂时不可用，请稍后重试';
    }

    // 如果没有匹配的模式，返回原始消息（但限制长度）
    return originalMessage.length > 100 ? originalMessage.substring(0, 100) + '...' : originalMessage;
  }
}
