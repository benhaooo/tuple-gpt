import { registerBackgroundStreamHandlers } from '../utils/ai-stream'
import { registerRpcHandlers, tabClient } from '../utils/messages'
import { chat } from '@tuple-gpt/ai-core'
import { toProviderConfig, type Provider } from '@tuple-gpt/chat-core'

console.log('Tuple-GPT background script loaded')

function isBilibiliVideoUrl(url?: string): boolean {
  return typeof url === 'string' && url.startsWith('https://www.bilibili.com/video/')
}

async function loadProvider(providerId: string): Promise<Provider | undefined> {
  const result = await chrome.storage.sync.get('providers')
  const providers = result.providers?.providers as Provider[] | undefined
  return providers?.find(p => p.id === providerId)
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

    const disposeClientEvents = stream.onClientEvent(event => {
      if (event.type === 'cancel') {
        abortController.abort()
      }
    })

    port.onDisconnect.addListener(() => {
      abortController.abort()
    })

    try {
      const provider = await loadProvider(request.model.providerId)
      if (!provider) {
        stream.send({ type: 'error', error: '所选模型对应的服务商已被删除，请在选项页重新选择。' })
        return
      }
      if (!provider.apiKey) {
        stream.send({ type: 'error', error: `服务商「${provider.name}」未配置 API Key。` })
        return
      }

      const events = chat([{ role: 'user', content: [{ type: 'text', text: request.prompt }] }], {
        provider: toProviderConfig(provider, request.model.model),
        options: {
          maxTokens: 4096,
          signal: abortController.signal,
        },
      })

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
    } catch (error) {
      if (!abortController.signal.aborted) {
        stream.send({
          type: 'error',
          error: error instanceof Error ? error.message : '处理API请求失败',
        })
      }
    } finally {
      disposeClientEvents()
      stream.close()
    }
  },
})

chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (!changeInfo.url || !isBilibiliVideoUrl(changeInfo.url)) {
    return
  }

  void tabClient.notifyUrlChanged(tabId, { url: changeInfo.url }).catch(error => {
    console.debug('URL change notification skipped:', error)
  })
})

chrome.action.onClicked.addListener(() => {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })
})
