import {
  registerBackgroundStreamHandlers,
} from '../utils/ai-stream'
import {
  registerRpcHandlers,
  tabClient,
} from '../utils/messages'

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
      const response = await fetch('https://pikachu.claudecode.love/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': 'sk-ae9864f2181002d22bf44f755055e0209dd062e8bccff88c028b6a8756d8c723',
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
        stream.send({ type: 'error', error: `API请求失败: ${response.status}` })
        return
      }

      const reader = response.body?.getReader()
      if (!reader) {
        stream.send({ type: 'error', error: '无法获取响应流' })
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
