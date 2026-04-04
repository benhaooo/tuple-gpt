import { describe, it, expect } from 'vitest'
import { createPipeline } from '../pipeline/pipeline'
import { createMockInput } from './helpers'

describe('createPipeline', () => {
  it('passes input through when no steps are provided', () => {
    const pipeline = createPipeline()
    const input = createMockInput({ messages: [{ role: 'user', content: 'hi' }] })
    const output = pipeline(input)
    expect(output).toEqual(input)
  })

  it('applies a single step', () => {
    const step = (input: ReturnType<typeof createMockInput>) => ({
      ...input,
      messages: [...input.messages, { role: 'assistant' as const, content: 'added' }],
    })
    const pipeline = createPipeline(step)
    const input = createMockInput({ messages: [{ role: 'user', content: 'hi' }] })
    const output = pipeline(input)
    expect(output.messages).toHaveLength(2)
    expect(output.messages[1]).toEqual({ role: 'assistant', content: 'added' })
  })

  it('composes multiple steps left to right', () => {
    const step1 = (input: ReturnType<typeof createMockInput>) => ({
      ...input,
      messages: [...input.messages, { role: 'user' as const, content: '1' }],
    })
    const step2 = (input: ReturnType<typeof createMockInput>) => ({
      ...input,
      messages: [...input.messages, { role: 'user' as const, content: '2' }],
    })
    const pipeline = createPipeline(step1, step2)
    const input = createMockInput()
    const output = pipeline(input)
    expect(output.messages.map((m) => m.content)).toEqual(['1', '2'])
  })

  it('does not mutate the original input', () => {
    const step = (input: ReturnType<typeof createMockInput>) => ({
      ...input,
      messages: [...input.messages, { role: 'user' as const, content: 'new' }],
    })
    const pipeline = createPipeline(step)
    const input = createMockInput({ messages: [{ role: 'user', content: 'orig' }] })
    pipeline(input)
    expect(input.messages).toHaveLength(1)
  })
})
