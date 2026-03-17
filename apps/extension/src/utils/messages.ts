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

export interface RpcSchema {
  extractPageContent: {
    type: 'EXTRACT_PAGE_CONTENT'
    req: undefined
    res: RpcResult<PageContentPayload>
  }
  transcribeBilibiliAudio: {
    type: 'TRANSCRIBE_BILIBILI_AUDIO'
    req: BilibiliAudioTranscriptionRequest
    res: RpcAck
  }
  notifyUrlChanged: {
    type: 'URL_CHANGE_NOTIFICATION'
    req: UrlChangePayload
    res: RpcAck
  }
  openOptionsPage: {
    type: 'OPEN_OPTIONS_PAGE'
    req: undefined
    res: RpcAck
  }
}

export const rpcProtocol = {
  extractPageContent: { type: 'EXTRACT_PAGE_CONTENT' },
  transcribeBilibiliAudio: { type: 'TRANSCRIBE_BILIBILI_AUDIO' },
  notifyUrlChanged: { type: 'URL_CHANGE_NOTIFICATION' },
  openOptionsPage: { type: 'OPEN_OPTIONS_PAGE' },
} as const satisfies {
  [K in keyof RpcSchema]: { type: RpcSchema[K]['type'] }
}

export type RpcKey = keyof RpcSchema
export type RequestOf<K extends RpcKey> = RpcSchema[K]['req']
export type ResponseOf<K extends RpcKey> = RpcSchema[K]['res']
export type RequestArgs<K extends RpcKey> =
  [RequestOf<K>] extends [undefined] ? [] : [RequestOf<K>]

export type RpcMessage<K extends RpcKey> =
  [RequestOf<K>] extends [undefined]
    ? { type: RpcSchema[K]['type'] }
    : { type: RpcSchema[K]['type']; data: RequestOf<K> }

export type AnyRpcMessage = {
  [K in RpcKey]: RpcMessage<K>
}[RpcKey]

type RpcType = RpcSchema[RpcKey]['type']

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

export const transcriptionWindowMessageType = {
  complete: 'AUDIO_TRANSCRIPTION_COMPLETE',
  error: 'AUDIO_TRANSCRIPTION_ERROR',
} as const

export interface AudioTranscriptionCompleteWindowMessage {
  type: typeof transcriptionWindowMessageType.complete
  data: {
    transcriptionResult: TranscriptionResult
    subtitles: SubtitleItem[]
  }
}

export interface AudioTranscriptionErrorWindowMessage {
  type: typeof transcriptionWindowMessageType.error
  data: {
    error: string
  }
}

export type AudioTranscriptionWindowMessage =
  | AudioTranscriptionCompleteWindowMessage
  | AudioTranscriptionErrorWindowMessage

const rpcKeyByType = Object.fromEntries(
  Object.entries(rpcProtocol).map(([key, value]) => [value.type, key]),
) as Record<RpcType, RpcKey>

function buildMessage<K extends RpcKey>(
  key: K,
  ...args: RequestArgs<K>
): RpcMessage<K> {
  const type = rpcProtocol[key].type

  if (args.length === 0) {
    return { type } as RpcMessage<K>
  }

  return {
    type,
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

export function registerRpcHandlers(handlers: RpcHandlers): void {
  chrome.runtime.onMessage.addListener((message: unknown, sender, sendResponse) => {
    if (!message || typeof message !== 'object' || !('type' in message)) {
      return false
    }

    const messageRecord = message as Record<string, unknown>
    const type = messageRecord.type as RpcType
    const key = rpcKeyByType[type]
    const handler = key ? handlers[key] as UnknownRpcHandler | undefined : undefined

    if (!handler) {
      return false
    }

    const payload = Object.prototype.hasOwnProperty.call(messageRecord, 'data')
      ? messageRecord.data
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

export const backgroundClient = {
  openOptionsPage() {
    return sendToBackground('openOptionsPage')
  },

  transcribeBilibiliAudio(data: BilibiliAudioTranscriptionRequest) {
    return sendToBackground('transcribeBilibiliAudio', data)
  },
}

export const tabClient = {
  extractPageContent(tabId: number) {
    return sendToTab(tabId, 'extractPageContent')
  },

  transcribeBilibiliAudio(tabId: number, data: BilibiliAudioTranscriptionRequest) {
    return sendToTab(tabId, 'transcribeBilibiliAudio', data)
  },

  notifyUrlChanged(tabId: number, data: UrlChangePayload) {
    return sendToTab(tabId, 'notifyUrlChanged', data)
  },
}
