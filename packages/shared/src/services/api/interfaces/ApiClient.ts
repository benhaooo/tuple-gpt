// API客户端通用接口
import { Model } from '@shared/types/llm';

export interface ApiClient {
  // 发送文本请求
  chatCompletion(messages: any[], options?: any): Promise<any>;
  
  // 流式文本请求
  chatCompletionStream?(messages: any[], options?: {
    onChunk: (chunk: any) => void | Promise<void>;
    onComplete: (response: any) => void | Promise<void>;
    onError: (error: any) => void | Promise<void>;
    [key: string]: any;
  }): Promise<void>;
  
  // 获取模型列表
  listModels(): Promise<Model[]>;
  
  // 图像生成（如果支持）
  generateImage?(prompt: string, options?: any): Promise<any>;
  
  // 语音转文本（如果支持）
  transcribe?(audioData: Blob): Promise<any>;
  
  // 嵌入向量
  embeddings?(input: string | string[]): Promise<any>;
} 