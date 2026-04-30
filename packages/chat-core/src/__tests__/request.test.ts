import { describe, expect, it } from 'vitest'
import {
  buildRequestMessages,
  formatAttachmentsAsContext,
  getBinaryAttachments,
  toMessages,
  toProviderConfig,
} from '../request'
import type { ChatMessage, MessageAttachment, Provider } from '../types'

const timestamp = '2026-04-29T00:00:00.000Z'

describe('request helpers', () => {
  it('formats extracted text attachments as page context', () => {
    const attachments: MessageAttachment[] = [
      {
        id: 'tab-1',
        type: 'tab',
        title: 'Example',
        url: 'https://example.com',
        extractedContent: 'hello page',
      },
    ]

    expect(formatAttachmentsAsContext(attachments)).toContain(
      '<page title="Example" url="https://example.com">\nhello page\n</page>',
    )
  })

  it('builds request messages with attachment context appended to content', () => {
    const history: ChatMessage[] = [
      {
        id: 'u1',
        role: 'user',
        content: 'summarize',
        status: 'done',
        timestamp,
        attachments: [
          {
            id: 'tab-1',
            type: 'tab',
            title: 'Example',
            extractedContent: 'page body',
          },
        ],
      },
    ]

    const result = buildRequestMessages(history)

    expect(result[0].content).toContain('summarize')
    expect(result[0].content).toContain('<attached_pages>')
    expect(result[0].attachments).toBe(history[0].attachments)
  })

  it('keeps only binary image and pdf attachments', () => {
    const result = getBinaryAttachments([
      { id: 'img', type: 'file', title: 'a.png', category: 'image', base64Data: 'aaa' },
      { id: 'pdf', type: 'file', title: 'a.pdf', category: 'pdf', base64Data: 'bbb' },
      { id: 'text', type: 'file', title: 'a.txt', category: 'text', extractedContent: 'ccc' },
    ])

    expect(result.map(attachment => attachment.id)).toEqual(['img', 'pdf'])
  })

  it('maps configured providers to ai-core provider config', () => {
    const provider: Provider = {
      id: 'openai',
      name: 'OpenAI',
      baseUrl: 'https://api.openai.com',
      apiKey: 'key',
      format: 'openai',
      models: ['gpt-4o'],
      createdAt: timestamp,
      updatedAt: timestamp,
    }

    expect(toProviderConfig(provider, 'gpt-4o')).toEqual({
      type: 'openai',
      apiKey: 'key',
      baseUrl: 'https://api.openai.com/v1',
      model: 'gpt-4o',
    })
  })

  it('converts binary attachments into multimodal ai-core messages', () => {
    const result = toMessages([
      {
        role: 'user',
        content: 'look',
        attachments: [
          {
            id: 'img',
            type: 'file',
            title: 'a.png',
            category: 'image',
            mimeType: 'image/png',
            base64Data: 'aaa',
          },
        ],
      },
    ])

    expect(result[0].content).toEqual([
      { type: 'text', text: 'look' },
      { type: 'image', image: 'aaa', mimeType: 'image/png' },
    ])
  })
})
