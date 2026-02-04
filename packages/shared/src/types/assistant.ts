import type { Model } from './llm';

/**
 * 助手类型
 */
export type AssistantType = 'chat' | 'naming' | 'translation' | 'thinking' | 'custom';

/**
 * 助手排序类型
 */
export type AssistantsSortType = 'list' | 'tags';

/**
 * 助手设置
 */
export interface AssistantSettings {
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  presence_penalty?: number;
  frequency_penalty?: number;
}

/**
 * 助手接口
 */
export interface Assistant {
  id: string;
  name: string;
  emoji?: string;
  description?: string;
  prompt?: string;
  type?: AssistantType;
  tags?: string[];
  model?: Model;
  enableWebSearch?: boolean;
  settings?: AssistantSettings;
  createdAt?: string;
  updatedAt?: string;
}
