/**
 * 助手排序类型
 */
export type AssistantsSortType = 'tags' | 'list';

// 导入 Model 类型
import { Model } from '@/types/llm';

/**
 * 助手对象类型
 */
export interface Assistant {
  // 主键，助手的唯一标识符 (UUID)
  id: string;
  
  // 在侧边栏显示的对话名称
  name: string;
  
  // 显示在名称前的表情符号（可选）
  emoji?: string;
  
  // 核心，定义助手行为的系统提示词
  prompt: string;
  
  // 核心，本次对话绑定的 AI 模型对象
  model?: Model;
  
  // 核心，本次对话绑定的知识库对象数组（可选）
  knowledge_bases?: KnowledgeBase[];
  
  // 启用的外部工具服务列表（可选）
  mcpServers?: MCPServer[];
  
  // 覆盖全局设置的局部配置（如temperature）
  settings?: Partial<AssistantSettings>;
  
  // 助手类型，例如 'chat'
  type: string;
  
  // 用户为助手打的标签，用于分类（可选）
  tags?: string[];
  
  // 对助手的详细描述（可选）
  description?: string;
}

/**
 * 知识库类型
 */
export interface KnowledgeBase {
  // 知识库ID
  id: string;
  
  // 知识库名称
  name: string;
  
  // 知识库类型
  type: string;
  
  // 知识库来源
  source?: string;
}

/**
 * 外部工具服务类型
 */
export interface MCPServer {
  // 服务ID
  id: string;
  
  // 服务名称
  name: string;
  
  // 服务URL
  url: string;
  
  // 服务提供的功能
  capabilities: string[];
}

/**
 * 助手设置类型
 */
export interface AssistantSettings {
  // 温度参数
  temperature: number;
  
  // 最大输出token数
  max_tokens?: number;
  
  // 是否启用流式输出
  stream?: boolean;
  
  // 其他可能的设置参数
  [key: string]: any;
} 