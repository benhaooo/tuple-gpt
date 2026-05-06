import { ChatClient, StreamEventType } from '@tuple-gpt/ai-core'
import { buildRequestMessages, toMessages, toProviderConfig } from './request'
import type { ChatMessage, Provider } from './types'
import { addMessage } from './conversation'
import { getErrorMessage } from './utils/error'

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

export interface StreamAssistantReplyInput {
  conversationId: string
  history: ChatMessage[]
  provider: Provider
  model: string
  signal?: AbortSignal
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
  )
  const assistantMessage = assistantResult.message
  const aiMessages = toMessages(buildRequestMessages(input.history))
  let accumulated = ''

  yield {
    type: 'assistant_started',
    conversationId: input.conversationId,
    message: assistantMessage,
  }

  try {
    const events = ChatClient.chat(aiMessages, {
      provider: toProviderConfig(input.provider, input.model),
      defaults: {
        maxTokens: 4096,
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
