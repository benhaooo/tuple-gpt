import { describe, it, expect } from 'vitest'
import { executeToolCall, type ToolExecutor } from '../agent/tool-executor'
import type { ToolExecutionContext } from '../types'

const ctx = (toolCallId = 'tc'): ToolExecutionContext => ({
  toolCallId,
  signal: new AbortController().signal,
})

describe('executeToolCall', () => {
  it('calls a sync tool and returns its result', async () => {
    const executor: ToolExecutor = {
      echo: { execute: async args => ({ content: `echoed: ${args}` }) },
    }
    const result = await executeToolCall(executor, 'echo', '{"text":"hi"}', ctx())
    expect(result).toEqual({ result: 'echoed: {"text":"hi"}', isError: false })
  })

  it('calls an async tool and returns its result', async () => {
    const executor: ToolExecutor = {
      asyncEcho: {
        execute: async args => ({ content: `async: ${args}` }),
      },
    }
    const result = await executeToolCall(executor, 'asyncEcho', 'data', ctx())
    expect(result).toEqual({ result: 'async: data', isError: false })
  })

  it('returns isError when tool is not found', async () => {
    const executor: ToolExecutor = {}
    const result = await executeToolCall(executor, 'missing', '{}', ctx())
    expect(result.isError).toBe(true)
    expect(result.result).toContain('missing')
  })

  it('returns isError when tool throws an Error', async () => {
    const executor: ToolExecutor = {
      fail: {
        execute: async () => {
          throw new Error('boom')
        },
      },
    }
    const result = await executeToolCall(executor, 'fail', '{}', ctx())
    expect(result).toEqual({ result: 'boom', isError: true })
  })

  it('returns isError when tool throws a non-Error', async () => {
    const executor: ToolExecutor = {
      fail: {
        execute: async () => {
          throw 'string error'
        },
      },
    }
    const result = await executeToolCall(executor, 'fail', '{}', ctx())
    expect(result).toEqual({ result: 'string error', isError: true })
  })

  it('passes args correctly', async () => {
    let receivedArgs = ''
    const executor: ToolExecutor = {
      capture: {
        execute: async args => {
          receivedArgs = args
          return { content: 'ok' }
        },
      },
    }
    await executeToolCall(executor, 'capture', '{"foo":"bar"}', ctx())
    expect(receivedArgs).toBe('{"foo":"bar"}')
  })
})
