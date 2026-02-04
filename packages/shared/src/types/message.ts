import type { Model } from './llm';

/**
 * 消息块类型
 */
export type MessageBlockType = 'text' | 'image' | 'audio' | 'video' | 'file' | 'code' | 'error';

/**
 * 消息块基础接口
 */
export interface MessageBlock {
  type: MessageBlockType;
  content: string | any;
}

/**
 * 错误块
 */
export interface ErrorBlock extends MessageBlock {
  type: 'error';
  content: {
    message: string;
    code?: string;
    details?: any;
  };
}

/**
 * 消息接口
 */
export interface Message {
  id: string;
  assistantId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  blocks?: MessageBlock[];
  model?: Model;
  parentMessageId?: string;
  createdAt: string;
  updatedAt?: string;
  status?: 'pending' | 'streaming' | 'completed' | 'error';
  error?: string;
}
