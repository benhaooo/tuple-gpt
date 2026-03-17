import {
  registerBackgroundStreamHandlers,
  type StreamController,
  type StreamRequestOf,
  type StreamServerEventOf,
} from '../utils/ai-stream'
import {
  registerRpcHandlers,
  tabClient,
  type RpcFailure,
} from '../utils/messages'

console.log('Tuple-GPT background script loaded')

function isBilibiliVideoUrl(url?: string): boolean {
  return typeof url === 'string' && url.startsWith('https://www.bilibili.com/video/')
}

function sendStreamError(
  stream: StreamController<
    StreamServerEventOf<'generateAiContent'>,
    { type: 'cancel' }
  >,
  error: string,
): void {
  stream.send({
    type: 'error',
    error,
  })
}

async function handleAiContentGeneration(
  request: StreamRequestOf<'generateAiContent'>,
  stream: StreamController<
    StreamServerEventOf<'generateAiContent'>,
    { type: 'cancel' }
  >,
  port: chrome.runtime.Port,
): Promise<void> {
  const abortController = new AbortController()

  const disposeClientEvents = stream.onClientEvent((event) => {
    if (event.type === 'cancel') {
      abortController.abort()
    }
  })

  port.onDisconnect.addListener(() => {
    abortController.abort()
  })

  try {
    const response = await fetch('https://pikachu.claudecode.love/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': 'sk-8d47de117a1a7e9db9827885b52c0cfef43f33f1462c45893b368d16a0a53367',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 4096,
        messages: [
          { role: 'user', content: request.prompt },
        ],
        stream: true,
      }),
      signal: abortController.signal,
    })

    if (!response.ok) {
      sendStreamError(stream, `API请求失败: ${response.status}`)
      return
    }

    const reader = response.body?.getReader()
    if (!reader) {
      sendStreamError(stream, '无法获取响应流')
      return
    }

    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { value, done } = await reader.read()
      if (done) {
        break
      }

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        if (!line.startsWith('data: ')) {
          continue
        }

        try {
          const jsonText = line.slice(6).trim()
          if (!jsonText) {
            continue
          }

          const data = JSON.parse(jsonText)

          if (data.type === 'content_block_delta' && data.delta?.type === 'text_delta' && data.delta?.text) {
            stream.send({
              type: 'chunk',
              chunk: data.delta.text,
            })
          }
        }
        catch (error) {
          console.error('解析流数据失败', error, line)
        }
      }
    }

    stream.send({ type: 'done' })
  }
  catch (error) {
    if (!abortController.signal.aborted) {
      sendStreamError(
        stream,
        error instanceof Error ? error.message : '处理API请求失败',
      )
    }
  }
  finally {
    disposeClientEvents()
    stream.close()
  }
}

registerRpcHandlers({
  openOptionsPage() {
    chrome.runtime.openOptionsPage()

    return { success: true }
  },

  async transcribeBilibiliAudio(data, { sender }) {
    const tabId = sender.tab?.id

    if (!tabId) {
      return {
        success: false,
        error: '无法获取当前标签页',
      } satisfies RpcFailure
    }

    return tabClient.transcribeBilibiliAudio(tabId, data)
  },
})

registerBackgroundStreamHandlers({
  generateAiContent(request, stream, context) {
    return handleAiContentGeneration(request, stream, context.port)
  },
})

chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (!changeInfo.url || !isBilibiliVideoUrl(changeInfo.url)) {
    return
  }

  void tabClient.notifyUrlChanged(tabId, { url: changeInfo.url }).catch((error) => {
    console.debug('URL change notification skipped:', error)
  })
})

chrome.action.onClicked.addListener(() => {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })
})
