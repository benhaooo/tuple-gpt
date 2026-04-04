export type Role = 'system' | 'user' | 'assistant' | 'tool'

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

export interface ToolCallContentPart {
  type: 'tool_call'
  toolCall: {
    id: string
    name: string
    arguments: string
  }
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
  content: string | ContentPart[]
}
