import { describe, it, expect } from 'vitest'
import { systemPrompt } from '../pipeline/steps/system-prompt'
import { createMockInput } from './helpers'
import type { Message } from '../types'

describe('systemPrompt', () => {
  it('inserts a system message into an empty messages list', () => {
    const step = systemPrompt('You are a bot.')
    const output = step(createMockInput())
    expect(output.messages).toEqual([
      { role: 'system', content: [{ type: 'text', text: 'You are a bot.' }] },
    ])
  })

  it('prepends a system message before existing non-system messages', () => {
    const step = systemPrompt('sys')
    const input = createMockInput({
      messages: [{ role: 'user', content: [{ type: 'text', text: 'hello' }] }],
    })
    const output = step(input)
    expect(output.messages).toHaveLength(2)
    expect(output.messages[0]).toEqual({ role: 'system', content: [{ type: 'text', text: 'sys' }] })
    expect(output.messages[1]).toEqual({ role: 'user', content: [{ type: 'text', text: 'hello' }] })
  })

  it('replaces existing system message at index 0', () => {
    const step = systemPrompt('new system')
    const input = createMockInput({
      messages: [
        { role: 'system', content: [{ type: 'text', text: 'old system' }] },
        { role: 'user', content: [{ type: 'text', text: 'hi' }] },
      ],
    })
    const output = step(input)
    expect(output.messages).toHaveLength(2)
    expect(output.messages[0]).toEqual({
      role: 'system',
      content: [{ type: 'text', text: 'new system' }],
    })
  })

  it('does not mutate the original messages array', () => {
    const step = systemPrompt('sys')
    const messages: Message[] = [{ role: 'user', content: [{ type: 'text', text: 'hi' }] }]
    const input = createMockInput({ messages })
    step(input)
    expect(messages).toHaveLength(1)
    expect(messages[0].role).toBe('user')
  })
})
