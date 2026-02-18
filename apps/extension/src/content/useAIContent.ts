import { ref, type Ref } from 'vue'
import { marked } from 'marked'

export interface AIContentOptions {
  processLinks?: boolean
}

export function useAIContent(options: AIContentOptions = {}) {
  const content = ref('')
  const isGenerating = ref(false)
  const error = ref('')
  const copySuccess = ref(false)

  // 解析Markdown内容
  const parsedContent = () => {
    // 如果内容为空，返回空字符串
    if (!content.value) return ''
    
    // 使用 marked 解析 Markdown 内容
    // 使用正确的 API 调用方式
    const parsed = marked.parse(content.value, { async: false }) as string
    
    // 如果需要处理链接（概览部分），则进行特殊处理
    if (options.processLinks) {
      // 这里不需要再次处理，因为已经在 generateContent 中处理过了
      // 但我们可以确保链接有正确的类名
      return parsed.replace(/<a href="#"/g, '<a href="#" class="time-link"')
    }
    
    return parsed
  }

  // 使用流式API处理文本内容
  const generateContent = async (prompt: string): Promise<string> => {
    try {
      isGenerating.value = true
      content.value = '' // 清空之前的内容

      // 创建一个 Promise 来处理流式响应
      return new Promise((resolve, reject) => {
        // 监听来自 background 的流式数据
        const messageListener = (message: any) => {
          if (message.type === 'AI_CONTENT_CHUNK') {
            content.value += message.chunk
          } else if (message.type === 'AI_CONTENT_COMPLETE') {
            // 移除监听器
            chrome.runtime.onMessage.removeListener(messageListener)

            // 当内容是概览时，处理链接
            if (options.processLinks) {
              content.value = processOverviewLinks(content.value)
            }

            isGenerating.value = false
            resolve(content.value)
          }
        }

        // 添加监听器
        chrome.runtime.onMessage.addListener(messageListener)

        // 发送请求到 background script
        chrome.runtime.sendMessage(
          {
            type: 'GENERATE_AI_CONTENT',
            prompt: prompt
          },
          (response) => {
            if (response && !response.success) {
              chrome.runtime.onMessage.removeListener(messageListener)
              isGenerating.value = false
              reject(new Error(response.error || 'API请求失败'))
            }
          }
        )
      })
    } catch (error) {
      console.error('处理API请求失败:', error)
      isGenerating.value = false
      throw error
    }
  }

  // 处理概览部分 - 将时间标记转换为可点击链接
  const processOverviewLinks = (content: string) => {
    // 替换 [标题](时间点) 格式为可点击的链接
    return content.replace(/\[(.*?)\]\((\d+:\d+(?::\d+)?)\)/g, (match, title, time) => {
      return `<a href="#" class="time-link" data-time="${time}">${title}</a>`
    })
  }

  // 复制文本到剪贴板
  const copyToClipboard = async (text: string): Promise<void> => {
    try {
      await navigator.clipboard.writeText(text)
      copySuccess.value = true
      setTimeout(() => {
        copySuccess.value = false
      }, 2000)
      return Promise.resolve()
    } catch (err) {
      console.error('复制失败:', err)
      return Promise.reject(err)
    }
  }

  return {
    content,
    isGenerating,
    error,
    copySuccess,
    parsedContent,
    generateContent,
    copyToClipboard
  }
} 