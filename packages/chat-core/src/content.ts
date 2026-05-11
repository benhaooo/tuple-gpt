import type { ChatMessage, MessageContent } from './types'

export function createTextContent(text: string): MessageContent[] {
  return text ? [{ type: 'text', text }] : []
}

export function getContentText(content: MessageContent[]): string {
  return content
    .filter(part => part.type === 'text')
    .map(part => part.text)
    .join('')
}

export function getMessageText(message: Pick<ChatMessage, 'content'>): string {
  return getContentText(message.content)
}

export function appendTextToContent(content: MessageContent[], text: string): MessageContent[] {
  if (!text) return cloneContent(content)

  const next = cloneContent(content)
  const last = next[next.length - 1]
  if (last?.type === 'text') {
    return [...next.slice(0, -1), { ...last, text: last.text + text }]
  }

  return [...next, { type: 'text', text }]
}

export function cloneContent(content: MessageContent[]): MessageContent[] {
  return content.map(cloneContentPart)
}

export function cloneContentPart(part: MessageContent): MessageContent {
  if (part.type === 'tool_call') {
    return {
      ...part,
      toolCall: { ...part.toolCall },
    }
  }

  return { ...part }
}
