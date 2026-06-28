import { describe, expect, it } from 'vitest'
import { ProviderType } from '@tuple-gpt/ai-core'
import {
  buildRequestMessages,
  formatAttachmentsAsContext,
  getBinaryAttachments,
  toMessages,
  toProviderConfig,
} from '#request'
import type { ChatMessage, MessageAttachment, Provider } from '#types'

const timestamp = '2026-04-29T00:00:00.000Z'

function text(value: string) {
  return [{ type: 'text' as const, text: value }]
}

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

  it('builds request messages with attachment context appended to text content', () => {
    const history: ChatMessage[] = [
      {
        id: 'u1',
        role: 'user',
        content: text('summarize'),
        status: 'done',
        createdAt: timestamp,
        updatedAt: timestamp,
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
    const part = result[0]?.content[0]

    expect(part?.type).toBe('text')
    expect(part?.type === 'text' ? part.text : '').toContain('summarize')
    expect(part?.type === 'text' ? part.text : '').toContain('<attached_pages>')
    expect(result[0]?.attachments).toBe(history[0]?.attachments)
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
      format: ProviderType.OpenAI,
      models: ['gpt-4o'],
      createdAt: timestamp,
      updatedAt: timestamp,
    }

    expect(toProviderConfig(provider, 'gpt-4o')).toEqual({
      type: ProviderType.OpenAI,
      apiKey: 'key',
      baseUrl: 'https://api.openai.com/v1',
      model: 'gpt-4o',
      webSearch: true,
      reasoning: true,
    })
  })

  it('maps OpenAI Responses API usage to the responses provider', () => {
    const provider: Provider = {
      id: 'openai',
      name: 'OpenAI',
      baseUrl: 'https://api.openai.com',
      apiKey: 'key',
      format: ProviderType.OpenAI,
      useAgentApi: true,
      models: ['gpt-5.4'],
      createdAt: timestamp,
      updatedAt: timestamp,
    }

    expect(toProviderConfig(provider, 'gpt-5.4')).toEqual({
      type: ProviderType.OpenAIResponses,
      apiKey: 'key',
      baseUrl: 'https://api.openai.com/v1',
      model: 'gpt-5.4',
      webSearch: true,
      reasoning: true,
    })
  })

  it('maps Gemini Interactions API usage to the interactions provider', () => {
    const provider: Provider = {
      id: 'gemini',
      name: 'Gemini',
      baseUrl: 'https://generativelanguage.googleapis.com',
      apiKey: 'key',
      format: ProviderType.Gemini,
      useAgentApi: true,
      models: ['gemini-2.5-pro'],
      createdAt: timestamp,
      updatedAt: timestamp,
    }

    expect(toProviderConfig(provider, 'gemini-2.5-pro')).toEqual({
      type: ProviderType.GeminiInteractions,
      apiKey: 'key',
      baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
      model: 'gemini-2.5-pro',
      webSearch: true,
      reasoning: true,
    })
  })

  it('enables native web search for provider configs by default', () => {
    const openAIProvider: Provider = {
      id: 'openai',
      name: 'OpenAI',
      baseUrl: 'https://api.openai.com',
      apiKey: 'key',
      format: ProviderType.OpenAI,
      models: ['gpt-5-search-api'],
      presetId: 'openai',
      createdAt: timestamp,
      updatedAt: timestamp,
    }
    const claudeProvider: Provider = {
      id: 'claude',
      name: 'Claude',
      baseUrl: 'https://api.anthropic.com',
      apiKey: 'key',
      format: ProviderType.Anthropic,
      models: ['claude-sonnet-4-20250514'],
      createdAt: timestamp,
      updatedAt: timestamp,
    }

    expect(toProviderConfig(openAIProvider, 'gpt-5-search-api')).toEqual({
      type: ProviderType.OpenAI,
      apiKey: 'key',
      baseUrl: 'https://api.openai.com/v1',
      model: 'gpt-5-search-api',
      webSearch: true,
      reasoning: true,
    })
    expect(toProviderConfig(claudeProvider, 'claude-sonnet-4-20250514')).toEqual({
      type: ProviderType.Anthropic,
      apiKey: 'key',
      baseUrl: 'https://api.anthropic.com/v1',
      model: 'claude-sonnet-4-20250514',
      webSearch: true,
      reasoning: true,
    })
  })

  it('also passes native web search to OpenAI-compatible presets', () => {
    const provider: Provider = {
      id: 'openrouter',
      name: 'OpenRouter',
      baseUrl: 'https://openrouter.ai/api',
      apiKey: 'key',
      format: ProviderType.OpenAI,
      presetId: 'openrouter',
      models: ['some-model'],
      createdAt: timestamp,
      updatedAt: timestamp,
    }

    expect(toProviderConfig(provider, 'some-model')).toEqual({
      type: ProviderType.OpenAI,
      apiKey: 'key',
      baseUrl: 'https://openrouter.ai/api/v1',
      model: 'some-model',
      webSearch: true,
      reasoning: true,
    })
  })

  it('converts binary attachments into multimodal ai-core messages', () => {
    const result = toMessages([
      {
        role: 'user',
        content: text('look'),
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

    expect(result[0]?.content).toEqual([
      { type: 'text', text: 'look' },
      { type: 'image', image: 'aaa', mimeType: 'image/png' },
    ])
  })
})
