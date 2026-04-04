import { describe, it, expect } from 'vitest'
import { systemPrompt } from '../pipeline/steps/system-prompt'
import { createMockInput } from './helpers'

describe('systemPrompt', () => {
  it('inserts a system message into an empty messages list', () => {
    const step = systemPrompt('You are a bot.')
    const output = step(createMockInput())
    expect(output.messages).toEqual([{ role: 'system', content: 'You are a bot.' }])
  })

  it('prepends a system message before existing non-system messages', () => {
    const step = systemPrompt('sys')
    const input = createMockInput({ messages: [{ role: 'user', content: 'hello' }] })
    const output = step(input)
    expect(output.messages).toHaveLength(2)
    expect(output.messages[0]).toEqual({ role: 'system', content: 'sys' })
    expect(output.messages[1]).toEqual({ role: 'user', content: 'hello' })
  })

  it('replaces existing system message at index 0', () => {
    const step = systemPrompt('new system')
    const input = createMockInput({
      messages: [
        { role: 'system', content: 'old system' },
        { role: 'user', content: 'hi' },
      ],
    })
    const output = step(input)
    expect(output.messages).toHaveLength(2)
    expect(output.messages[0]).toEqual({ role: 'system', content: 'new system' })
  })

  it('does not mutate the original messages array', () => {
    const step = systemPrompt('sys')
    const messages = [{ role: 'user' as const, content: 'hi' }]
    const input = createMockInput({ messages })
    step(input)
    expect(messages).toHaveLength(1)
    expect(messages[0].role).toBe('user')
  })
})
