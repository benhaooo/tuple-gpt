import { describe, expect, it } from 'vitest'
import {
  addTurn,
  createConversation,
  createTurn,
  deleteConversation,
  truncateConversationAfterTurn,
} from '#conversation'
import type { Conversation } from '#types'

const timestamp = '2026-04-29T00:00:00.000Z'

function conversation(overrides: Partial<Conversation> = {}): Conversation {
  return {
    id: 'conv-1',
    title: '新对话',
    turns: [],
    createdAt: timestamp,
    updatedAt: timestamp,
    ...overrides,
  }
}

describe('conversation operations', () => {
  it('creates a conversation with injected id and timestamp', () => {
    const result = createConversation({
      createId: () => 'conv-1',
      now: () => timestamp,
    })

    expect(result).toEqual(conversation())
  })

  it('creates a turn and auto-generates title from the first user message', () => {
    const base = conversation()
    const content = 'abcdefghijklmnopqrstuvwxyz1234567890'
    const { turn, userMessage } = createTurn({
      providerId: 'provider-1',
      model: 'model-1',
      content,
      createId: () => 'id-1',
      now: () => timestamp,
    })
    const updated = addTurn(base, turn)

    expect(userMessage.content).toEqual([{ type: 'text', text: content }])
    expect(updated.turns).toHaveLength(1)
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

  it('truncates turns after the target turn', () => {
    const turns = ['t1', 't2', 't3'].map(id => ({
      id,
      mode: 'chat' as const,
      status: 'done' as const,
      providerId: 'provider-1',
      model: 'model-1',
      messages: [],
      startedAt: timestamp,
      endedAt: timestamp,
    }))
    const result = truncateConversationAfterTurn(conversation({ turns }), 't2', {
      now: () => '2026-04-29T00:01:00.000Z',
    })

    expect(result?.turns.map(turn => turn.id)).toEqual(['t1', 't2'])
    expect(result?.updatedAt).toBe('2026-04-29T00:01:00.000Z')
  })
})
