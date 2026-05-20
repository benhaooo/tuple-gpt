import type { PipelineOutput, StreamEvent, ProviderConfig } from '../types'
import type { Transport } from '../transport/transport'
import type { ToolRunner } from '../agent/tool-runner'
import type { ToolExecutor } from '../agent/tool-executor'
import { executeToolCall } from '../agent/tool-executor'

export function createMockInput(overrides?: Partial<PipelineOutput>): PipelineOutput {
  return {
    messages: [],
    provider: { type: 'openai', apiKey: 'test', model: 'gpt-4' } satisfies ProviderConfig,
    ...overrides,
  }
}

export function createMockTransport(eventGroups: StreamEvent[][]): Transport {
  let callIndex = 0
  return {
    async *stream() {
      const events = eventGroups[callIndex++] ?? []
      for (const event of events) {
        yield event
      }
    },
  }
}

export function createReadableStream(
  text: string,
  chunkSize = text.length,
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder()
  const bytes = encoder.encode(text)
  let offset = 0
  return new ReadableStream({
    pull(controller) {
      if (offset >= bytes.length) {
        controller.close()
        return
      }
      const end = Math.min(offset + chunkSize, bytes.length)
      controller.enqueue(bytes.slice(offset, end))
      offset = end
    },
  })
}

export async function collect<T>(iter: AsyncIterable<T>): Promise<T[]> {
  const result: T[] = []
  for await (const item of iter) {
    result.push(item)
  }
  return result
}

/**
 * Test helper: turn a flat ToolExecutor into a ToolRunner. Real production
 * code uses chat-core's DefaultToolRunner; in unit tests we keep the executor
 * shorthand and adapt it here to avoid pulling in chat-core.
 */
export function executorRunner(executor: ToolExecutor): ToolRunner {
  return {
    async run(name, args, ctx) {
      if (!executor[name]) return { kind: 'unknown' }
      const res = await executeToolCall(executor, name, args, ctx)
      return { kind: 'resolved', result: res.result, isError: res.isError }
    },
  }
}
