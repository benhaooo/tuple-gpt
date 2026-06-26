import type {
  Citation,
  NativeToolAction,
  NativeToolKind,
  NativeToolStatus,
  ToolCallStatus,
} from '@tuple-gpt/ai-core'

export interface ToolCallMessagePartModel {
  id: string
  name: string
  arguments: string
  status: ToolCallStatus
  result?: string
  isError?: boolean
}

export interface NativeToolMessagePartModel {
  id: string
  kind: NativeToolKind
  status: NativeToolStatus
  action?: NativeToolAction
  sources: Citation[]
}

export type AssistantStepItem =
  | { type: 'text'; text: string; citations: Citation[] }
  | { type: 'native_tool'; nativeTool: NativeToolMessagePartModel }
  | { type: 'tool_call'; toolCall: ToolCallMessagePartModel }
  | { type: 'reasoning'; summary: string }

export type { Citation, NativeToolAction, NativeToolKind, NativeToolStatus, ToolCallStatus }
