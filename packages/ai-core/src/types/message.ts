export const Role = {
  System: 'system',
  User: 'user',
  Assistant: 'assistant',
  Tool: 'tool',
} as const

export type Role = (typeof Role)[keyof typeof Role]

export interface TextContentPart {
  type: 'text'
  text: string
}

export interface ImageContentPart {
  type: 'image'
  /** base64 encoded image data or URL */
  image: string
  mimeType?: string
}

export type ToolCallStatus = 'pending' | 'awaiting' | 'resolved' | 'cancelled'

export interface ToolCallContentPart {
  type: 'tool_call'
  toolCall: {
    id: string
    name: string
    arguments: string
  }
  /**
   * Lifecycle status of this tool call. Not sent to LLM providers — transports
   * pick out only id/name/arguments. Used by the runtime/UI to track whether
   * the call is in-flight, awaiting user input, completed, or cancelled.
   */
  status?: ToolCallStatus
}

export interface ToolResultContentPart {
  type: 'tool_result'
  toolCallId: string
  result: string
  isError?: boolean
}

export type ContentPart =
  | TextContentPart
  | ImageContentPart
  | ToolCallContentPart
  | ToolResultContentPart

export interface Message {
  role: Role
  content: ContentPart[]
}
