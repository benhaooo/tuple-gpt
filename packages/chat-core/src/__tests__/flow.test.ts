import { describe, expect, it } from 'vitest'
import {
  prepareRegenerateAssistantMessage,
  prepareResendFromUserMessage,
  prepareSendMessage,
} from '../flow'
import type { Conversation } from '../types'

const timestamp = '2026-04-29T00:00:00.000Z'

function createIdFactory(ids: string[]) {
  return () => {
    const id = ids.shift()
    if (!id) throw new Error('No test id left')
    return id
  }
}

function conversation(): Conversation {
  return {
    id: 'conv-1',
    title: 'Chat',
    providerId: 'provider-1',
    model: 'model-1',
    createdAt: timestamp,
    updatedAt: timestamp,
    messages: [
      { id: 'u1', role: 'user', content: 'first', status: 'done', timestamp },
      { id: 'a1', role: 'assistant', content: 'answer first', status: 'done', timestamp },
      { id: 'u2', role: 'user', content: 'second', status: 'done', timestamp },
      { id: 'a2', role: 'assistant', content: 'answer second', status: 'done', timestamp },
    ],
  }
}

describe('message flow preparation', () => {
  it('prepares a new conversation and user message for send', () => {
    const result = prepareSendMessage({
      providerId: 'provider-1',
      model: 'model-1',
      content: 'hello',
      createId: createIdFactory(['conv-1', 'msg-1']),
      now: () => timestamp,
    })

    expect(result.createdConversation).toBe(true)
    expect(result.conversation.id).toBe('conv-1')
    expect(result.userMessage.id).toBe('msg-1')
    expect(result.requestHistory).toEqual([result.userMessage])
  })

  it('prepares resend by editing the user message and truncating following messages', () => {
    const result = prepareResendFromUserMessage(conversation(), 'u1', 'edited first', {
      now: () => '2026-04-29T00:01:00.000Z',
    })

    expect(result?.conversation.messages.map(message => message.id)).toEqual(['u1'])
    expect(result?.conversation.messages[0].content).toBe('edited first')
    expect(result?.requestHistory.map(message => message.id)).toEqual(['u1'])
  })

  it('prepares regeneration by truncating after the previous user message', () => {
    const result = prepareRegenerateAssistantMessage(conversation(), 'a2', {
      now: () => '2026-04-29T00:02:00.000Z',
    })

    expect(result?.conversation.messages.map(message => message.id)).toEqual(['u1', 'a1', 'u2'])
    expect(result?.requestHistory.map(message => message.id)).toEqual(['u1', 'a1', 'u2'])
  })
})
