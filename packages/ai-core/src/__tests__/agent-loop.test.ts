import { describe, it, expect, vi } from 'vitest'
import { runAgentLoop } from '../agent/agent-loop'
import type { StreamEvent, Message } from '../types'
import type { ToolExecutor } from '../agent/tool-executor'
import { createMockTransport, collect, executorRunner } from './helpers'

describe('runAgentLoop', () => {
  const provider = { type: 'openai' as const, apiKey: 'test', model: 'gpt-4' }

  it('yields text deltas and stops on finish=stop', async () => {
    const events: StreamEvent[] = [
      { type: 'text_delta', text: 'Hello' },
      { type: 'text_delta', text: ' World' },
      { type: 'finish', finishReason: 'stop' },
    ]
    const transport = createMockTransport([events])
    const messages: Message[] = [{ role: 'user', content: [{ type: 'text', text: 'hi' }] }]

    const yielded = await collect(runAgentLoop({ messages, transport, provider }))

    expect(yielded).toEqual(events)
    // Assistant message appended
    expect(messages).toHaveLength(2)
    expect(messages[1]).toEqual({
      role: 'assistant',
      content: [{ type: 'text', text: 'Hello World' }],
    })
  })

  it('concatenates multiple text deltas into one assistant message', async () => {
    const events: StreamEvent[] = [
      { type: 'text_delta', text: 'a' },
      { type: 'text_delta', text: 'b' },
      { type: 'text_delta', text: 'c' },
      { type: 'finish', finishReason: 'stop' },
    ]
    const transport = createMockTransport([events])
    const messages: Message[] = [{ role: 'user', content: [{ type: 'text', text: 'test' }] }]

    await collect(runAgentLoop({ messages, transport, provider }))

    expect(messages[1]).toEqual({ role: 'assistant', content: [{ type: 'text', text: 'abc' }] })
  })

  it('handles tool call → execute → second round text reply', async () => {
    const round1: StreamEvent[] = [
      { type: 'tool_call_start', toolCall: { id: 'tc1', name: 'echo' } },
      { type: 'tool_call_delta', toolCallId: 'tc1', arguments: '{"t' },
      { type: 'tool_call_delta', toolCallId: 'tc1', arguments: 'ext":"hi"}' },
      { type: 'tool_call_end', toolCallId: 'tc1' },
      { type: 'finish', finishReason: 'tool_calls' },
    ]
    const round2: StreamEvent[] = [
      { type: 'text_delta', text: 'Done' },
      { type: 'finish', finishReason: 'stop' },
    ]
    const transport = createMockTransport([round1, round2])
    const toolExecutor: ToolExecutor = {
      echo: { execute: async args => ({ content: `echoed: ${args}` }) },
    }
    const messages: Message[] = [{ role: 'user', content: [{ type: 'text', text: 'run echo' }] }]

    const yielded = await collect(
      runAgentLoop({
        messages,
        transport,
        provider,
        toolRunner: executorRunner(toolExecutor),
        tools: [],
      }),
    )

    // Should yield tool results between the tool-call round and final answer round
    expect(yielded).toEqual([
      ...round1,
      { type: 'tool_result', toolCallId: 'tc1', result: 'echoed: {"text":"hi"}' },
      ...round2,
    ])
    // messages: user, assistant(tool_call), tool(result), assistant(text)
    expect(messages).toHaveLength(4)
    expect(messages[1].role).toBe('assistant')
    expect(messages[2].role).toBe('tool')
    expect(messages[3]).toEqual({ role: 'assistant', content: [{ type: 'text', text: 'Done' }] })
  })

  it('executes multiple tool calls in parallel', async () => {
    const callOrder: string[] = []
    const round1: StreamEvent[] = [
      { type: 'tool_call_start', toolCall: { id: 'tc1', name: 'a' } },
      { type: 'tool_call_delta', toolCallId: 'tc1', arguments: '{}' },
      { type: 'tool_call_end', toolCallId: 'tc1' },
      { type: 'tool_call_start', toolCall: { id: 'tc2', name: 'b' } },
      { type: 'tool_call_delta', toolCallId: 'tc2', arguments: '{}' },
      { type: 'tool_call_end', toolCallId: 'tc2' },
      { type: 'finish', finishReason: 'tool_calls' },
    ]
    const round2: StreamEvent[] = [
      { type: 'text_delta', text: 'ok' },
      { type: 'finish', finishReason: 'stop' },
    ]
    const transport = createMockTransport([round1, round2])
    const toolExecutor: ToolExecutor = {
      a: {
        execute: async () => {
          callOrder.push('a')
          return { content: 'result-a' }
        },
      },
      b: {
        execute: async () => {
          callOrder.push('b')
          return { content: 'result-b' }
        },
      },
    }
    const messages: Message[] = [{ role: 'user', content: [{ type: 'text', text: 'go' }] }]

    await collect(
      runAgentLoop({
        messages,
        transport,
        provider,
        toolRunner: executorRunner(toolExecutor),
        tools: [],
      }),
    )

    // Both tools were called
    expect(callOrder).toContain('a')
    expect(callOrder).toContain('b')
    // Two tool result messages
    const toolMsgs = messages.filter(m => m.role === 'tool')
    expect(toolMsgs).toHaveLength(2)
  })

  it('yields one tool_result event per executed tool call', async () => {
    const round1: StreamEvent[] = [
      { type: 'tool_call_start', toolCall: { id: 'tc1', name: 'a' } },
      { type: 'tool_call_delta', toolCallId: 'tc1', arguments: '{}' },
      { type: 'tool_call_end', toolCallId: 'tc1' },
      { type: 'tool_call_start', toolCall: { id: 'tc2', name: 'b' } },
      { type: 'tool_call_delta', toolCallId: 'tc2', arguments: '{}' },
      { type: 'tool_call_end', toolCallId: 'tc2' },
      { type: 'finish', finishReason: 'tool_calls' },
    ]
    const round2: StreamEvent[] = [
      { type: 'text_delta', text: 'ok' },
      { type: 'finish', finishReason: 'stop' },
    ]
    const transport = createMockTransport([round1, round2])
    const toolExecutor: ToolExecutor = {
      a: { execute: async () => ({ content: 'result-a' }) },
      b: { execute: async () => ({ content: 'result-b' }) },
    }
    const messages: Message[] = [{ role: 'user', content: [{ type: 'text', text: 'go' }] }]

    const yielded = await collect(
      runAgentLoop({
        messages,
        transport,
        provider,
        toolRunner: executorRunner(toolExecutor),
        tools: [],
      }),
    )

    expect(yielded.filter(event => event.type === 'tool_result')).toEqual([
      { type: 'tool_result', toolCallId: 'tc1', result: 'result-a' },
      { type: 'tool_result', toolCallId: 'tc2', result: 'result-b' },
    ])
  })

  it('respects maxTurns limit', async () => {
    // Every turn returns tool_calls, so without maxTurns it would loop forever
    const toolEvents: StreamEvent[] = [
      { type: 'tool_call_start', toolCall: { id: 'tc1', name: 'loop' } },
      { type: 'tool_call_delta', toolCallId: 'tc1', arguments: '{}' },
      { type: 'tool_call_end', toolCallId: 'tc1' },
      { type: 'finish', finishReason: 'tool_calls' },
    ]
    const transport = createMockTransport([toolEvents, toolEvents, toolEvents])
    const toolExecutor: ToolExecutor = {
      loop: { execute: async () => ({ content: 'again' }) },
    }
    const messages: Message[] = [{ role: 'user', content: [{ type: 'text', text: 'go' }] }]

    await collect(
      runAgentLoop({
        messages,
        transport,
        provider,
        toolRunner: executorRunner(toolExecutor),
        tools: [],
        maxTurns: 2,
      }),
    )

    // 2 turns means 2 assistant messages and 2 tool result messages
    const assistantMsgs = messages.filter(m => m.role === 'assistant')
    expect(assistantMsgs.length).toBeLessThanOrEqual(2)
  })

  it('terminates immediately on error event', async () => {
    const events: StreamEvent[] = [
      { type: 'text_delta', text: 'partial' },
      { type: 'error', error: new Error('network failure') },
    ]
    const transport = createMockTransport([events])
    const messages: Message[] = [{ role: 'user', content: [{ type: 'text', text: 'hi' }] }]

    const yielded = await collect(runAgentLoop({ messages, transport, provider }))

    expect(yielded).toHaveLength(2)
    expect(yielded[1].type).toBe('error')
  })

  it('skips tool execution when no toolExecutor is provided', async () => {
    const events: StreamEvent[] = [
      { type: 'tool_call_start', toolCall: { id: 'tc1', name: 'foo' } },
      { type: 'tool_call_delta', toolCallId: 'tc1', arguments: '{}' },
      { type: 'tool_call_end', toolCallId: 'tc1' },
      { type: 'finish', finishReason: 'tool_calls' },
    ]
    const transport = createMockTransport([events])
    const messages: Message[] = [{ role: 'user', content: [{ type: 'text', text: 'go' }] }]

    await collect(runAgentLoop({ messages, transport, provider }))

    // Should stop after one turn — no tool result messages
    const toolMsgs = messages.filter(m => m.role === 'tool')
    expect(toolMsgs).toHaveLength(0)
  })

  it('mutates the messages array in place', async () => {
    const events: StreamEvent[] = [
      { type: 'text_delta', text: 'reply' },
      { type: 'finish', finishReason: 'stop' },
    ]
    const transport = createMockTransport([events])
    const messages: Message[] = [{ role: 'user', content: [{ type: 'text', text: 'hi' }] }]
    const ref = messages

    await collect(runAgentLoop({ messages, transport, provider }))

    expect(ref).toBe(messages) // same reference
    expect(ref).toHaveLength(2)
  })

  it('applies pipeline steps before transport', async () => {
    const events: StreamEvent[] = [
      { type: 'text_delta', text: 'ok' },
      { type: 'finish', finishReason: 'stop' },
    ]
    const streamSpy = vi.fn(async function* () {
      for (const e of events) yield e
    })
    const transport = { stream: streamSpy }
    const messages: Message[] = [{ role: 'user', content: [{ type: 'text', text: 'hi' }] }]

    const pipeline = [
      (input: any) => ({
        ...input,
        messages: [
          { role: 'system' as const, content: [{ type: 'text', text: 'injected' }] },
          ...input.messages,
        ],
      }),
    ]

    await collect(runAgentLoop({ messages, transport, provider, pipeline }))

    // The transport should have received the pipeline-modified messages
    const callArg = (streamSpy.mock.calls as any[][])[0][0]
    expect(callArg.messages[0]).toEqual({
      role: 'system',
      content: [{ type: 'text', text: 'injected' }],
    })
  })

  it('builds ContentPart[] for mixed text + tool call', async () => {
    const events: StreamEvent[] = [
      { type: 'text_delta', text: 'Let me ' },
      { type: 'text_delta', text: 'think' },
      { type: 'tool_call_start', toolCall: { id: 'tc1', name: 'search' } },
      { type: 'tool_call_delta', toolCallId: 'tc1', arguments: '{"q":"test"}' },
      { type: 'tool_call_end', toolCallId: 'tc1' },
      { type: 'finish', finishReason: 'tool_calls' },
    ]
    const round2: StreamEvent[] = [
      { type: 'text_delta', text: 'Found it' },
      { type: 'finish', finishReason: 'stop' },
    ]
    const transport = createMockTransport([events, round2])
    const toolExecutor: ToolExecutor = {
      search: { execute: async () => ({ content: 'result' }) },
    }
    const messages: Message[] = [{ role: 'user', content: [{ type: 'text', text: 'find' }] }]

    await collect(
      runAgentLoop({
        messages,
        transport,
        provider,
        toolRunner: executorRunner(toolExecutor),
        tools: [],
      }),
    )

    // First assistant message should be ContentPart[] (text + tool_call)
    const assistantMsg = messages[1]
    expect(Array.isArray(assistantMsg.content)).toBe(true)
    const parts = assistantMsg.content as any[]
    expect(parts[0]).toEqual({ type: 'text', text: 'Let me think' })
    expect(parts[1].type).toBe('tool_call')
    expect(parts[1].toolCall.name).toBe('search')
    expect(parts[1].toolCall.arguments).toBe('{"q":"test"}')
  })
})
