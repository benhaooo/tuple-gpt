export const FinishReason = {
  Stop: 'stop',
  ToolCalls: 'tool_calls',
  Length: 'length',
  ContentFilter: 'content_filter',
  Error: 'error',
} as const

export type FinishReason = (typeof FinishReason)[keyof typeof FinishReason]

export interface Usage {
  promptTokens: number
  completionTokens: number
  totalTokens: number
}

export const StreamEventType = {
  TextDelta: 'text_delta',
  ToolCallStart: 'tool_call_start',
  ToolCallDelta: 'tool_call_delta',
  ToolCallEnd: 'tool_call_end',
  Finish: 'finish',
  Error: 'error',
} as const

export type StreamEventType = (typeof StreamEventType)[keyof typeof StreamEventType]

export type StreamEvent =
  | { type: typeof StreamEventType.TextDelta; text: string }
  | { type: typeof StreamEventType.ToolCallStart; toolCall: { id: string; name: string } }
  | { type: typeof StreamEventType.ToolCallDelta; toolCallId: string; arguments: string }
  | { type: typeof StreamEventType.ToolCallEnd; toolCallId: string }
  | { type: typeof StreamEventType.Finish; finishReason: FinishReason; usage?: Usage }
  | { type: typeof StreamEventType.Error; error: Error }
