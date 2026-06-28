import type {
  Citation,
  NativeToolAction,
  NativeToolContentPart,
  NativeToolStatus,
  ReasoningContentPart,
} from '@tuple-gpt/ai-core'
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

export function applyCitationsToLastText(
  content: MessageContent[],
  citations: Citation[],
): MessageContent[] {
  if (citations.length === 0) return cloneContent(content)

  const next = cloneContent(content)
  for (let index = next.length - 1; index >= 0; index--) {
    const part = next[index]
    if (part?.type !== 'text') continue
    next[index] = {
      ...part,
      citations: [...(part.citations ?? []), ...citations.map(cloneCitation)],
    }
    return next
  }

  return next
}

export function appendNativeToolToContent(
  content: MessageContent[],
  nativeTool: NativeToolContentPart['nativeTool'],
): MessageContent[] {
  return [
    ...cloneContent(content),
    { type: 'native_tool', nativeTool: cloneNativeTool(nativeTool) },
  ]
}

export function updateNativeToolInContent(
  content: MessageContent[],
  nativeToolId: string,
  patch: {
    status?: NativeToolStatus
    action?: NativeToolAction
    sources?: Citation[]
    raw?: unknown
  },
): MessageContent[] {
  return cloneContent(content).map(part => {
    if (part.type !== 'native_tool' || part.nativeTool.id !== nativeToolId) return part
    return {
      ...part,
      nativeTool: {
        ...part.nativeTool,
        ...(patch.status ? { status: patch.status } : {}),
        ...(patch.action ? { action: { ...patch.action } } : {}),
        ...(patch.sources ? { sources: patch.sources.map(cloneCitation) } : {}),
        ...(patch.raw ? { raw: patch.raw } : {}),
      },
    }
  })
}

export function appendReasoningToContent(
  content: MessageContent[],
  reasoning: ReasoningContentPart['reasoning'],
): MessageContent[] {
  const next = cloneContent(content)
  const existingIndex = next.findIndex(
    part => part.type === 'reasoning' && part.reasoning.id === reasoning.id,
  )
  const existing =
    existingIndex === -1 || next[existingIndex]?.type !== 'reasoning'
      ? undefined
      : next[existingIndex].reasoning
  const part: MessageContent = {
    type: 'reasoning',
    reasoning: mergeReasoning(existing, reasoning),
  }

  if (existingIndex === -1) return [...next, part]
  return next.map((current, index) => (index === existingIndex ? part : current))
}

export function cloneContent(content: MessageContent[]): MessageContent[] {
  return content.map(cloneContentPart)
}

export function cloneContentPart(part: MessageContent): MessageContent {
  if (part.type === 'text') {
    return {
      ...part,
      citations: part.citations?.map(cloneCitation),
    }
  }

  if (part.type === 'tool_call') {
    return {
      ...part,
      toolCall: { ...part.toolCall },
    }
  }

  if (part.type === 'native_tool') {
    return {
      ...part,
      nativeTool: cloneNativeTool(part.nativeTool),
    }
  }

  if (part.type === 'reasoning') {
    return {
      ...part,
      reasoning: cloneReasoning(part.reasoning),
    }
  }

  return { ...part }
}

function cloneCitation(citation: Citation): Citation {
  return { ...citation }
}

function cloneNativeTool(
  nativeTool: NativeToolContentPart['nativeTool'],
): NativeToolContentPart['nativeTool'] {
  return {
    ...nativeTool,
    action: nativeTool.action ? { ...nativeTool.action } : undefined,
    sources: nativeTool.sources?.map(cloneCitation),
  }
}

function cloneReasoning(
  reasoning: ReasoningContentPart['reasoning'],
): ReasoningContentPart['reasoning'] {
  return { ...reasoning }
}

function mergeReasoning(
  current: ReasoningContentPart['reasoning'] | undefined,
  patch: ReasoningContentPart['reasoning'],
): ReasoningContentPart['reasoning'] {
  return {
    ...(current ?? {}),
    ...patch,
    ...(patch.summary !== undefined ? { summary: patch.summary } : {}),
    ...(patch.encryptedContent !== undefined ? { encryptedContent: patch.encryptedContent } : {}),
    ...(patch.raw !== undefined ? { raw: patch.raw } : {}),
  }
}
