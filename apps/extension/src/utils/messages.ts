import type { TranscriptionResult } from './audioUtils'
import type { SubtitleItem } from './subtitlesApi'

export type RpcResponse<T = undefined> =
  | { success: true; data: T }
  | { success: false; error: string }

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
    res: PageContentPayload
  }
  transcribeBilibiliAudio: {
    req: BilibiliAudioTranscriptionRequest
    res: BilibiliAudioTranscriptionPayload
  }
  notifyUrlChanged: {
    req: UrlChangePayload
    res: void
  }
  openOptionsPage: {
    req: undefined
    res: void
  }
}

// ── 类型工具 ──

export type RpcKey = keyof RpcSchema
export type RequestOf<K extends RpcKey> = RpcSchema[K]['req']
export type ResponseOf<K extends RpcKey> = RpcSchema[K]['res']
export type RequestArgs<K extends RpcKey> =
  [RequestOf<K>] extends [undefined] ? [] : [RequestOf<K>]

type RpcMessage<K extends RpcKey> =
  { method: K; data?: RequestOf<K> }

type RpcHandlerContext = {
  sender: chrome.runtime.MessageSender
}

export type RpcHandlers = {
  [K in RpcKey]?: (
    payload: RequestOf<K>,
    context: RpcHandlerContext,
  ) => Promise<ResponseOf<K>> | ResponseOf<K>
}

// ── 内部工具 ──

function buildMessage<K extends RpcKey>(
  key: K,
  ...args: RequestArgs<K>
) {
  return {
    method: key,
    data: args[0],
  } as RpcMessage<K>
}

function toRpcFailure(error: unknown): RpcResponse {
  return {
    success: false,
    error: error instanceof Error ? error.message : String(error),
  }
}

function toRpcSuccess<T>(result: T): RpcResponse<T> {
  return {
    success: true,
    data: result,
  }
}

// ── Handler 注册 ──

export function registerRpcHandlers(handlers: RpcHandlers): void {
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (!message?.method) return false

    const { method, data } = message as { method: RpcKey; data?: unknown }
    const handler = handlers[method] as any

    if (!handler) return false

    Promise.resolve()
      .then(() => handler(data, { sender }))
      .then((result) => {
        sendResponse(toRpcSuccess(result))
      })
      .catch((error) => {
        sendResponse(toRpcFailure(error))
      })

    return true
  })
}

// ── Proxy Client ──

type BackgroundClient = {
  [K in RpcKey]: (...args: RequestArgs<K>) => Promise<RpcResponse<ResponseOf<K>>>
}

type TabClient = {
  [K in RpcKey]: (tabId: number, ...args: RequestArgs<K>) => Promise<RpcResponse<ResponseOf<K>>>
}

export const backgroundClient = new Proxy({} as BackgroundClient, {
  get(_, key) {
    return (...args: unknown[]) =>
      chrome.runtime.sendMessage(
        buildMessage(key as RpcKey, ...(args as [any])),
      ).catch(toRpcFailure)
  },
})

export const tabClient = new Proxy({} as TabClient, {
  get(_, key) {
    return (tabId: number, ...args: unknown[]) =>
      chrome.tabs.sendMessage(
        tabId,
        buildMessage(key as RpcKey, ...(args as [any])),
      ).catch(toRpcFailure)
  },
})
