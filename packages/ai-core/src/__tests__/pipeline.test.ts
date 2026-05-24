import { describe, it, expect } from 'vitest'
import { createPipeline } from '../pipeline/pipeline'
import { createMockInput } from './helpers'
import type { Message } from '../types'

describe('createPipeline', () => {
  it('passes input through when no steps are provided', () => {
    const pipeline = createPipeline()
    const input = createMockInput({
      messages: [{ role: 'user', content: [{ type: 'text', text: 'hi' }] }],
    })
    const output = pipeline(input)
    expect(output).toEqual(input)
  })

  it('applies a single step', () => {
    const step = (input: ReturnType<typeof createMockInput>) => ({
      ...input,
      messages: [
        ...input.messages,
        { role: 'assistant', content: [{ type: 'text', text: 'added' }] } satisfies Message,
      ],
    })
    const pipeline = createPipeline(step)
    const input = createMockInput({
      messages: [{ role: 'user', content: [{ type: 'text', text: 'hi' }] }],
    })
    const output = pipeline(input)
    expect(output.messages).toHaveLength(2)
    expect(output.messages[1]).toEqual({
      role: 'assistant',
      content: [{ type: 'text', text: 'added' }],
    })
  })

  it('composes multiple steps left to right', () => {
    const step1 = (input: ReturnType<typeof createMockInput>) => ({
      ...input,
      messages: [
        ...input.messages,
        { role: 'user', content: [{ type: 'text', text: '1' }] } satisfies Message,
      ],
    })
    const step2 = (input: ReturnType<typeof createMockInput>) => ({
      ...input,
      messages: [
        ...input.messages,
        { role: 'user', content: [{ type: 'text', text: '2' }] } satisfies Message,
      ],
    })
    const pipeline = createPipeline(step1, step2)
    const input = createMockInput()
    const output = pipeline(input)
    expect(output.messages.map(m => m.content)).toEqual([
      [{ type: 'text', text: '1' }],
      [{ type: 'text', text: '2' }],
    ])
  })

  it('does not mutate the original input', () => {
    const step = (input: ReturnType<typeof createMockInput>) => ({
      ...input,
      messages: [
        ...input.messages,
        { role: 'user', content: [{ type: 'text', text: 'new' }] } satisfies Message,
      ],
    })
    const pipeline = createPipeline(step)
    const input = createMockInput({
      messages: [{ role: 'user', content: [{ type: 'text', text: 'orig' }] }],
    })
    pipeline(input)
    expect(input.messages).toHaveLength(1)
  })
})
