// 共享的类型定义
export * from './llm';
export * from './message';
export * from './assistant';

// 保留原有的简单类型定义（用于向后兼容）
export interface ChatSession {
  id: string
  title: string
  messages: any[]
  createdAt: number
  updatedAt: number
}
