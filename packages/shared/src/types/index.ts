// 共享的类型定义
export interface Message {
  id: string
  content: string
  role: 'user' | 'assistant' | 'system'
  timestamp: number
}

export interface ChatSession {
  id: string
  title: string
  messages: Message[]
  createdAt: number
  updatedAt: number
}
