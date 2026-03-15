import type { BrowserTab } from './useBrowserTabs'

export interface TabContent {
  tabId: number
  title: string
  url: string
  content: string
  error?: string
}

const MAX_CONTENT_LENGTH = 8000

/**
 * 向目标 tab 的 content script 发送消息，提取页面正文
 */
export async function extractTabContent(tab: BrowserTab): Promise<TabContent> {
  try {
    const response = await chrome.tabs.sendMessage(tab.id, {
      type: 'EXTRACT_PAGE_CONTENT',
    }) as { success: boolean; data?: { title: string; content: string; excerpt: string }; error?: string }

    console.log(`[extractTabContent] tab ${tab.id} response:`, response?.success, 'content length:', response?.data?.content?.length ?? 0)

    if (!response?.success || !response.data?.content) {
      return { tabId: tab.id, title: tab.title, url: tab.url, content: '', error: response?.error || '无法提取页面内容' }
    }

    // 截断过长内容
    const content = response.data.content.length > MAX_CONTENT_LENGTH
      ? response.data.content.slice(0, MAX_CONTENT_LENGTH) + '\n...(内容已截断)'
      : response.data.content

    return {
      tabId: tab.id,
      title: response.data.title || tab.title,
      url: tab.url,
      content,
    }
  }
  catch (err) {
    console.error(`Failed to extract content from tab ${tab.id}:`, err)
    return {
      tabId: tab.id,
      title: tab.title,
      url: tab.url,
      content: '',
      error: err instanceof Error ? err.message : '提取失败',
    }
  }
}

/**
 * 批量提取多个 tab 的页面内容
 */
export async function extractMultipleTabsContent(tabs: BrowserTab[]): Promise<TabContent[]> {
  return Promise.all(tabs.map(tab => extractTabContent(tab)))
}

/**
 * 将提取的页面内容格式化为上下文字符串，拼接到用户消息中
 */
export function formatTabContentsAsContext(contents: TabContent[]): string {
  const validContents = contents.filter(c => c.content && !c.error)
  if (validContents.length === 0) return ''

  const pages = validContents.map(c =>
    `<page title="${c.title}" url="${c.url}">\n${c.content}\n</page>`,
  ).join('\n\n')

  return `\n\n<attached_pages>\n${pages}\n</attached_pages>`
}
