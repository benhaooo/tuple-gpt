/**
 * 提供商类型
 */
export type ProviderType = 'openai' | 'anthropic' | 'google' | 'custom';

/**
 * 模型接口
 */
export interface Model {
  id: string;
  name: string;
  provider: ProviderType;
  description?: string;
  contextWindow?: number;
  maxTokens?: number;
  supportVision?: boolean;
  supportAudio?: boolean;
}

/**
 * 提供商配置项
 */
export interface ProviderConfigItem {
  apiKey?: string;
  apiEndpoint?: string;
  enabled?: boolean;
}

/**
 * 提供商接口
 */
export interface Provider {
  id: string;
  name: string;
  type: ProviderType;
  models: Model[];
  config?: ProviderConfigItem;
}
