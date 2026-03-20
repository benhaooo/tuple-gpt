import type { TranscriptionResult } from './audioUtils'
import type { SubtitleItem } from './subtitlesApi'

export type RpcFailure = {
  success: false
  error: string
}

export type RpcAck = {
  success: true
} | RpcFailure

export type RpcResult<T> = {
  success: true
  data: T
} | RpcFailure

export interface PageContentPayload {
  title: string
  content: string
  excerpt: string
}

export interface BilibiliAudioTranscriptionRequest {
  whisperApiKey: string
  whisperApiEndpoint?: string
}

export interface UrlChangePayload {
  url: string
}

export interface BilibiliAudioTranscriptionPayload {
  transcriptionResult: TranscriptionResult
  subtitles: SubtitleItem[]
}

// ── Schema：新增 RPC 只需在此处添加一条 ──

export interface RpcSchema {
  extractPageContent: {
    req: undefined
    res: RpcResult<PageContentPayload>
  }
  transcribeBilibiliAudio: {
    req: BilibiliAudioTranscriptionRequest
    res: RpcResult<BilibiliAudioTranscriptionPayload>
  }
  notifyUrlChanged: {
    req: UrlChangePayload
    res: RpcAck
  }
  openOptionsPage: {
    req: undefined
    res: RpcAck
  }
}

// ── 类型工具 ──

export type RpcKey = keyof RpcSchema
export type RequestOf<K extends RpcKey> = RpcSchema[K]['req']
export type ResponseOf<K extends RpcKey> = RpcSchema[K]['res']
export type RequestArgs<K extends RpcKey> =
  [RequestOf<K>] extends [undefined] ? [] : [RequestOf<K>]

type RpcMessage<K extends RpcKey> =
  [RequestOf<K>] extends [undefined]
    ? { method: K }
    : { method: K; data: RequestOf<K> }

type RpcHandlerContext = {
  sender: chrome.runtime.MessageSender
}

export type RpcHandlers = {
  [K in RpcKey]?: (
    payload: RequestOf<K>,
    context: RpcHandlerContext,
  ) => Promise<ResponseOf<K>> | ResponseOf<K>
}

type UnknownRpcHandler = (
  payload: unknown,
  context: RpcHandlerContext,
) => Promise<unknown> | unknown

// ── 内部工具 ──

function buildMessage<K extends RpcKey>(
  key: K,
  ...args: RequestArgs<K>
): RpcMessage<K> {
  if (args.length === 0) {
    return { method: key } as RpcMessage<K>
  }

  return {
    method: key,
    data: args[0],
  } as RpcMessage<K>
}

function toRpcFailure(error: unknown): RpcFailure {
  return {
    success: false,
    error: error instanceof Error ? error.message : String(error),
  }
}

function getChromeRuntimeError(): string | undefined {
  return chrome.runtime.lastError?.message
}

// ── 发送函数 ──

export function sendToBackground<K extends RpcKey>(
  key: K,
  ...args: RequestArgs<K>
): Promise<ResponseOf<K>> {
  const message = buildMessage(key, ...args)

  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(message, (response: ResponseOf<K>) => {
      const runtimeError = getChromeRuntimeError()
      if (runtimeError) {
        reject(new Error(runtimeError))
        return
      }

      resolve(response)
    })
  })
}

export function sendToTab<K extends RpcKey>(
  tabId: number,
  key: K,
  ...args: RequestArgs<K>
): Promise<ResponseOf<K>> {
  const message = buildMessage(key, ...args)

  return new Promise((resolve, reject) => {
    chrome.tabs.sendMessage(tabId, message, (response: ResponseOf<K>) => {
      const runtimeError = getChromeRuntimeError()
      if (runtimeError) {
        reject(new Error(runtimeError))
        return
      }

      resolve(response)
    })
  })
}

// ── Handler 注册 ──

export function registerRpcHandlers(handlers: RpcHandlers): void {
  chrome.runtime.onMessage.addListener((message: unknown, sender, sendResponse) => {
    if (!message || typeof message !== 'object' || !('method' in message)) {
      return false
    }

    const { method } = message as { method: string }
    const handler = handlers[method as RpcKey] as UnknownRpcHandler | undefined

    if (!handler) {
      return false
    }

    const payload = 'data' in (message as object)
      ? (message as Record<string, unknown>).data
      : undefined

    Promise.resolve(
      handler(payload, { sender }),
    )
      .then((response) => {
        sendResponse(response)
      })
      .catch((error) => {
        sendResponse(toRpcFailure(error))
      })

    return true
  })
}

// ── Proxy Client ──

type BackgroundClient = {
  [K in RpcKey]: (...args: RequestArgs<K>) => Promise<ResponseOf<K>>
}

type TabClient = {
  [K in RpcKey]: (tabId: number, ...args: RequestArgs<K>) => Promise<ResponseOf<K>>
}

export const backgroundClient = new Proxy({} as BackgroundClient, {
  get(_, key: string) {
    return (...args: unknown[]) =>
      sendToBackground(key as RpcKey, ...(args as [any]))
  },
})

export const tabClient = new Proxy({} as TabClient, {
  get(_, key: string) {
    return (tabId: number, ...args: unknown[]) =>
      sendToTab(tabId, key as RpcKey, ...(args as [any]))
  },
})
