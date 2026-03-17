import { Readability } from '@mozilla/readability'
import { registerRpcHandlers } from '@/utils/messages'

registerRpcHandlers({
  extractPageContent() {
    try {
      const doc = new DOMParser().parseFromString(document.documentElement.outerHTML, 'text/html')
      const reader = new Readability(doc)
      const article = reader.parse()

      if (article) {
        return {
          success: true,
          data: {
            title: article.title || document.title,
            content: article.textContent || '',
            excerpt: article.excerpt || '',
          },
        }
      }

      // Readability 无法解析时，回退到 innerText
      const fallbackDoc = new DOMParser().parseFromString(document.documentElement.outerHTML, 'text/html')
      fallbackDoc.querySelectorAll('script, style, noscript, iframe').forEach(el => el.remove())

      return {
        success: true,
        data: {
          title: document.title,
          content: fallbackDoc.body?.innerText || '',
          excerpt: '',
        },
      }
    }
    catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '提取失败',
      }
    }
  },
})
