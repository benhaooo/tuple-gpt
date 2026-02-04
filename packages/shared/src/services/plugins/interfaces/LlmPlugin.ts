/**
 * LLM插件接口定义
 * 插件用于在LLM请求前后处理数据
 */
export interface LlmPlugin {
  /**
   * 插件名称
   */
  name: string;
  
  /**
   * 插件描述
   */
  description: string;
  
  /**
   * 是否启用
   */
  enabled: boolean;
  
  /**
   * 处理传入请求
   * @param messages 消息列表
   * @param options 请求选项
   * @returns 处理后的数据 {messages, options}
   */
  processRequest(messages: any[], options?: any): Promise<{messages: any[], options?: any}>;
  
  /**
   * 处理返回结果（可选）
   * @param response LLM响应
   * @returns 处理后的响应
   */
  processResponse?(response: any): Promise<any>;
  
  /**
   * 处理流式响应块（可选）
   * 用于在流式响应模式下处理每个响应块
   * @param chunk 响应块
   * @returns 处理后的响应块
   */
  processStreamChunk?(chunk: any): Promise<any>;
  
  /**
   * 流式响应开始时调用（可选）
   * @param options 流式请求选项
   * @returns 处理后的选项或其他数据
   */
  onStreamStart?(options: any): Promise<any>;
  
  /**
   * 流式响应结束时调用（可选）
   * @param fullResponse 完整的响应内容（由所有块组合而成）
   * @returns 处理后的完整响应
   */
  onStreamEnd?(fullResponse: any): Promise<any>;
} 