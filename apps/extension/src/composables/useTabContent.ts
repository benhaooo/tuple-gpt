import type { BrowserTab } from './useSelectedTabs'
import { tabClient } from '../utils/messages'

export interface TabContent {
  tabId: number
  title: string
  url: string
  content: string
  error?: string
}

const MAX_CONTENT_LENGTH = 8000

export async function extractTabContent(tab: BrowserTab): Promise<TabContent> {
  const response = await tabClient.extractPageContent(tab.id)

  if (!response.success) {
    return { tabId: tab.id, title: tab.title, url: tab.url, content: '', error: response.error }
  }

  const { title, content: rawContent } = response.data

  const content = rawContent.length > MAX_CONTENT_LENGTH
    ? rawContent.slice(0, MAX_CONTENT_LENGTH) + '\n...(内容已截断)'
    : rawContent

  return {
    tabId: tab.id,
    title,
    url: tab.url,
    content,
  }
}

export async function extractMultipleTabsContent(tabs: BrowserTab[]): Promise<TabContent[]> {
  return Promise.all(tabs.map(tab => extractTabContent(tab)))
}
