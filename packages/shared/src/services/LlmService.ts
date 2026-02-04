import { ApiClient } from './api/interfaces/ApiClient';
import { ApiClientFactory } from './api/ApiClientFactory';
import { Provider, Model } from '@shared/types/llm';
import { useLlmStore } from '@shared/stores/modules/llm';
import { llmPluginManager } from './plugins/LlmPluginManager';

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  name?: string;
}

export interface ChatCompletionOptions {
  model?: string;
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
  // 插件选项
  audio?: Blob | string;     // 音频数据
  webSearch?: boolean;       // 是否执行网络搜索
  document?: any;            // 文档数据
  [key: string]: any;
}

export interface ImageGenerationOptions {
  size?: string;
  n?: number;
  quality?: string;
  style?: string;
  [key: string]: any;
}

export interface StreamCallbacks {
  onStart?: () => void;
  onChunk?: (chunk: any) => void;
  onComplete?: (fullResponse: any) => void;
  onError?: (error: any) => void;
}

/**
 * LLM服务类
 * 提供统一的接口与不同LLM提供商交互，并集成插件系统
 */
export class LlmService {
  private static instance: LlmService;
  
  // 根据方案一，移除内部缓存
  private selectedProviderId: string | null = null;
  private selectedModelId: string | null = null;
  
  private constructor() {}
  
  // 单例模式
  public static getInstance(): LlmService {
    if (!LlmService.instance) {
      LlmService.instance = new LlmService();
    }
    return LlmService.instance;
  }
  
  /**
   * 获取当前选择的提供商
   * @returns 提供商对象，如果未选择则返回null或抛出错误
   */
  private getSelectedProvider(throwError: boolean = true): Provider | null {
    const llmStore = useLlmStore();
    
    // 如果有选择特定提供商ID，尝试获取
    if (this.selectedProviderId) {
      const provider = llmStore.providers.find(p => p.id === this.selectedProviderId);
      if (provider) {
        return provider;
      }
    }
    
    // 否则获取第一个启用的提供商
    const provider = llmStore.providers.find(p => p.enabled === true);
    
    if (!provider && throwError) {
      throw new Error('未找到可用的AI提供商，请在设置中配置API密钥');
    }
    
    return provider || null;
  }
  
  /**
   * 获取当前选择的模型
   * @param provider 提供商对象
   * @returns 模型对象，如果未选择则返回null
   */
  private getSelectedModel(provider: Provider): Model | null {
    if (!provider.models || provider.models.length === 0) {
      return null;
    }
    
    // 如果有选择特定模型，尝试获取
    if (this.selectedModelId) {
      const model = provider.models.find(m => m.id === this.selectedModelId);
      if (model) {
        return model;
      }
    }
    
    // 否则返回第一个可用模型
    return provider.models[0] || null;
  }
  
  /**
   * 为当前操作创建一个新的API客户端实例
   * @returns API客户端实例
   */
  private createApiClient(): ApiClient {
    const provider = this.getSelectedProvider();
    if (!provider) {
      throw new Error('未找到可用的AI提供商');
    }

    return ApiClientFactory.createClient(provider);
  }

  /**
   * 根据模型ID创建对应的API客户端实例
   * @param modelId 模型ID
   * @returns API客户端实例
   */
  private createApiClientForModel(modelId: string): ApiClient {
    const provider = this.getProviderByModelId(modelId);
    if (!provider) {
      throw new Error(`未找到模型 ${modelId} 对应的AI提供商`);
    }

    return ApiClientFactory.createClient(provider);
  }

  /**
   * 根据模型ID查找对应的Provider
   * @param modelId 模型ID
   * @returns Provider实例或null
   */
  private getProviderByModelId(modelId: string): Provider | null {
    const llmStore = useLlmStore();
    return llmStore.findProviderByModelId(modelId);
  }

  /**
   * 根据模型ID获取模型信息
   * @param modelId 模型ID
   * @returns Model实例或null
   */
  private getModelById(modelId: string): Model | null {
    const llmStore = useLlmStore();
    return llmStore.findModelById(modelId);
  }
  
  /**
   * 设置当前使用的提供商和模型
   * @param providerId 提供商ID
   * @param modelId 模型ID (可选)
   */
  setProvider(providerId: string | Provider, modelId?: string): void {
    if (typeof providerId === 'string') {
      this.selectedProviderId = providerId;
    } else {
      this.selectedProviderId = providerId.id;
    }
    
    if (modelId) {
      this.selectedModelId = modelId;
    }
  }
  
  /**
   * 获取当前提供商信息
   */
  getProvider(): Provider | null {
    return this.getSelectedProvider(false);
  }
  
  /**
   * 获取当前模型信息
   */
  getModel(): Model | null {
    const provider = this.getSelectedProvider(false);
    return provider ? this.getSelectedModel(provider) : null;
  }
  
  /**
   * 切换模型
   * @param modelId 模型ID
   */
  setModel(modelId: string): void {
    this.selectedModelId = modelId;
  }
  
  /**
   * 发送聊天请求
   * @param messages 消息列表
   * @param options 请求选项，可包含插件所需的特殊参数
   * @returns LLM响应
   */
  async chat(messages: ChatMessage[], options: ChatCompletionOptions = {}): Promise<any> {
    // 检查是否为流式请求
    if (options.stream === true) {
      throw new Error('普通chat方法不支持流式响应，请使用chatStream方法');
    }

    // 如果指定了模型ID，使用该模型对应的Provider
    if (options.model) {
      return this.chatWithModel(messages, options, options.model);
    }

    // 否则使用默认的Provider和Model
    const provider = this.getSelectedProvider();
    if (!provider) {
        throw new Error('未找到可用的AI提供商，请在设置中配置API密钥');
    }

    const model = this.getSelectedModel(provider);
    if (!model) {
      throw new Error('未找到可用模型，请检查提供商配置');
    }

    return this.chatWithModel(messages, options, model.id);
  }

  /**
   * 使用指定模型发送聊天请求
   * @param messages 消息列表
   * @param options 请求选项
   * @param modelId 指定的模型ID
   * @returns LLM响应
   */
  private async chatWithModel(
    messages: ChatMessage[],
    options: ChatCompletionOptions,
    modelId: string
  ): Promise<any> {
    // 根据模型ID获取对应的Provider和Model
    const provider = this.getProviderByModelId(modelId);
    if (!provider) {
      throw new Error(`未找到模型 ${modelId} 对应的AI提供商`);
    }

    const model = this.getModelById(modelId);
    if (!model) {
      throw new Error(`未找到模型 ${modelId}`);
    }

    try {
      // 设置模型ID
      const requestOptions = {
        ...options,
        model: model.id
      };

      // 应用插件处理
      const { messages: processedMessages, options: processedOptions } =
        await llmPluginManager.processRequest(messages, requestOptions);

      // 使用模型对应的Provider创建客户端
      const apiClient = this.createApiClientForModel(modelId);
      const response = await apiClient.chatCompletion(processedMessages, processedOptions);

      // 应用插件处理响应
      const processedResponse = await llmPluginManager.processResponse(response);

      return processedResponse;
    } catch (error) {
      // 移除console.error，让上层处理错误记录
      throw error;
    }
  }
  
  /**
   * 发送流式聊天请求
   * @param messages 消息列表
   * @param callbacks 流式回调函数
   * @param options 请求选项，可包含插件所需的特殊参数
   */
  async chatStream(
    messages: ChatMessage[],
    callbacks: StreamCallbacks,
    options: ChatCompletionOptions = {}
  ): Promise<void> {
    // 如果指定了模型ID，使用该模型对应的Provider
    if (options.model) {
      return this.chatStreamWithModel(messages, callbacks, options, options.model);
    }

    // 否则使用默认的Provider和Model
    const provider = this.getSelectedProvider();
    if (!provider) {
        throw new Error('未找到可用的AI提供商，请在设置中配置API密钥');
    }

    const model = this.getSelectedModel(provider);
    if (!model) {
      throw new Error('未找到可用模型，请检查提供商配置');
    }

    return this.chatStreamWithModel(messages, callbacks, options, model.id);
  }

  /**
   * 使用指定模型发送流式聊天请求
   * @param messages 消息列表
   * @param callbacks 流式回调函数
   * @param options 请求选项
   * @param modelId 指定的模型ID
   */
  private async chatStreamWithModel(
    messages: ChatMessage[],
    callbacks: StreamCallbacks,
    options: ChatCompletionOptions,
    modelId: string
  ): Promise<void> {
    // 根据模型ID获取对应的Provider和Model
    const provider = this.getProviderByModelId(modelId);
    if (!provider) {
      throw new Error(`未找到模型 ${modelId} 对应的AI提供商`);
    }

    const model = this.getModelById(modelId);
    if (!model) {
      throw new Error(`未找到模型 ${modelId}`);
    }

    try {
      // 设置模型ID和流式标志
      const requestOptions = {
        ...options,
        model: model.id,
        stream: true
      };

      // 应用插件处理
      const { messages: processedMessages, options: processedOptions } =
        await llmPluginManager.processRequest(messages, requestOptions);

      // 插件处理流式开始
      const finalOptions = await llmPluginManager.onStreamStart(processedOptions);

      // 收集完整响应
      let fullResponse: any = null;
      let responseText = '';
      let thinkingText = '';

      // 调用开始回调
      if (callbacks.onStart) {
        callbacks.onStart();
      }

      // 使用模型对应的Provider创建客户端
      const apiClient = this.createApiClientForModel(modelId);
      
      // 检查API是否支持流式响应
      if (!apiClient.chatCompletionStream) {
        throw new Error('当前提供商不支持流式响应');
      }
      
      // 调用流式API
      await apiClient.chatCompletionStream(
        processedMessages, 
        {
          onChunk: async (chunk) => {
            try {
              // 插件处理流式块
              const processedChunk = await llmPluginManager.processStreamChunk(chunk);

              // API客户端已经处理了thinking/content类型识别
              // 这里只需要累积内容和传递给回调
              if (processedChunk.type === 'thinking') {
                thinkingText = processedChunk.accumulated || thinkingText;
              } else if (processedChunk.type === 'content') {
                responseText = processedChunk.accumulated || responseText;
              } else if (processedChunk.choices && processedChunk.choices[0]) {
                // 兼容旧格式：没有type字段的响应
                const delta = processedChunk.choices[0].delta;
                if (delta?.content) {
                  responseText += delta.content;
                  // 为兼容性添加type字段
                  processedChunk.type = 'content';
                  processedChunk.accumulated = responseText;
                }
              } else if (processedChunk.content) {
                // 处理其他API格式的流式响应
                responseText += processedChunk.content;
                processedChunk.type = 'content';
                processedChunk.accumulated = responseText;
              }

              // 保存最后一个块的完整响应
              if (processedChunk.choices && processedChunk.choices[0]?.finish_reason) {
                fullResponse = {
                  id: processedChunk.id,
                  choices: [{
                    message: {
                      role: 'assistant',
                      content: responseText,
                      reasoning: thinkingText || undefined
                    },
                    finish_reason: processedChunk.choices[0].finish_reason
                  }]
                };
              }

              // 调用用户的块回调
              if (callbacks.onChunk) {
                callbacks.onChunk(processedChunk);
              }
            } catch (error) {
              console.error('处理流式响应块失败:', error);
            }
          },
          onComplete: async (response) => {
            try {
              // 如果API没有提供完整响应，使用我们自己构建的
              const finalResponse = response || fullResponse || { content: responseText };
              
              // 插件处理流式结束
              const processedFinalResponse = await llmPluginManager.onStreamEnd(finalResponse);
              
              // 调用用户的完成回调
              if (callbacks.onComplete) {
                callbacks.onComplete(processedFinalResponse);
              }
            } catch (error) {
              console.error('处理流式响应完成失败:', error);
            }
          },
          onError: (error) => {
            // 移除console.error，让上层处理错误记录
            // 调用用户的错误回调
            if (callbacks.onError) {
              callbacks.onError(error);
            }
          },
          ...finalOptions
        }
      );
    } catch (error) {
      // 移除console.error，让上层处理错误记录
      // 调用用户的错误回调
      if (callbacks.onError) {
        callbacks.onError(error);
      } else {
        throw error;
      }
    }
  }
  
  /**
   * 生成图像
   * @param prompt 提示词
   * @param options 选项
   * @returns 图像生成结果
   */
  async generateImage(prompt: string, options: ImageGenerationOptions = {}): Promise<any> {
    const apiClient = this.createApiClient();
    
    if (!apiClient.generateImage) {
      throw new Error('当前提供商不支持图像生成');
    }
    
    try {
      return await apiClient.generateImage(prompt, options);
    } catch (error) {
      throw error;
    }
  }
  
  /**
   * 获取文本嵌入向量
   * @param input 输入文本或文本数组
   * @returns 嵌入向量结果
   */
  async getEmbeddings(input: string | string[]): Promise<any> {
    const apiClient = this.createApiClient();
    
    if (!apiClient.embeddings) {
      throw new Error('当前提供商不支持嵌入向量');
    }
    
    try {
      return await apiClient.embeddings(input);
    } catch (error) {
      throw error;
    }
  }
  
  /**
   * 转录音频
   * @param audioData 音频数据
   * @returns 转录结果
   */
  async transcribeAudio(audioData: Blob): Promise<any> {
    const apiClient = this.createApiClient();
    
    if (!apiClient.transcribe) {
      throw new Error('当前提供商不支持音频转录');
    }
    
    try {
      return await apiClient.transcribe(audioData);
    } catch (error) {
      throw error;
    }
  }
  
  /**
   * 获取模型列表
   * @returns 模型列表
   */
  async listModels(): Promise<Model[]> {
    const apiClient = this.createApiClient();
    
    try {
      return await apiClient.listModels();
    } catch (error) {
      throw error;
    }
  }
  
  /**
   * 检查提供商API密钥有效性
   * @param provider 提供商配置
   * @returns 是否有效
   */
  async checkApiKeyValidity(provider: Provider): Promise<boolean> {
    try {
      const client = ApiClientFactory.createClient(provider);
      await client.listModels();
      return true;
    } catch (error) {
      console.error('API key validation error:', error);
      return false;
    }
  }
  
  /**
   * 获取已注册的插件列表
   * @returns 插件列表
   */
  getPlugins() {
    return llmPluginManager.getPlugins();
  }
  
  /**
   * 启用插件
   * @param pluginName 插件名称
   */
  enablePlugin(pluginName: string) {
    llmPluginManager.enablePlugin(pluginName);
  }
  
  /**
   * 禁用插件
   * @param pluginName 插件名称
   */
  disablePlugin(pluginName: string) {
    llmPluginManager.disablePlugin(pluginName);
  }
}

// 导出单例实例
export const llmService = LlmService.getInstance(); 