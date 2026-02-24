export interface ErrorBlock {
  type: 'network' | 'timeout' | 'auth' | 'quota' | 'validation' | 'api' | 'unknown'
  message: string
  details: string
  timestamp: string
  provider: string
  model?: string
  code?: number
  originalError?: any
}
