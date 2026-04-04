import { describe, it, expect } from 'vitest'
import { injectTools } from '../pipeline/steps/tool-injection'
import { createMockInput } from './helpers'
import type { ToolDefinition } from '../types'

const tool: ToolDefinition = {
  name: 'echo',
  description: 'echoes input',
  parameters: { type: 'object', properties: { text: { type: 'string' } } },
}

describe('injectTools', () => {
  it('injects tools into input with no tools', () => {
    const step = injectTools([tool])
    const input = createMockInput()
    const output = step(input)
    expect(output.tools).toEqual([tool])
  })

  it('replaces existing tools', () => {
    const existing: ToolDefinition = { name: 'old', description: 'old', parameters: {} }
    const step = injectTools([tool])
    const input = createMockInput({ tools: [existing] })
    const output = step(input)
    expect(output.tools).toEqual([tool])
    expect(output.tools).not.toContainEqual(existing)
  })

  it('injects an empty array', () => {
    const step = injectTools([])
    const input = createMockInput({ tools: [tool] })
    const output = step(input)
    expect(output.tools).toEqual([])
  })
})
