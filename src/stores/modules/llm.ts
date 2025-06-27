import { defineStore } from 'pinia';
import { PROVIDER_CONFIG } from '@/config/providers';

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
  group: string; // 模型所属的分组，例如"GPT-4"
  type: ModelType[]; // 模型的能力类型数组，如 'vision', 'text', 'embedding'
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
  isAuthed: boolean; // 是否已通过认证
  rateLimit?: number; // API请求的速率限制
  isNotSupportArrayContent?: boolean; // 标记该提供商是否不支持特定格式的内容数组
  isVertex?: boolean; // 标记是否为Google Vertex AI
  notes: string; // 用户为这个提供商添加的备注
}

// PROVIDER_CONFIG 的类型
interface ProviderConfigItem {
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

export const useLlmStore = defineStore('llm', {
  state: () => ({
    // 将PROVIDER_CONFIG对象转换为Provider数组
    providers: Object.entries(PROVIDER_CONFIG).map(([key, config]) => {
      // 确保config的类型正确
      const providerConfig = config as ProviderConfigItem;
      
      return {
        id: crypto.randomUUID(), // 生成唯一ID
        type: key, // 将PROVIDER_CONFIG的key设置为type
        name: key, // 默认使用key作为名称
        apiKey: '', // 初始化为空
        apiHost: providerConfig.api.url || '',
        apiVersion: undefined, // 默认undefined
        models: [], // 初始化为空数组，后续可以通过API获取
        enabled: true, // 默认启用
        isSystem: true, // 默认为系统提供的
        isAuthed: false, // 默认未认证
        isVertex: key === 'vertexai', // 检查是否为Google Vertex AI
        notes: '', // 默认无备注
      } as Provider;
    }),
  }),

  actions: {
    // 添加自定义提供商
    addProvider(provider: Partial<Provider>) {
      const newProvider: Provider = {
        id: crypto.randomUUID(),
        type: provider.type || 'custom',
        name: provider.name || '自定义提供商',
        apiKey: provider.apiKey || '',
        apiHost: provider.apiHost || '',
        models: provider.models || [],
        enabled: provider.enabled !== false,
        isSystem: false,
        isAuthed: false,
        notes: provider.notes || '',
        ...provider
      } as Provider;

      this.providers.push(newProvider);
      return newProvider.id;
    },

    // 更新提供商信息
    updateProvider(id: string, updates: Partial<Provider>) {
      const index = this.providers.findIndex((p: Provider) => p.id === id);
      if (index >= 0) {
        this.providers[index] = { ...this.providers[index], ...updates };
      }
    },

    // 删除提供商
    removeProvider(id: string) {
      const index = this.providers.findIndex((p: Provider) => p.id === id);
      if (index >= 0 && !this.providers[index].isSystem) {
        this.providers.splice(index, 1);
      }
    }
  },
  
  persist: true,
});