import { describe, it, expect, vi } from 'vitest'
import { runAgentLoop } from '../agent/agent-loop'
import type { StreamEvent, Message, Tool } from '../types'
import { defineTool } from '../types'
import { createMockTransport, collect } from './helpers'

// Count tool_call parts that have a result. Replaces the old idiom of
// counting messages with role 'tool' since results now live on the part.
function countResolvedToolCalls(messages: Message[]): number {
  let n = 0
  for (const msg of messages) {
    for (const part of msg.content) {
      if (part.type === 'tool_call' && part.result !== undefined) n++
    }
  }
  return n
}

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

  it('merges reasoning updates with the same id', async () => {
    const events: StreamEvent[] = [
      {
        type: 'reasoning_state',
        reasoning: {
          id: 'rs1',
          provider: 'openai-responses',
          status: 'in_progress',
          summary: 'Check',
        },
      },
      {
        type: 'reasoning_state',
        reasoning: {
          id: 'rs1',
          provider: 'openai-responses',
          status: 'completed',
          summary: 'Check sources',
          encryptedContent: 'encrypted',
        },
      },
      { type: 'finish', finishReason: 'stop' },
    ]
    const transport = createMockTransport([events])
    const messages: Message[] = [{ role: 'user', content: [{ type: 'text', text: 'test' }] }]

    await collect(runAgentLoop({ messages, transport, provider }))

    expect(messages[1]).toEqual({
      role: 'assistant',
      content: [
        {
          type: 'reasoning',
          reasoning: {
            id: 'rs1',
            provider: 'openai-responses',
            status: 'completed',
            summary: 'Check sources',
            encryptedContent: 'encrypted',
          },
        },
      ],
    })
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
    const tools: Tool[] = [
      defineTool({
        name: 'echo',
        description: 'echo',
        parameters: { type: 'object', properties: {} },
        execute: async args => ({ type: 'result', content: `echoed: ${args}` }),
      }),
    ]
    const messages: Message[] = [{ role: 'user', content: [{ type: 'text', text: 'run echo' }] }]

    const yielded = await collect(
      runAgentLoop({
        messages,
        transport,
        provider,
        tools,
      }),
    )

    // Should yield tool results between the tool-call round and final answer round
    expect(yielded).toEqual([
      ...round1,
      { type: 'tool_result', toolCallId: 'tc1', result: 'echoed: {"text":"hi"}' },
      ...round2,
    ])
    // messages: user, assistant(tool_call w/ result), assistant(text)
    expect(messages).toHaveLength(3)
    expect(messages[1].role).toBe('assistant')
    const toolCallPart = messages[1].content.find(p => p.type === 'tool_call')
    expect(toolCallPart).toMatchObject({
      type: 'tool_call',
      result: 'echoed: {"text":"hi"}',
    })
    expect(messages[2]).toEqual({ role: 'assistant', content: [{ type: 'text', text: 'Done' }] })
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
    const tools: Tool[] = [
      defineTool({
        name: 'a',
        description: 'a',
        parameters: { type: 'object', properties: {} },
        execute: async () => {
          callOrder.push('a')
          return { type: 'result', content: 'result-a' }
        },
      }),
      defineTool({
        name: 'b',
        description: 'b',
        parameters: { type: 'object', properties: {} },
        execute: async () => {
          callOrder.push('b')
          return { type: 'result', content: 'result-b' }
        },
      }),
    ]
    const messages: Message[] = [{ role: 'user', content: [{ type: 'text', text: 'go' }] }]

    await collect(
      runAgentLoop({
        messages,
        transport,
        provider,
        tools,
      }),
    )

    // Both tools were called
    expect(callOrder).toContain('a')
    expect(callOrder).toContain('b')
    // Two tool calls now carry results
    expect(countResolvedToolCalls(messages)).toBe(2)
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
    const tools: Tool[] = [
      defineTool({
        name: 'a',
        description: 'a',
        parameters: { type: 'object', properties: {} },
        execute: async () => ({ type: 'result', content: 'result-a' }),
      }),
      defineTool({
        name: 'b',
        description: 'b',
        parameters: { type: 'object', properties: {} },
        execute: async () => ({ type: 'result', content: 'result-b' }),
      }),
    ]
    const messages: Message[] = [{ role: 'user', content: [{ type: 'text', text: 'go' }] }]

    const yielded = await collect(
      runAgentLoop({
        messages,
        transport,
        provider,
        tools,
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
    const tools: Tool[] = [
      defineTool({
        name: 'loop',
        description: 'loop',
        parameters: { type: 'object', properties: {} },
        execute: async () => ({ type: 'result', content: 'again' }),
      }),
    ]
    const messages: Message[] = [{ role: 'user', content: [{ type: 'text', text: 'go' }] }]

    await collect(
      runAgentLoop({
        messages,
        transport,
        provider,
        tools,
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

  it('skips tool execution when no tools are provided', async () => {
    const events: StreamEvent[] = [
      { type: 'tool_call_start', toolCall: { id: 'tc1', name: 'foo' } },
      { type: 'tool_call_delta', toolCallId: 'tc1', arguments: '{}' },
      { type: 'tool_call_end', toolCallId: 'tc1' },
      { type: 'finish', finishReason: 'tool_calls' },
    ]
    const transport = createMockTransport([events])
    const messages: Message[] = [{ role: 'user', content: [{ type: 'text', text: 'go' }] }]

    await collect(runAgentLoop({ messages, transport, provider }))

    // Should stop after one turn — no resolved tool calls
    expect(countResolvedToolCalls(messages)).toBe(0)
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
    const tools: Tool[] = [
      defineTool({
        name: 'search',
        description: 'search',
        parameters: { type: 'object', properties: {} },
        execute: async () => ({ type: 'result', content: 'result' }),
      }),
    ]
    const messages: Message[] = [{ role: 'user', content: [{ type: 'text', text: 'find' }] }]

    await collect(
      runAgentLoop({
        messages,
        transport,
        provider,
        tools,
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

  it('emits ToolInteractionRequired and exits when a tool suspends', async () => {
    const round1: StreamEvent[] = [
      { type: 'tool_call_start', toolCall: { id: 'tc1', name: 'ask' } },
      { type: 'tool_call_delta', toolCallId: 'tc1', arguments: '{"q":"y/n"}' },
      { type: 'tool_call_end', toolCallId: 'tc1' },
      { type: 'finish', finishReason: 'tool_calls' },
    ]
    const round2: StreamEvent[] = [
      { type: 'text_delta', text: 'should not get here' },
      { type: 'finish', finishReason: 'stop' },
    ]
    const transport = createMockTransport([round1, round2])
    const tools: Tool[] = [
      defineTool({
        name: 'ask',
        description: 'ask',
        parameters: { type: 'object', properties: {} },
        execute: async () => ({ type: 'suspend', reason: 'ask_user', payload: { q: 'y/n' } }),
      }),
    ]
    const messages: Message[] = [{ role: 'user', content: [{ type: 'text', text: 'ask me' }] }]

    const yielded = await collect(runAgentLoop({ messages, transport, provider, tools }))

    const interaction = yielded.find(e => e.type === 'tool_interaction_required')
    expect(interaction).toMatchObject({
      type: 'tool_interaction_required',
      toolCallId: 'tc1',
      toolName: 'ask',
      reason: 'ask_user',
      payload: { q: 'y/n' },
    })
    // Loop must have exited — no tool_result, no second round text
    expect(yielded.find(e => e.type === 'tool_result')).toBeUndefined()
    expect(yielded.find(e => e.type === 'text_delta')).toBeUndefined()
    // The tool_call part is still pending (no result on it)
    expect(countResolvedToolCalls(messages)).toBe(0)
  })

  it('treats unknown tools as error results', async () => {
    const round1: StreamEvent[] = [
      { type: 'tool_call_start', toolCall: { id: 'tc1', name: 'missing' } },
      { type: 'tool_call_delta', toolCallId: 'tc1', arguments: '{}' },
      { type: 'tool_call_end', toolCallId: 'tc1' },
      { type: 'finish', finishReason: 'tool_calls' },
    ]
    const round2: StreamEvent[] = [
      { type: 'text_delta', text: 'recovered' },
      { type: 'finish', finishReason: 'stop' },
    ]
    const transport = createMockTransport([round1, round2])
    const messages: Message[] = [{ role: 'user', content: [{ type: 'text', text: 'go' }] }]

    const yielded = await collect(runAgentLoop({ messages, transport, provider, tools: [] }))

    const toolResult = yielded.find(e => e.type === 'tool_result')
    expect(toolResult).toMatchObject({
      type: 'tool_result',
      toolCallId: 'tc1',
      isError: true,
    })
    expect(countResolvedToolCalls(messages)).toBe(1)
  })

  describe('resume phase via Resolution[]', () => {
    // Build a history with one suspended tool_call (no result on the part)
    function suspendedHistory(toolCallId = 'tc1', toolName = 'deploy'): Message[] {
      return [
        { role: 'user', content: [{ type: 'text', text: 'deploy please' }] },
        {
          role: 'assistant',
          content: [
            {
              type: 'tool_call',
              toolCall: { id: toolCallId, name: toolName, arguments: '{"env":"prod"}' },
            },
          ],
        },
      ]
    }

    it('resolves with type=result by injecting tool_result without re-running execute', async () => {
      const round2: StreamEvent[] = [
        { type: 'text_delta', text: 'deployed' },
        { type: 'finish', finishReason: 'stop' },
      ]
      const transport = createMockTransport([round2])
      const executeSpy = vi.fn()
      const tools: Tool[] = [
        defineTool({
          name: 'deploy',
          description: 'deploy',
          parameters: { type: 'object', properties: {} },
          execute: executeSpy,
        }),
      ]
      const messages = suspendedHistory()

      const yielded = await collect(
        runAgentLoop({
          messages,
          transport,
          provider,
          tools,
          resolutions: [{ toolCallId: 'tc1', type: 'result', content: 'manual result' }],
        }),
      )

      expect(executeSpy).not.toHaveBeenCalled()
      expect(yielded[0]).toEqual({
        type: 'tool_result',
        toolCallId: 'tc1',
        result: 'manual result',
      })
      // The tool_call part now carries the manual result
      expect(countResolvedToolCalls(messages)).toBe(1)
    })

    it('resolves with type=deny by writing an isError tool_result', async () => {
      const round2: StreamEvent[] = [
        { type: 'text_delta', text: 'understood' },
        { type: 'finish', finishReason: 'stop' },
      ]
      const transport = createMockTransport([round2])
      const tools: Tool[] = [
        defineTool({
          name: 'deploy',
          description: 'deploy',
          parameters: { type: 'object', properties: {} },
          execute: async () => ({ type: 'result', content: 'should not run' }),
        }),
      ]
      const messages = suspendedHistory()

      const yielded = await collect(
        runAgentLoop({
          messages,
          transport,
          provider,
          tools,
          resolutions: [{ toolCallId: 'tc1', type: 'deny', message: 'not allowed' }],
        }),
      )

      const toolResult = yielded.find(e => e.type === 'tool_result')
      expect(toolResult).toEqual({
        type: 'tool_result',
        toolCallId: 'tc1',
        result: 'not allowed',
        isError: true,
      })
    })

    it('resolves with type=approve by re-running execute() with ctx.approved=true', async () => {
      const round2: StreamEvent[] = [
        { type: 'text_delta', text: 'shipped' },
        { type: 'finish', finishReason: 'stop' },
      ]
      const transport = createMockTransport([round2])
      const seenApproved: boolean[] = []
      const tools: Tool[] = [
        defineTool({
          name: 'deploy',
          description: 'deploy',
          parameters: { type: 'object', properties: {} },
          execute: async (_args, ctx) => {
            seenApproved.push(ctx.approved === true)
            if (!ctx.approved) {
              return { type: 'suspend', reason: 'permission' }
            }
            return { type: 'result', content: 'ok' }
          },
        }),
      ]
      const messages = suspendedHistory()

      const yielded = await collect(
        runAgentLoop({
          messages,
          transport,
          provider,
          tools,
          resolutions: [{ toolCallId: 'tc1', type: 'approve' }],
        }),
      )

      expect(seenApproved).toEqual([true])
      const toolResult = yielded.find(e => e.type === 'tool_result')
      expect(toolResult).toEqual({ type: 'tool_result', toolCallId: 'tc1', result: 'ok' })
      // The loop continued to round 2 and produced final text
      expect(yielded.find(e => e.type === 'text_delta')).toMatchObject({ text: 'shipped' })
    })

    it('approve that suspends again yields ToolInteractionRequired and exits', async () => {
      const transport = createMockTransport([])
      const tools: Tool[] = [
        defineTool({
          name: 'deploy',
          description: 'deploy',
          parameters: { type: 'object', properties: {} },
          execute: async () => ({
            type: 'suspend',
            reason: 'permission',
            payload: { step: 2 },
          }),
        }),
      ]
      const messages = suspendedHistory()

      const yielded = await collect(
        runAgentLoop({
          messages,
          transport,
          provider,
          tools,
          resolutions: [{ toolCallId: 'tc1', type: 'approve' }],
        }),
      )

      expect(yielded).toEqual([
        {
          type: 'tool_interaction_required',
          toolCallId: 'tc1',
          toolName: 'deploy',
          arguments: '{"env":"prod"}',
          reason: 'permission',
          payload: { step: 2 },
        },
      ])
      // No result was filled — tool_call part is still pending
      expect(countResolvedToolCalls(messages)).toBe(0)
    })
  })
})
