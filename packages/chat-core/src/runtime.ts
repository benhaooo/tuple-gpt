import { chat, FinishReason, StreamEventType, type Tool, type Resolution } from '@tuple-gpt/ai-core'
import type { ToolCallStatus } from '@tuple-gpt/ai-core'
import { buildRequestMessages, toMessages, toProviderConfig } from './request'
import type { ChatMessage, MessageContent, Provider } from './types'
import { createMessage, type IdTimeOptions } from './conversation'
import { appendTextToContent, cloneContent } from './content'
import { getErrorMessage } from './utils/error'

export type ChatRuntimeEvent =
  | {
      type: 'assistant_started'
      conversationId: string
      turnId: string
      message: ChatMessage
    }
  | {
      type: 'assistant_delta'
      conversationId: string
      turnId: string
      messageId: string
      content: MessageContent[]
    }
  | {
      type: 'assistant_done'
      conversationId: string
      turnId: string
      messageId: string
    }
  | {
      type: 'assistant_error'
      conversationId: string
      turnId: string
      messageId: string
      error: string
    }
  | {
      type: 'tool_call_status'
      conversationId: string
      turnId: string
      toolCallId: string
      status: ToolCallStatus
    }
  | {
      type: 'tool_call_result'
      conversationId: string
      turnId: string
      toolCallId: string
      result: string
      isError?: boolean
    }
  | {
      type: 'turn_paused'
      conversationId: string
      turnId: string
    }
  | {
      type: 'turn_done'
      conversationId: string
      turnId: string
    }
  | {
      type: 'turn_error'
      conversationId: string
      turnId: string
      error: string
    }
  | {
      type: 'turn_aborted'
      conversationId: string
      turnId: string
    }

export interface StreamAssistantReplyInput extends IdTimeOptions {
  conversationId: string
  turnId: string
  history: ChatMessage[]
  provider: Provider
  model: string
  tools?: Tool[]
  /**
   * Resolutions for tool calls left suspended at the end of `history`.
   * Forwarded to ai-core's resume phase. Omit on a fresh turn.
   */
  resolutions?: Resolution[]
  maxTurns?: number
  signal?: AbortSignal
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError'
}

export async function* streamAssistantReply(
  input: StreamAssistantReplyInput,
): AsyncIterable<ChatRuntimeEvent> {
  let assistantMessage: ChatMessage | null = null
  let assistantContent: MessageContent[] = []

  function startAssistantMessage(): ChatRuntimeEvent {
    assistantContent = []
    assistantMessage = createMessage(
      {
        role: 'assistant',
        content: [],
        status: 'streaming',
      },
      input,
    )

    return {
      type: 'assistant_started',
      conversationId: input.conversationId,
      turnId: input.turnId,
      message: assistantMessage,
    }
  }

  function createAssistantDelta(): ChatRuntimeEvent {
    if (!assistantMessage) {
      throw new Error('Assistant message has not started')
    }

    return {
      type: 'assistant_delta',
      conversationId: input.conversationId,
      turnId: input.turnId,
      messageId: assistantMessage.id,
      content: cloneContent(assistantContent),
    }
  }

  function createAssistantDone(): ChatRuntimeEvent | null {
    if (!assistantMessage) return null

    const event: ChatRuntimeEvent = {
      type: 'assistant_done',
      conversationId: input.conversationId,
      turnId: input.turnId,
      messageId: assistantMessage.id,
    }
    assistantMessage = null
    assistantContent = []
    return event
  }

  function createAssistantError(error: string): ChatRuntimeEvent | null {
    if (!assistantMessage) return null

    const event: ChatRuntimeEvent = {
      type: 'assistant_error',
      conversationId: input.conversationId,
      turnId: input.turnId,
      messageId: assistantMessage.id,
      error,
    }
    assistantMessage = null
    assistantContent = []
    return event
  }

  yield startAssistantMessage()

  try {
    const aiMessages = toMessages(buildRequestMessages(input.history))
    const events = chat(aiMessages, {
      provider: toProviderConfig(input.provider, input.model),
      tools: input.tools,
      resolutions: input.resolutions,
      maxTurns: input.maxTurns,
      options: {
        maxTokens: 4096,
        signal: input.signal,
      },
    })

    for await (const event of events) {
      if (
        !assistantMessage &&
        event.type !== StreamEventType.ToolResult &&
        event.type !== StreamEventType.ToolInteractionRequired
      ) {
        yield startAssistantMessage()
      }

      if (event.type === StreamEventType.TextDelta) {
        assistantContent = appendTextToContent(assistantContent, event.text)
        yield createAssistantDelta()
      } else if (event.type === StreamEventType.ToolCallStart) {
        assistantContent = [
          ...assistantContent,
          {
            type: 'tool_call',
            toolCall: {
              id: event.toolCall.id,
              name: event.toolCall.name,
              arguments: '',
            },
            status: 'pending',
          },
        ]
        yield createAssistantDelta()
      } else if (event.type === StreamEventType.ToolCallDelta) {
        assistantContent = assistantContent.map(part =>
          part.type === 'tool_call' && part.toolCall.id === event.toolCallId
            ? {
                ...part,
                toolCall: {
                  ...part.toolCall,
                  arguments: part.toolCall.arguments + event.arguments,
                },
              }
            : part,
        )
        yield createAssistantDelta()
      } else if (event.type === StreamEventType.ToolResult) {
        // ai-core wrote the result onto the tool_call part itself; emit two
        // runtime events so the conversation store updates that same part:
        // status → resolved, plus result/isError fields.
        yield {
          type: 'tool_call_status',
          conversationId: input.conversationId,
          turnId: input.turnId,
          toolCallId: event.toolCallId,
          status: 'resolved',
        }

        yield {
          type: 'tool_call_result',
          conversationId: input.conversationId,
          turnId: input.turnId,
          toolCallId: event.toolCallId,
          result: event.result,
          ...(event.isError ? { isError: true } : {}),
        }
      } else if (event.type === StreamEventType.ToolInteractionRequired) {
        // The assistant message has already been finalized by the preceding
        // Finish event. Just transition the tool_call to 'awaiting' and pause
        // the turn — resolveToolCall will resume it later.
        yield {
          type: 'tool_call_status',
          conversationId: input.conversationId,
          turnId: input.turnId,
          toolCallId: event.toolCallId,
          status: 'awaiting',
        }

        yield {
          type: 'turn_paused',
          conversationId: input.conversationId,
          turnId: input.turnId,
        }
        return
      } else if (event.type === StreamEventType.Finish) {
        const done = createAssistantDone()
        if (done) yield done
        if (event.finishReason !== FinishReason.ToolCalls) {
          assistantMessage = null
        }
      } else if (event.type === StreamEventType.Error) {
        throw event.error
      }
    }

    yield {
      type: 'turn_done',
      conversationId: input.conversationId,
      turnId: input.turnId,
    }
  } catch (error) {
    if (isAbortError(error)) {
      const done = createAssistantDone()
      if (done) yield done
      yield {
        type: 'turn_aborted',
        conversationId: input.conversationId,
        turnId: input.turnId,
      }
      return
    }

    const message = getErrorMessage(error)
    const assistantError = createAssistantError(message)
    if (assistantError) yield assistantError
    yield {
      type: 'turn_error',
      conversationId: input.conversationId,
      turnId: input.turnId,
      error: message,
    }
  }
}
