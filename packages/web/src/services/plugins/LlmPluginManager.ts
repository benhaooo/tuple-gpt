import { LlmPlugin } from './interfaces/LlmPlugin';
import { AudioTranscriptionPlugin } from './AudioTranscriptionPlugin';
import { WebSearchPlugin } from './WebSearchPlugin';
import { DocumentProcessingPlugin } from './DocumentProcessingPlugin';

/**
 * LLM插件管理器
 * 管理和协调多个插件的执行
 */
export class LlmPluginManager {
  private plugins: LlmPlugin[] = [];
  
  constructor() {
    // 初始化默认插件
    this.registerDefaultPlugins();
  }
  
  /**
   * 注册默认插件
   */
  private registerDefaultPlugins(): void {
    this.registerPlugin(new AudioTranscriptionPlugin());
    this.registerPlugin(new WebSearchPlugin());
    this.registerPlugin(new DocumentProcessingPlugin());
  }
  
  /**
   * 注册插件
   * @param plugin 要注册的插件实例
   */
  registerPlugin(plugin: LlmPlugin): void {
    // 检查是否已存在同名插件
    const existingIndex = this.plugins.findIndex(p => p.name === plugin.name);
    
    if (existingIndex >= 0) {
      // 替换现有插件
      this.plugins[existingIndex] = plugin;
    } else {
      // 添加新插件
      this.plugins.push(plugin);
    }
  }
  
  /**
   * 移除插件
   * @param pluginName 要移除的插件名称
   */
  removePlugin(pluginName: string): void {
    this.plugins = this.plugins.filter(plugin => plugin.name !== pluginName);
  }
  
  /**
   * 启用插件
   * @param pluginName 要启用的插件名称
   */
  enablePlugin(pluginName: string): void {
    const plugin = this.plugins.find(p => p.name === pluginName);
    if (plugin) {
      plugin.enabled = true;
    }
  }
  
  /**
   * 禁用插件
   * @param pluginName 要禁用的插件名称
   */
  disablePlugin(pluginName: string): void {
    const plugin = this.plugins.find(p => p.name === pluginName);
    if (plugin) {
      plugin.enabled = false;
    }
  }
  
  /**
   * 获取所有已注册插件
   * @returns 插件列表
   */
  getPlugins(): LlmPlugin[] {
    return [...this.plugins];
  }
  
  /**
   * 获取已启用的插件
   * @returns 已启用的插件列表
   */
  getEnabledPlugins(): LlmPlugin[] {
    return this.plugins.filter(plugin => plugin.enabled);
  }
  
  /**
   * 处理请求
   * 按顺序应用所有已启用插件的processRequest方法
   * @param messages 消息列表
   * @param options 请求选项
   * @returns 处理后的消息和选项
   */
  async processRequest(messages: any[], options?: any): Promise<{messages: any[], options?: any}> {
    let result = { messages, options };
    
    // 获取已启用的插件
    const enabledPlugins = this.getEnabledPlugins();
    
    // 顺序执行每个插件的处理
    for (const plugin of enabledPlugins) {
      try {
        result = await plugin.processRequest(result.messages, result.options);
      } catch (error) {
        console.error(`插件 ${plugin.name} 处理请求失败:`, error);
      }
    }
    
    return result;
  }
  
  /**
   * 处理响应
   * 按顺序应用所有已启用插件的processResponse方法（如果存在）
   * @param response LLM响应
   * @returns 处理后的响应
   */
  async processResponse(response: any): Promise<any> {
    let processedResponse = response;
    
    // 获取已启用的插件
    const enabledPlugins = this.getEnabledPlugins();
    
    // 顺序执行每个插件的响应处理（如果支持）
    for (const plugin of enabledPlugins) {
      if (plugin.processResponse) {
        try {
          processedResponse = await plugin.processResponse(processedResponse);
        } catch (error) {
          console.error(`插件 ${plugin.name} 处理响应失败:`, error);
        }
      }
    }
    
    return processedResponse;
  }
  
  /**
   * 流式响应开始时处理
   * @param options 流式请求选项
   * @returns 处理后的选项
   */
  async onStreamStart(options: any): Promise<any> {
    let processedOptions = options;
    
    // 获取已启用的插件
    const enabledPlugins = this.getEnabledPlugins();
    
    // 顺序执行每个插件的流开始处理（如果支持）
    for (const plugin of enabledPlugins) {
      if (plugin.onStreamStart) {
        try {
          processedOptions = await plugin.onStreamStart(processedOptions);
        } catch (error) {
          console.error(`插件 ${plugin.name} 处理流开始失败:`, error);
        }
      }
    }
    
    return processedOptions;
  }
  
  /**
   * 处理流式响应块
   * @param chunk 响应块
   * @returns 处理后的响应块
   */
  async processStreamChunk(chunk: any): Promise<any> {
    let processedChunk = chunk;
    
    // 获取已启用的插件
    const enabledPlugins = this.getEnabledPlugins();
    
    // 顺序执行每个插件的流块处理（如果支持）
    for (const plugin of enabledPlugins) {
      if (plugin.processStreamChunk) {
        try {
          processedChunk = await plugin.processStreamChunk(processedChunk);
        } catch (error) {
          console.error(`插件 ${plugin.name} 处理流块失败:`, error);
        }
      }
    }
    
    return processedChunk;
  }
  
  /**
   * 流式响应结束时处理
   * @param fullResponse 完整的响应内容
   * @returns 处理后的完整响应
   */
  async onStreamEnd(fullResponse: any): Promise<any> {
    let processedResponse = fullResponse;
    
    // 获取已启用的插件
    const enabledPlugins = this.getEnabledPlugins();
    
    // 顺序执行每个插件的流结束处理（如果支持）
    for (const plugin of enabledPlugins) {
      if (plugin.onStreamEnd) {
        try {
          processedResponse = await plugin.onStreamEnd(processedResponse);
        } catch (error) {
          console.error(`插件 ${plugin.name} 处理流结束失败:`, error);
        }
      }
    }
    
    return processedResponse;
  }
}

// 单例模式导出插件管理器实例
export const llmPluginManager = new LlmPluginManager(); 