export interface SSEEvent {
  event?: string
  data: string
  id?: string
}

/**
 * Parses a ReadableStream of SSE bytes into an async iterable of SSE events.
 * Handles standard SSE format: `event:`, `data:`, `id:` fields separated by double newlines.
 */
export async function* parseSSE(
  stream: ReadableStream<Uint8Array>,
  signal?: AbortSignal,
): AsyncGenerator<SSEEvent> {
  const reader = stream.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  try {
    while (true) {
      if (signal?.aborted) break

      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })

      const parts = buffer.split('\n\n')
      // Keep the last incomplete chunk in the buffer
      buffer = parts.pop()!

      for (const part of parts) {
        if (!part.trim()) continue

        let event: string | undefined
        let data = ''
        let id: string | undefined

        for (const line of part.split('\n')) {
          if (line.startsWith('event:')) {
            event = line.slice(6).trim()
          } else if (line.startsWith('data:')) {
            data += (data ? '\n' : '') + line.slice(5).trim()
          } else if (line.startsWith('id:')) {
            id = line.slice(3).trim()
          }
          // Lines starting with ':' are comments, skip them
        }

        if (data) {
          yield { event, data, id }
        }
      }
    }
  } finally {
    reader.releaseLock()
  }
}
