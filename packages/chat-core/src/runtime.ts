import {
  ChatClient,
  StreamEventType,
  type ChatOptions,
  type ClientConfig,
  type Message,
  type StreamEvent,
} from '@tuple-gpt/ai-core'
import { buildRequestMessages, toMessages, toProviderConfig } from './request'
import type { ChatMessage, Provider } from './types'
import { addMessage, type IdTimeOptions } from './conversation'

export type ChatStreamRunner = (
  messages: Message[],
  config: ClientConfig,
  opts?: ChatOptions,
) => AsyncIterable<StreamEvent>

export type ChatRuntimeEvent =
  | {
      type: 'assistant_started'
      conversationId: string
      message: ChatMessage
    }
  | {
      type: 'assistant_delta'
      conversationId: string
      messageId: string
      delta: string
      content: string
    }
  | {
      type: 'assistant_done'
      conversationId: string
      messageId: string
    }
  | {
      type: 'assistant_error'
      conversationId: string
      messageId: string
      error: string
    }

export interface StreamAssistantReplyInput extends IdTimeOptions {
  conversationId: string
  history: ChatMessage[]
  provider: Provider
  model: string
  maxTokens?: number
  signal?: AbortSignal
  chat?: ChatStreamRunner
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError'
}

export async function* streamAssistantReply(
  input: StreamAssistantReplyInput,
): AsyncIterable<ChatRuntimeEvent> {
  const assistantResult = addMessage(
    {
      id: input.conversationId,
      title: '',
      messages: [],
      providerId: input.provider.id,
      model: input.model,
      createdAt: '',
      updatedAt: '',
    },
    {
      role: 'assistant',
      content: '',
      status: 'streaming',
      providerId: input.provider.id,
    },
    {
      id: input.id,
      timestamp: input.timestamp,
      createId: input.createId,
      now: input.now,
    },
  )
  const assistantMessage = assistantResult.message
  const chat = input.chat ?? ChatClient.chat
  const aiMessages = toMessages(buildRequestMessages(input.history))
  let accumulated = ''

  yield {
    type: 'assistant_started',
    conversationId: input.conversationId,
    message: assistantMessage,
  }

  try {
    const events = chat(aiMessages, {
      provider: toProviderConfig(input.provider, input.model),
      defaults: {
        maxTokens: input.maxTokens ?? 4096,
        signal: input.signal,
      },
    })

    for await (const event of events) {
      if (event.type === StreamEventType.TextDelta) {
        accumulated += event.text
        yield {
          type: 'assistant_delta',
          conversationId: input.conversationId,
          messageId: assistantMessage.id,
          delta: event.text,
          content: accumulated,
        }
      } else if (event.type === StreamEventType.Error) {
        throw event.error
      }
    }

    yield {
      type: 'assistant_done',
      conversationId: input.conversationId,
      messageId: assistantMessage.id,
    }
  } catch (error) {
    if (isAbortError(error)) {
      yield {
        type: 'assistant_done',
        conversationId: input.conversationId,
        messageId: assistantMessage.id,
      }
      return
    }

    yield {
      type: 'assistant_error',
      conversationId: input.conversationId,
      messageId: assistantMessage.id,
      error: getErrorMessage(error),
    }
  }
}
