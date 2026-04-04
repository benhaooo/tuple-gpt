import type { PipelineOutput, StreamEvent, ProviderConfig } from '../types'
import type { Transport } from '../transport/transport'

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

export function createReadableStream(text: string, chunkSize = text.length): ReadableStream<Uint8Array> {
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
