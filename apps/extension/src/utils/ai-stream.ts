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

type StartArgs<K extends AiStreamKey> =
  [StreamRequestOf<K>] extends [undefined] ? [] : [StreamRequestOf<K>]

type StreamStartMessage<K extends AiStreamKey> =
  [StreamRequestOf<K>] extends [undefined]
    ? { type: 'start' }
    : { type: 'start'; data: StreamRequestOf<K> }

type StreamClientMessage<K extends AiStreamKey> =
  | StreamStartMessage<K>
  | StreamClientEventOf<K>

type StreamHandlerContext = {
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
  onEvent(listener: (event: ServerEvent) => void): () => void
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

      while (resolvers.length > 0) {
        const resolve = resolvers.shift()
        resolve?.({ value: undefined as never, done: true })
      }
    },

    next(): Promise<IteratorResult<T>> {
      if (items.length > 0) {
        return Promise.resolve({ value: items.shift()!, done: false })
      }

      if (closed) {
        return Promise.resolve({ value: undefined as never, done: true })
      }

      return new Promise((resolve) => {
        resolvers.push(resolve)
      })
    },
  }
}

// ── 内部工具 ──

function buildStartMessage<K extends AiStreamKey>(
  args: StartArgs<K>,
): StreamStartMessage<K> {
  if (args.length === 0) {
    return { type: 'start' } as StreamStartMessage<K>
  }

  return {
    type: 'start',
    data: args[0],
  } as StreamStartMessage<K>
}

// ── Client 侧 ──

export function openBackgroundStream<K extends AiStreamKey>(
  key: K,
  ...args: StartArgs<K>
): TypedStream<StreamServerEventOf<K>, StreamClientEventOf<K>> {
  const port = chrome.runtime.connect({ name: key })

  const queue = createAsyncQueue<StreamServerEventOf<K>>()
  const listeners = new Set<(event: StreamServerEventOf<K>) => void>()
  let closed = false

  port.onMessage.addListener((event: StreamServerEventOf<K>) => {
    queue.push(event)
    listeners.forEach(listener => listener(event))
  })

  port.onDisconnect.addListener(() => {
    closed = true
    queue.close()
  })

  port.postMessage(buildStartMessage(args))

  return {
    onEvent(listener) {
      listeners.add(listener)

      return () => {
        listeners.delete(listener)
      }
    },

    send(event) {
      if (closed) {
        return
      }

      port.postMessage(event)
    },

    close() {
      if (closed) {
        return
      }

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

// ── Handler 注册 ──

const streamKeys = Object.keys({
  generateAiContent: true,
} satisfies Record<AiStreamKey, true>) as AiStreamKey[]

export function registerBackgroundStreamHandlers(handlers: StreamHandlers): void {
  const validKeys = new Set<string>(streamKeys)

  chrome.runtime.onConnect.addListener((port) => {
    if (!validKeys.has(port.name)) {
      return
    }

    const key = port.name as AiStreamKey
    const handler = handlers[key] as ((
      request: unknown,
      stream: StreamController<unknown, unknown>,
      context: StreamHandlerContext,
    ) => void | Promise<void>) | undefined

    if (!handler) {
      return
    }

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
        if (!message || message.type !== 'start') {
          port.postMessage({ type: 'error', error: 'First stream message must be start' })
          port.disconnect()
          return
        }

        started = true
        const request = 'data' in message ? message.data : undefined

        Promise.resolve(
          handler(
            request,
            stream,
            { port },
          ),
        ).catch((error) => {
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
  [K in AiStreamKey]: (...args: StartArgs<K>) =>
    TypedStream<StreamServerEventOf<K>, StreamClientEventOf<K>>
}

const baseClient = new Proxy({} as AiStreamClient, {
  get(_, key: string) {
    return (...args: unknown[]) =>
      openBackgroundStream(key as AiStreamKey, ...(args as [never]))
  },
})

export const aiStreamClient = {
  ...baseClient,

  async *generateAiContentText(request: StreamRequestOf<'generateAiContent'>) {
    const stream = openBackgroundStream('generateAiContent', request)

    try {
      for await (const event of stream) {
        if (event.type === 'chunk') {
          yield event.chunk
          continue
        }

        if (event.type === 'error') {
          throw new Error(event.error)
        }

        if (event.type === 'done') {
          return
        }
      }
    }
    finally {
      stream.close()
    }
  },
}
