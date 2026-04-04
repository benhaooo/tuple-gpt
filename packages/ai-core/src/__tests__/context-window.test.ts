import { describe, it, expect } from 'vitest'
import { contextWindow } from '../pipeline/steps/context-window'
import { createMockInput } from './helpers'
import type { Message } from '../types'

function msg(role: Message['role'], content: string): Message {
  return { role, content }
}

describe('contextWindow', () => {
  describe('maxMessages', () => {
    it('truncates to keep the most recent messages', () => {
      const step = contextWindow({ maxMessages: 2 })
      const input = createMockInput({
        messages: [msg('user', '1'), msg('assistant', '2'), msg('user', '3')],
      })
      const output = step(input)
      expect(output.messages).toEqual([msg('assistant', '2'), msg('user', '3')])
    })

    it('preserves system message and counts it toward maxMessages', () => {
      const step = contextWindow({ maxMessages: 3 })
      const input = createMockInput({
        messages: [
          msg('system', 'sys'),
          msg('user', '1'),
          msg('assistant', '2'),
          msg('user', '3'),
        ],
      })
      const output = step(input)
      expect(output.messages).toHaveLength(3)
      expect(output.messages[0]).toEqual(msg('system', 'sys'))
      expect(output.messages[1]).toEqual(msg('assistant', '2'))
      expect(output.messages[2]).toEqual(msg('user', '3'))
    })
  })

  describe('maxChars', () => {
    it('truncates oldest messages to fit within budget', () => {
      const step = contextWindow({ maxChars: 5 })
      const input = createMockInput({
        messages: [msg('user', 'aaa'), msg('assistant', 'bb'), msg('user', 'cc')],
      })
      const output = step(input)
      // 'bb'(2) + 'cc'(2) = 4 fits, adding 'aaa'(3) would make 7 > 5
      expect(output.messages).toEqual([msg('assistant', 'bb'), msg('user', 'cc')])
    })

    it('deducts system message chars from budget', () => {
      const step = contextWindow({ maxChars: 10 })
      const input = createMockInput({
        messages: [
          msg('system', 'sysss'), // 5 chars
          msg('user', 'aaa'),     // 3 chars
          msg('assistant', 'bb'), // 2 chars
          msg('user', 'ccc'),     // 3 chars
        ],
      })
      const output = step(input)
      // budget = 10 - 5(sys) = 5, 'ccc'(3) + 'bb'(2) = 5 fits, adding 'aaa'(3) = 8 > 5
      expect(output.messages).toEqual([
        msg('system', 'sysss'),
        msg('assistant', 'bb'),
        msg('user', 'ccc'),
      ])
    })

    it('keeps at least one message even if it exceeds maxChars', () => {
      const step = contextWindow({ maxChars: 2 })
      const input = createMockInput({
        messages: [msg('user', 'abcdef')],
      })
      const output = step(input)
      expect(output.messages).toEqual([msg('user', 'abcdef')])
    })

    it('handles ContentPart[] messages for char length', () => {
      const step = contextWindow({ maxChars: 10 })
      const input = createMockInput({
        messages: [
          {
            role: 'assistant',
            content: [
              { type: 'text', text: 'hello' },         // 5
              { type: 'tool_call', toolCall: { id: '1', name: 'x', arguments: '{}' } }, // 2
            ],
          },
          msg('user', 'abc'), // 3
        ],
      })
      const output = step(input)
      // first msg = 5+2 = 7, second = 3, total = 10 fits
      expect(output.messages).toHaveLength(2)
    })
  })

  it('passes through when no options limit', () => {
    const step = contextWindow({})
    const input = createMockInput({
      messages: [msg('user', '1'), msg('assistant', '2'), msg('user', '3')],
    })
    const output = step(input)
    expect(output.messages).toHaveLength(3)
  })

  it('handles empty messages', () => {
    const step = contextWindow({ maxMessages: 5, maxChars: 100 })
    const output = step(createMockInput())
    expect(output.messages).toEqual([])
  })
})
