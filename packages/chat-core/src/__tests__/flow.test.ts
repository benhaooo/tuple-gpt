import { describe, expect, it } from 'vitest'
import { prepareRegenerateTurn, prepareResendTurn, prepareSendMessage } from '../flow'
import type { ChatTurn, Conversation } from '#types'

const timestamp = '2026-04-29T00:00:00.000Z'

function createIdFactory(ids: string[]) {
  return () => {
    const id = ids.shift()
    if (!id) throw new Error('No test id left')
    return id
  }
}

function text(value: string) {
  return [{ type: 'text' as const, text: value }]
}

function turn(id: string, userId: string, assistantId: string, userText: string): ChatTurn {
  return {
    id,
    mode: 'chat',
    status: 'done',
    providerId: 'provider-1',
    model: 'model-1',
    startedAt: timestamp,
    endedAt: timestamp,
    messages: [
      {
        id: userId,
        role: 'user',
        content: text(userText),
        status: 'done',
        createdAt: timestamp,
        updatedAt: timestamp,
      },
      {
        id: assistantId,
        role: 'assistant',
        content: text(`answer ${userText}`),
        status: 'done',
        createdAt: timestamp,
        updatedAt: timestamp,
      },
    ],
  }
}

function conversation(): Conversation {
  return {
    id: 'conv-1',
    title: 'Chat',
    createdAt: timestamp,
    updatedAt: timestamp,
    turns: [turn('t1', 'u1', 'a1', 'first'), turn('t2', 'u2', 'a2', 'second')],
  }
}

describe('turn flow preparation', () => {
  it('prepares a new conversation and user turn for send', () => {
    const result = prepareSendMessage({
      providerId: 'provider-1',
      model: 'model-1',
      content: 'hello',
      createId: createIdFactory(['conv-1', 'msg-1', 'turn-1']),
      now: () => timestamp,
    })

    expect(result.createdConversation).toBe(true)
    expect(result.conversation.id).toBe('conv-1')
    expect(result.turn.id).toBe('turn-1')
    expect(result.userMessage.id).toBe('msg-1')
    expect(result.conversation.turns).toHaveLength(1)
    expect(result.requestHistory).toEqual([result.userMessage])
  })

  it('prepares resend by editing the user message and replacing following turns', () => {
    const result = prepareResendTurn(conversation(), 't1', 'edited first', {
      now: () => '2026-04-29T00:01:00.000Z',
    })

    expect(result?.conversation.turns.map(item => item.id)).toEqual(['t1'])
    expect(result?.turn.messages.map(message => message.id)).toEqual(['u1'])
    expect(result?.turn.messages[0]?.content).toEqual(text('edited first'))
    expect(result?.requestHistory.map(message => message.id)).toEqual(['u1'])
  })

  it('prepares regeneration by keeping the user message and replacing following turns', () => {
    const result = prepareRegenerateTurn(conversation(), 't2', {
      now: () => '2026-04-29T00:02:00.000Z',
    })

    expect(result?.conversation.turns.map(item => item.id)).toEqual(['t1', 't2'])
    expect(result?.turn.messages.map(message => message.id)).toEqual(['u2'])
    expect(result?.requestHistory.map(message => message.id)).toEqual(['u1', 'a1', 'u2'])
  })
})
