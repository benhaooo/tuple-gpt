import { onBeforeUnmount, ref } from 'vue'
import { marked } from 'marked'
import { aiStreamClient } from '@/utils/ai-stream'

export interface AIContentOptions {
  processLinks?: boolean
}

export function useAIContent(options: AIContentOptions = {}) {
  const content = ref('')
  const isGenerating = ref(false)
  const error = ref('')
  const copySuccess = ref(false)
  let activeStream: ReturnType<typeof aiStreamClient.generateAiContent> | null = null

  const stopActiveStream = () => {
    if (!activeStream) {
      return
    }

    activeStream.send({ type: 'cancel' })
    activeStream.close()
    activeStream = null
  }

  const parsedContent = () => {
    if (!content.value) {
      return ''
    }

    const parsed = marked.parse(content.value, { async: false }) as string

    if (options.processLinks) {
      return parsed.replace(/<a href="#"/g, '<a href="#" class="time-link"')
    }

    return parsed
  }

  const generateContent = async (prompt: string): Promise<string> => {
    stopActiveStream()

    isGenerating.value = true
    error.value = ''
    content.value = ''

    const stream = aiStreamClient.generateAiContent({ prompt })
    activeStream = stream

    try {
      for await (const event of stream) {
        if (event.type === 'chunk') {
          content.value += event.chunk
          continue
        }

        if (event.type === 'error') {
          throw new Error(event.error)
        }

        if (event.type === 'done') {
          if (options.processLinks) {
            content.value = processOverviewLinks(content.value)
          }

          return content.value
        }
      }

      if (options.processLinks) {
        content.value = processOverviewLinks(content.value)
      }

      return content.value
    }
    catch (streamError) {
      console.error('处理API请求失败:', streamError)
      error.value = streamError instanceof Error ? streamError.message : '生成失败'
      throw streamError
    }
    finally {
      if (activeStream === stream) {
        activeStream = null
      }

      stream.close()
      isGenerating.value = false
    }
  }

  const processOverviewLinks = (markdownContent: string) => {
    return markdownContent.replace(/\[(.*?)\]\((\d+:\d+(?::\d+)?)\)/g, (_match, title, time) => {
      return `<a href="#" class="time-link" data-time="${time}">${title}</a>`
    })
  }

  const copyToClipboard = async (text: string): Promise<void> => {
    try {
      await navigator.clipboard.writeText(text)
      copySuccess.value = true

      setTimeout(() => {
        copySuccess.value = false
      }, 2000)
    }
    catch (clipboardError) {
      console.error('复制失败:', clipboardError)
      throw clipboardError
    }
  }

  onBeforeUnmount(() => {
    stopActiveStream()
  })

  return {
    content,
    isGenerating,
    error,
    copySuccess,
    parsedContent,
    generateContent,
    copyToClipboard,
  }
}
