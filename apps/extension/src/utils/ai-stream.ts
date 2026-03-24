// ── Schema：新增 Stream 只需在此处添加一条 ──

export interface AiStreamSchema {
  generateAiContent: {
    req: {
      prompt: string
    }
    serverEvent:
      | { type: 'chunk'; chunk: string }
      | { type: 'done' }
      | { type: 'error'; error: string }
    clientEvent:
      | { type: 'cancel' }
  }
}

// ── 类型工具 ──

export type AiStreamKey = keyof AiStreamSchema
export type StreamRequestOf<K extends AiStreamKey> = AiStreamSchema[K]['req']
export type StreamServerEventOf<K extends AiStreamKey> = AiStreamSchema[K]['serverEvent']
export type StreamClientEventOf<K extends AiStreamKey> = AiStreamSchema[K]['clientEvent']

type StreamClientMessage<K extends AiStreamKey> =
  | { type: 'start'; data: StreamRequestOf<K> }
  | StreamClientEventOf<K>

export type StreamHandlerContext = {
  port: chrome.runtime.Port
}

export type StreamController<ServerEvent, ClientEvent> = {
  send(event: ServerEvent): void
  onClientEvent(listener: (event: ClientEvent) => void): () => void
  close(): void
}

type StreamHandlers = {
  [K in AiStreamKey]?: (
    request: StreamRequestOf<K>,
    stream: StreamController<StreamServerEventOf<K>, StreamClientEventOf<K>>,
    context: StreamHandlerContext,
  ) => void | Promise<void>
}

export interface TypedStream<ServerEvent, ClientEvent> extends AsyncIterable<ServerEvent> {
  send(event: ClientEvent): void
  close(): void
}

// ── AsyncQueue ──

function createAsyncQueue<T>() {
  const items: T[] = []
  const resolvers: Array<(result: IteratorResult<T>) => void> = []
  let closed = false

  return {
    push(item: T) {
      if (closed) {
        return
      }

      const resolve = resolvers.shift()
      if (resolve) {
        resolve({ value: item, done: false })
        return
      }

      items.push(item)
    },

    close() {
      if (closed) {
        return
      }

      closed = true

      while (resolvers.length) {
        const resolve = resolvers.shift()
        resolve?.({ value: undefined, done: true })
      }
    },

    next(): Promise<IteratorResult<T>> {
      if (items.length) {
        return Promise.resolve({ value: items.shift()!, done: false })
      }

      if (closed) {
        return Promise.resolve({ value: undefined, done: true })
      }

      return new Promise((resolve) => {
        resolvers.push(resolve)
      })
    },
  }
}

// ── Client 侧 ──

export function openBackgroundStream<K extends AiStreamKey>(
  key: K,
  request: StreamRequestOf<K>,
): TypedStream<StreamServerEventOf<K>, StreamClientEventOf<K>> {
  const port = chrome.runtime.connect({ name: key })

  const queue = createAsyncQueue<StreamServerEventOf<K>>()
  let closed = false

  port.onMessage.addListener((event) => {
    queue.push(event)
  })

  port.onDisconnect.addListener(() => {
    closed = true
    queue.close()
  })

  port.postMessage({ type: 'start', data: request })

  return {
    send(event) {
      if (closed) return

      port.postMessage(event)
    },

    close() {
      if (closed) return

      closed = true
      port.disconnect()
      queue.close()
    },

    async *[Symbol.asyncIterator]() {
      while (true) {
        const result = await queue.next()

        if (result.done) {
          return
        }

        yield result.value
      }
    },
  }
}

export function registerBackgroundStreamHandlers(handlers: StreamHandlers): void {
  chrome.runtime.onConnect.addListener((port) => {
    const key = port.name as AiStreamKey
    const handler = handlers[key] as any
    if (!handler) return

    const clientListeners = new Set<(event: unknown) => void>()
    let started = false

    const stream: StreamController<unknown, unknown> = {
      send(event) {
        port.postMessage(event)
      },

      onClientEvent(listener) {
        clientListeners.add(listener)

        return () => {
          clientListeners.delete(listener)
        }
      },

      close() {
        port.disconnect()
      },
    }

    port.onMessage.addListener((message: StreamClientMessage<typeof key>) => {
      if (!started) {
        if (message?.type !== 'start') {
          port.postMessage({ type: 'error', error: 'First stream message must be start' })
          port.disconnect()
          return
        }

        started = true
        const request = message.data

        Promise.resolve()
          .then(() => handler(
            request,
            stream,
            { port },
          ))
          .catch((error) => {
            port.postMessage({
              type: 'error',
              error: error instanceof Error ? error.message : String(error),
            })
            port.disconnect()
          })

        return
      }

      clientListeners.forEach(listener => listener(message))
    })
  })
}

// ── Proxy Client ──

type AiStreamClient = {
  [K in AiStreamKey]: (request: StreamRequestOf<K>) =>
    TypedStream<StreamServerEventOf<K>, StreamClientEventOf<K>>
}

const baseClient = new Proxy({} as AiStreamClient, {
  get(_, key) {
    return (request: unknown) =>
      openBackgroundStream(key as AiStreamKey, request as StreamRequestOf<AiStreamKey>)
  },
})

export const aiStreamClient = baseClient
