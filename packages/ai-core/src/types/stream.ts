export type FinishReason = 'stop' | 'tool_calls' | 'length' | 'content_filter' | 'error'

export interface Usage {
  promptTokens: number
  completionTokens: number
  totalTokens: number
}

export type StreamEvent =
  | { type: 'text_delta'; text: string }
  | { type: 'tool_call_start'; toolCall: { id: string; name: string } }
  | { type: 'tool_call_delta'; toolCallId: string; arguments: string }
  | { type: 'tool_call_end'; toolCallId: string }
  | { type: 'finish'; finishReason: FinishReason; usage?: Usage }
  | { type: 'error'; error: Error }
