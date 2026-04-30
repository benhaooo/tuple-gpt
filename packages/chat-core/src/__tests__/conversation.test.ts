import { describe, expect, it } from 'vitest'
import {
  addMessage,
  createConversation,
  deleteConversation,
  truncateAfterMessage,
} from '../conversation'
import type { Conversation } from '../types'

const timestamp = '2026-04-29T00:00:00.000Z'

function conversation(overrides: Partial<Conversation> = {}): Conversation {
  return {
    id: 'conv-1',
    title: '新对话',
    messages: [],
    providerId: 'provider-1',
    model: 'model-1',
    createdAt: timestamp,
    updatedAt: timestamp,
    ...overrides,
  }
}

describe('conversation operations', () => {
  it('creates a conversation with injected id and timestamp', () => {
    const result = createConversation({
      providerId: 'provider-1',
      model: 'model-1',
      createId: () => 'conv-1',
      now: () => timestamp,
    })

    expect(result).toEqual(conversation())
  })

  it('auto-generates title from the first user message', () => {
    const base = conversation()
    const content = 'abcdefghijklmnopqrstuvwxyz1234567890'
    const { conversation: updated, message } = addMessage(
      base,
      {
        role: 'user',
        content,
        status: 'done',
      },
      {
        createId: () => 'msg-1',
        now: () => timestamp,
      },
    )

    expect(message.id).toBe('msg-1')
    expect(updated.messages).toHaveLength(1)
    expect(updated.title).toBe(content.slice(0, 30) + '...')
  })

  it('falls back to the first remaining conversation when deleting the active one', () => {
    const conversations = [
      conversation({ id: 'conv-1' }),
      conversation({ id: 'conv-2' }),
      conversation({ id: 'conv-3' }),
    ]

    const result = deleteConversation(conversations, 'conv-1', 'conv-1')

    expect(result.conversations.map(item => item.id)).toEqual(['conv-2', 'conv-3'])
    expect(result.activeConversationId).toBe('conv-2')
  })

  it('truncates messages after the target message', () => {
    const conversations = [
      conversation({
        messages: [
          { id: 'u1', role: 'user', content: 'one', status: 'done', timestamp },
          { id: 'a1', role: 'assistant', content: 'two', status: 'done', timestamp },
          { id: 'u2', role: 'user', content: 'three', status: 'done', timestamp },
        ],
      }),
    ]

    const result = truncateAfterMessage(conversations, 'conv-1', 'a1', {
      now: () => '2026-04-29T00:01:00.000Z',
    })

    expect(result[0].messages.map(message => message.id)).toEqual(['u1', 'a1'])
    expect(result[0].updatedAt).toBe('2026-04-29T00:01:00.000Z')
  })
})
