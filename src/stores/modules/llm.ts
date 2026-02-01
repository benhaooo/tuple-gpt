import { defineStore } from 'pinia';
import { PROVIDER_CONFIG } from '@/config/providers';
import { Provider, ProviderType, Model, ProviderConfigItem } from '@/types/llm';


export const useLlmStore = defineStore('llm', {
  state: () => ({
    // 将PROVIDER_CONFIG对象转换为Provider数组，并添加默认模型
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
        models: [], // 使用默认模型或空数组
        enabled: false, // 默认启用
        isSystem: true, // 默认为系统提供的
        notes: '', // 默认无备注
      } as Provider;
    }),
  }),

  getters: {
    // 获取所有可用的模型
    allAvailableModels: (state) => {
      const models: Model[] = [];
      state.providers
        .filter(provider => provider.enabled)
        .forEach(provider => {
          provider.models.forEach(model => {
            models.push({
              ...model,
              provider: provider.type // 确保模型有provider信息
            });
          });
        });
      return models;
    },

    // 获取启用的提供商
    enabledProviders: (state) => {
      return state.providers.filter(provider => provider.enabled);
    },

    // 按提供商分组的模型
    modelsByProvider: (state) => {
      const result: Record<string, Model[]> = {};
      state.providers
        .filter(provider => provider.enabled)
        .forEach(provider => {
          result[provider.type] = provider.models;
        });
      return result;
    }
  },

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
    },

    // 根据模型ID查找模型
    findModelById(modelId: string): Model | null {
      for (const provider of this.providers) {
        const model = provider.models.find(m => m.id === modelId);
        if (model) {
          return model;
        }
      }
      return null;
    },

    // 根据模型ID查找提供商
    findProviderByModelId(modelId: string): Provider | null {
      for (const provider of this.providers) {
        if (provider.models.some(m => m.id === modelId)) {
          return provider;
        }
      }
      return null;
    }
  },
  

});