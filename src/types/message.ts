/**
 * 消息对象类型
 */
export interface Message {
  // 主键，消息的唯一标识符
  id: string;

  // 外键，这条消息所属的助手的id
  assistantId: string;

  // 消息的发送者角色
  role: 'user' | 'assistant';

  // 消息的当前状态
  status: 'sending' | 'pending' | 'success' | 'error';

  // 核心，构成消息内容的"块"数组
  blocks: MessageBlock[];

  // 消息创建的时间戳
  createdAt: string;

  // 仅assistant角色有，生成这条回复所使用的具体模型
  model?: Model;

  // 仅assistant角色有，本次回复的token使用量统计
  usage?: Usage;

  // 仅assistant角色有，包含AI回复附带的元数据，如网页搜索结果、引文等
  metadata?: object;

  // 指向上一条消息的id，用于构建消息树或支持多轮编辑等高级功能
  parentMessageId?: string;

  // 消息所属的话题ID
  topicId?: string;
}

/**
 * 消息块类型
 */
export interface MessageBlock {
  // 块的类型
  type: 'text' | 'image' | 'file' | 'thinking' | 'error';

  // 块的内容
  content: string | ImageBlock | FileBlock | ThinkingBlock | ErrorBlock;
}

/**
 * 思考块类型
 */
export interface ThinkingBlock {
  // 思考内容
  content: string;

  // 思考状态
  status?: 'thinking' | 'complete';

  // 思考开始时间
  startTime?: string;

  // 思考结束时间
  endTime?: string;
}

/**
 * 图片块类型
 */
export interface ImageBlock {
  // 图片URL或Base64
  url: string;

  // 图片宽度
  width?: number;

  // 图片高度
  height?: number;

  // 图片替代文本
  alt?: string;
}

/**
 * 文件块类型
 */
export interface FileBlock {
  // 文件名
  name: string;

  // 文件URL
  url: string;

  // 文件大小
  size?: number;

  // 文件类型
  type?: string;
}

/**
 * 错误块类型
 */
export interface ErrorBlock {
  // 错误类型/代码
  type: 'network' | 'api' | 'auth' | 'quota' | 'validation' | 'timeout' | 'unknown';

  // 错误代码（HTTP状态码或API特定错误码）
  code?: string | number;

  // 用户友好的错误描述
  message: string;

  // 详细的技术错误信息（可选，用于调试）
  details?: string;

  // 原始错误对象（可选）
  originalError?: any;

  // 错误发生时间
  timestamp?: string;

  // 提供商信息
  provider?: string;

  // 模型信息
  model?: string;
}

/**
 * 模型类型（简化版，与assistant.ts中的Model保持一致）
 */
export interface Model {
  id: string;
  name: string;
  provider: string;
}

/**
 * Token使用量统计
 */
export interface Usage {
  // 提示词token数
  prompt_tokens: number;

  // 完成词token数
  completion_tokens: number;

  // 总token数
  total_tokens: number;
} 