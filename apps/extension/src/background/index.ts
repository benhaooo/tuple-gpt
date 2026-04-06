import {
  registerBackgroundStreamHandlers,
} from '../utils/ai-stream'
import {
  registerRpcHandlers,
  tabClient,
} from '../utils/messages'
import { ChatClient } from '@tuple-gpt/ai-core'

console.log('Tuple-GPT background script loaded')

function isBilibiliVideoUrl(url?: string): boolean {
  return typeof url === 'string' && url.startsWith('https://www.bilibili.com/video/')
}

registerRpcHandlers({
  openOptionsPage() {
    chrome.runtime.openOptionsPage()
  },

  async transcribeBilibiliAudio(data, { sender }) {
    const tabId = sender.tab?.id

    if (!tabId) {
      throw new Error('无法获取当前标签页')
    }

    const response = await tabClient.transcribeBilibiliAudio(tabId, data)

    if (!response.success) {
      throw new Error(response.error)
    }

    return response.data
  },
})

registerBackgroundStreamHandlers({
  async generateAiContent(request, stream, { port }) {
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
      const events = ChatClient.chat(
        [{ role: 'user', content: request.prompt }],
        {
          provider: {
            type: 'anthropic',
            apiKey: 'sk-ae9864f2181002d22bf44f755055e0209dd062e8bccff88c028b6a8756d8c723',
            baseUrl: 'https://pikachu.claudecode.love/v1',
            model: 'claude-sonnet-4-5-20250929',
          },
          defaults: {
            maxTokens: 4096,
            signal: abortController.signal,
          },
        },
      )

      for await (const event of events) {
        if (event.type === 'text_delta') {
          stream.send({ type: 'chunk', chunk: event.text })
        } else if (event.type === 'error') {
          stream.send({
            type: 'error',
            error: event.error.message,
          })
          return
        }
      }

      stream.send({ type: 'done' })
    }
    catch (error) {
      if (!abortController.signal.aborted) {
        stream.send({
          type: 'error',
          error: error instanceof Error ? error.message : '处理API请求失败',
        })
      }
    }
    finally {
      disposeClientEvents()
      stream.close()
    }
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
