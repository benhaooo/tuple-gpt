export const Role = {
  System: 'system',
  User: 'user',
  Assistant: 'assistant',
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

/**
 * A tool call produced by the assistant. The result is co-located here once
 * the tool runs (or a Resolution is applied). Wire formats that demand a
 * separate "tool" role message synthesize one in the transport layer.
 */
export interface ToolCallContentPart {
  type: 'tool_call'
  toolCall: {
    id: string
    name: string
    arguments: string
  }
  /**
   * Lifecycle status of this tool call. Not sent to LLM providers — used by
   * the runtime/UI to track in-flight, awaiting input, completed, cancelled.
   */
  status?: ToolCallStatus
  /** Tool output. Undefined while pending/awaiting; set once resolved. */
  result?: string
  /** True when the tool surfaced a failure rather than a value. */
  isError?: boolean
}

export type ContentPart = TextContentPart | ImageContentPart | ToolCallContentPart

export interface Message {
  role: Role
  content: ContentPart[]
}
