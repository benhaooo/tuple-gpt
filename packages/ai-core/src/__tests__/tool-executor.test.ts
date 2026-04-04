import { describe, it, expect } from 'vitest'
import { executeToolCall, type ToolExecutor } from '../agent/tool-executor'

describe('executeToolCall', () => {
  it('calls a sync tool and returns its result', async () => {
    const executor: ToolExecutor = {
      echo: (args) => `echoed: ${args}`,
    }
    const result = await executeToolCall(executor, 'echo', '{"text":"hi"}')
    expect(result).toEqual({ result: 'echoed: {"text":"hi"}', isError: false })
  })

  it('calls an async tool and returns its result', async () => {
    const executor: ToolExecutor = {
      asyncEcho: async (args) => `async: ${args}`,
    }
    const result = await executeToolCall(executor, 'asyncEcho', 'data')
    expect(result).toEqual({ result: 'async: data', isError: false })
  })

  it('returns isError when tool is not found', async () => {
    const executor: ToolExecutor = {}
    const result = await executeToolCall(executor, 'missing', '{}')
    expect(result.isError).toBe(true)
    expect(result.result).toContain('missing')
  })

  it('returns isError when tool throws an Error', async () => {
    const executor: ToolExecutor = {
      fail: () => { throw new Error('boom') },
    }
    const result = await executeToolCall(executor, 'fail', '{}')
    expect(result).toEqual({ result: 'boom', isError: true })
  })

  it('returns isError when tool throws a non-Error', async () => {
    const executor: ToolExecutor = {
      fail: () => { throw 'string error' },
    }
    const result = await executeToolCall(executor, 'fail', '{}')
    expect(result).toEqual({ result: 'string error', isError: true })
  })

  it('passes args correctly', async () => {
    let receivedArgs = ''
    const executor: ToolExecutor = {
      capture: (args) => { receivedArgs = args; return 'ok' },
    }
    await executeToolCall(executor, 'capture', '{"foo":"bar"}')
    expect(receivedArgs).toBe('{"foo":"bar"}')
  })
})
