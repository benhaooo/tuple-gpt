import { Readability } from '@mozilla/readability'

/**
 * 通用页面内容提取 content script
 * 注入到所有页面，监听 EXTRACT_PAGE_CONTENT 消息，用 Readability 提取正文
 */
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type !== 'EXTRACT_PAGE_CONTENT') return false

  try {
    const doc = new DOMParser().parseFromString(document.documentElement.outerHTML, 'text/html')
    const reader = new Readability(doc)
    const article = reader.parse()

    if (article) {
      sendResponse({
        success: true,
        data: {
          title: article.title,
          content: article.textContent,
          excerpt: article.excerpt,
        },
      })
    }
    else {
      // Readability 无法解析时，回退到 innerText
      const fallbackDoc = new DOMParser().parseFromString(document.documentElement.outerHTML, 'text/html')
      fallbackDoc.querySelectorAll('script, style, noscript, iframe').forEach(el => el.remove())
      sendResponse({
        success: true,
        data: {
          title: document.title,
          content: fallbackDoc.body?.innerText || '',
          excerpt: '',
        },
      })
    }
  }
  catch (err) {
    sendResponse({
      success: false,
      error: err instanceof Error ? err.message : '提取失败',
    })
  }

  return true
})
