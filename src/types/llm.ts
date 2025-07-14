// Provider类型定义
export type ProviderType = string; // 如'openai', 'anthropic', 'gemini'等

// 模型功能类型
export type ModelType = 'vision' | 'text' | 'embedding' | string;

// 模型价格信息
export interface ModelPricing {
  input: number; // 输入每百万token价格
  output: number; // 输出每百万token价格
}

// 模型定义
export interface Model {
  id: string; // 模型的唯一标识符，例如 gpt-4-turbo
  provider: string; // 该模型所属的提供商的id
  name: string; // 用户看到的模型显示名称，例如"GPT-4 Turbo"
  group?: string; // 模型所属的分组，例如"GPT-4"
  type?: ModelType[]; // 模型的能力类型数组，如 'vision', 'text', 'embedding'
  pricing?: ModelPricing; // 模型的定价信息（可选）
}

// 提供商定义
export interface Provider {
  id: string; // 提供商的唯一标识符，通常是自动生成的uuid
  type: ProviderType; // 提供商的类型，例如 'openai', 'anthropic', 'gemini' 等
  name: string; // 用户自定义的名称，例如"My OpenAI Key"或"Local Llama3"
  apiKey: string; // 用于API认证的密钥
  apiHost: string; // API基础URL
  apiVersion?: string; // 某些API（如Azure OpenAI）需要的版本号
  models: Model[]; // 这个提供商下所有可用模型的列表
  enabled: boolean; // 该提供商是否启用
  isSystem: boolean; // 是否为系统内置的默认提供商
  rateLimit?: number; // API请求的速率限制
  isNotSupportArrayContent?: boolean; // 标记该提供商是否不支持特定格式的内容数组
  notes: string; // 用户为这个提供商添加的备注
}

// PROVIDER_CONFIG 的类型
export interface ProviderConfigItem {
  api: {
    url: string;
  };
  websites: {
    official: string;
    apiKey?: string;
    docs: string;
    models: string;
  };
  modelList?: any[]; // 可选的默认模型列表
} 