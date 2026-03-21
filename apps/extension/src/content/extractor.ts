import { Readability } from '@mozilla/readability'
import { registerRpcHandlers } from '@/utils/messages'

registerRpcHandlers({
  extractPageContent() {
    const doc = new DOMParser().parseFromString(document.documentElement.outerHTML, 'text/html')
    const reader = new Readability(doc)
    const article = reader.parse()

    if (article) {
      return {
        title: article.title || document.title,
        content: article.textContent || '',
        excerpt: article.excerpt || '',
      }
    }

    // Readability 无法解析时，回退到 innerText
    const fallbackDoc = new DOMParser().parseFromString(document.documentElement.outerHTML, 'text/html')
    fallbackDoc.querySelectorAll('script, style, noscript, iframe').forEach(el => el.remove())

    return {
      title: document.title,
      content: fallbackDoc.body?.innerText || '',
      excerpt: '',
    }
  },
})
