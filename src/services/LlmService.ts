import { ApiClient } from './api/interfaces/ApiClient';
import { ApiClientFactory } from './api/ApiClientFactory';
import { Provider, Model } from '@/stores/modules/llm';
import { useLlmStore } from '@/stores/modules/llm';
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
  private apiClient: ApiClient | null = null;
  private provider: Provider | null = null;
  private model: Model | null = null;
  
  private constructor() {}
  
  // 单例模式
  public static getInstance(): LlmService {
    if (!LlmService.instance) {
      LlmService.instance = new LlmService();
    }
    return LlmService.instance;
  }
  
  /**
   * 设置当前使用的提供商和模型
   * @param provider 提供商配置
   * @param modelId 模型ID
   */
  setProvider(provider: Provider, modelId?: string): void {
    this.provider = provider;
    this.apiClient = ApiClientFactory.createClient(provider);
    
    // 如果指定了模型ID，尝试设置
    if (modelId && provider.models) {
      this.model = provider.models.find(model => model.id === modelId) || null;
    } else {
      // 使用默认模型或第一个可用模型
      this.model = provider.models?.[0] || null;
    }
  }
  
  /**
   * 获取当前提供商信息
   */
  getProvider(): Provider | null {
    return this.provider;
  }
  
  /**
   * 获取当前模型信息
   */
  getModel(): Model | null {
    return this.model;
  }
  
  /**
   * 切换模型
   * @param modelId 模型ID
   */
  setModel(modelId: string): void {
    if (!this.provider || !this.provider.models) {
      throw new Error('请先设置提供商');
    }
    
    const model = this.provider.models.find(model => model.id === modelId);
    if (!model) {
      throw new Error(`当前提供商不存在模型: ${modelId}`);
    }
    
    this.model = model;
  }
  
  /**
   * 发送聊天请求
   * @param messages 消息列表
   * @param options 请求选项，可包含插件所需的特殊参数
   * @returns LLM响应
   */
  async chat(messages: ChatMessage[], options: ChatCompletionOptions = {}): Promise<any> {
    // 如果没有设置提供商，尝试从store获取并设置
    if (!this.apiClient || !this.provider) {
      const llmStore = useLlmStore();
      const defaultProvider = llmStore.providers.find(p => p.enabled === true);
      
      if (!defaultProvider) {
        throw new Error('未找到可用的AI提供商，请在设置中配置API密钥');
      }
      
      this.setProvider(defaultProvider);
    }
    
    if (!this.model) {
      throw new Error('请先设置模型');
    }
    
    // 检查是否为流式请求
    if (options.stream === true) {
      throw new Error('普通chat方法不支持流式响应，请使用chatStream方法');
    }
    
    try {
      // 设置模型ID
      const requestOptions = {
        ...options,
        model: options.model || this.model.id
      };
      
      // 应用插件处理
      const { messages: processedMessages, options: processedOptions } = 
        await llmPluginManager.processRequest(messages, requestOptions);
      
      // 发送请求
      const response = await this.apiClient!.chatCompletion(processedMessages, processedOptions);
      
      // 应用插件处理响应
      const processedResponse = await llmPluginManager.processResponse(response);
      
      return processedResponse;
    } catch (error) {
      console.error('LLM 请求失败:', error);
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
    // 如果没有设置提供商，尝试从store获取并设置
    if (!this.apiClient || !this.provider) {
      const llmStore = useLlmStore();
      const defaultProvider = llmStore.providers.find(p => p.enabled === true);
      
      if (!defaultProvider) {
        throw new Error('未找到可用的AI提供商，请在设置中配置API密钥');
      }
      
      this.setProvider(defaultProvider);
    }
    
    if (!this.model) {
      throw new Error('请先设置模型');
    }
    
    try {
      // 设置模型ID和流式标志
      const requestOptions = {
        ...options,
        model: options.model || this.model.id,
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
      
      // 调用开始回调
      if (callbacks.onStart) {
        callbacks.onStart();
      }
      
      // 获取API实现特定的流式处理方法
      if (!this.apiClient!.chatCompletionStream) {
        throw new Error('当前提供商不支持流式响应');
      }
      
      // 调用流式API
      await this.apiClient!.chatCompletionStream(
        processedMessages, 
        {
          onChunk: async (chunk) => {
            try {
              // 插件处理流式块
              const processedChunk = await llmPluginManager.processStreamChunk(chunk);
              
              // 更新完整响应文本
              if (processedChunk.choices && processedChunk.choices[0]) {
                const content = processedChunk.choices[0].delta?.content || '';
                responseText += content;
                
                // 保存最后一个块的完整响应
                if (processedChunk.choices[0].finish_reason) {
                  fullResponse = {
                    id: processedChunk.id,
                    choices: [{
                      message: {
                        role: 'assistant',
                        content: responseText
                      },
                      finish_reason: processedChunk.choices[0].finish_reason
                    }]
                  };
                }
              } else if (processedChunk.content) {
                // 处理其他API格式的流式响应
                responseText += processedChunk.content;
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
            console.error('流式响应出错:', error);
            
            // 调用用户的错误回调
            if (callbacks.onError) {
              callbacks.onError(error);
            }
          },
          ...finalOptions
        }
      );
    } catch (error) {
      console.error('流式LLM 请求失败:', error);
      
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
    if (!this.apiClient) {
      throw new Error('请先设置提供商');
    }
    
    if (!this.apiClient.generateImage) {
      throw new Error('当前提供商不支持图像生成');
    }
    
    try {
      return await this.apiClient.generateImage(prompt, options);
    } catch (error) {
      console.error('图像生成失败:', error);
      throw error;
    }
  }
  
  /**
   * 获取文本嵌入向量
   * @param input 输入文本或文本数组
   * @returns 嵌入向量结果
   */
  async getEmbeddings(input: string | string[]): Promise<any> {
    if (!this.apiClient) {
      throw new Error('请先设置提供商');
    }
    
    if (!this.apiClient.embeddings) {
      throw new Error('当前提供商不支持嵌入向量');
    }
    
    try {
      return await this.apiClient.embeddings(input);
    } catch (error) {
      console.error('获取嵌入向量失败:', error);
      throw error;
    }
  }
  
  /**
   * 转录音频
   * @param audioData 音频数据
   * @returns 转录结果
   */
  async transcribeAudio(audioData: Blob): Promise<any> {
    if (!this.apiClient) {
      throw new Error('请先设置提供商');
    }
    
    if (!this.apiClient.transcribe) {
      throw new Error('当前提供商不支持音频转录');
    }
    
    try {
      return await this.apiClient.transcribe(audioData);
    } catch (error) {
      console.error('音频转录失败:', error);
      throw error;
    }
  }
  
  /**
   * 获取模型列表
   * @returns 模型列表
   */
  async listModels(): Promise<any> {
    if (!this.apiClient) {
      throw new Error('请先设置提供商');
    }
    
    try {
      return await this.apiClient.listModels();
    } catch (error) {
      console.error('获取模型列表失败:', error);
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