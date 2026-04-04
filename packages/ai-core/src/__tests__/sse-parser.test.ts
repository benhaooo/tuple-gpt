import { describe, it, expect } from 'vitest'
import { parseSSE } from '../transport/sse-parser'
import { createReadableStream, collect } from './helpers'

describe('parseSSE', () => {
  it('parses a single event', async () => {
    const stream = createReadableStream('data: hello\n\n')
    const events = await collect(parseSSE(stream))
    expect(events).toEqual([{ event: undefined, data: 'hello', id: undefined }])
  })

  it('parses multiple events', async () => {
    const stream = createReadableStream('data: one\n\ndata: two\n\n')
    const events = await collect(parseSSE(stream))
    expect(events).toHaveLength(2)
    expect(events[0].data).toBe('one')
    expect(events[1].data).toBe('two')
  })

  it('concatenates multi-line data fields', async () => {
    const stream = createReadableStream('data: line1\ndata: line2\n\n')
    const events = await collect(parseSSE(stream))
    expect(events[0].data).toBe('line1\nline2')
  })

  it('skips comment lines', async () => {
    const stream = createReadableStream(': this is a comment\ndata: value\n\n')
    const events = await collect(parseSSE(stream))
    expect(events).toHaveLength(1)
    expect(events[0].data).toBe('value')
  })

  it('does not yield events with empty data', async () => {
    const stream = createReadableStream('event: ping\n\ndata: real\n\n')
    const events = await collect(parseSSE(stream))
    expect(events).toHaveLength(1)
    expect(events[0].data).toBe('real')
  })

  it('handles chunked delivery correctly', async () => {
    const raw = 'data: chunk-test\n\n'
    const stream = createReadableStream(raw, 3) // 3-byte chunks
    const events = await collect(parseSSE(stream))
    expect(events).toHaveLength(1)
    expect(events[0].data).toBe('chunk-test')
  })

  it('stops when AbortSignal is aborted', async () => {
    const controller = new AbortController()
    // create a stream that yields two events separated by time
    const raw = 'data: first\n\ndata: second\n\n'
    const stream = createReadableStream(raw, 5) // small chunks to force multiple reads
    controller.abort()
    const events = await collect(parseSSE(stream, controller.signal))
    // Should get no events since signal is already aborted
    expect(events).toEqual([])
  })

  it('handles an empty stream', async () => {
    const stream = createReadableStream('')
    const events = await collect(parseSSE(stream))
    expect(events).toEqual([])
  })

  it('handles stream without trailing newline', async () => {
    // The last event has no trailing \n\n, so it stays in the buffer and is never yielded
    const stream = createReadableStream('data: complete\n\ndata: incomplete')
    const events = await collect(parseSSE(stream))
    expect(events).toHaveLength(1)
    expect(events[0].data).toBe('complete')
  })

  it('parses event and id fields', async () => {
    const stream = createReadableStream('event: message\nid: 42\ndata: payload\n\n')
    const events = await collect(parseSSE(stream))
    expect(events[0]).toEqual({ event: 'message', data: 'payload', id: '42' })
  })
})
