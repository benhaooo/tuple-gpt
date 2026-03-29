import type { AIAdapter, AdapterSendOptions } from './types'
import { getBinaryAttachments } from './multimodal'

export class ClaudeAdapter implements AIAdapter {
  async *sendMessage(options: AdapterSendOptions): AsyncGenerator<string, void, unknown> {
    const { messages, provider, model, signal, systemPrompt, maxTokens } = options

    // Claude Messages API: system is a top-level field, not in messages array
    const apiMessages = messages
      .filter(msg => msg.role !== 'system')
      .map(msg => {
        const binaries = getBinaryAttachments(msg.attachments)
        if (binaries.length === 0) {
          return { role: msg.role, content: msg.content }
        }
        const content: any[] = []
        if (msg.content) {
          content.push({ type: 'text', text: msg.content })
        }
        for (const att of binaries) {
          if (att.category === 'image') {
            content.push({
              type: 'image',
              source: { type: 'base64', media_type: att.mimeType, data: att.base64Data },
            })
          } else if (att.category === 'pdf') {
            content.push({
              type: 'document',
              source: { type: 'base64', media_type: 'application/pdf', data: att.base64Data },
            })
          }
        }
        return { role: msg.role, content }
      })

    const url = `${provider.baseUrl.replace(/\/$/, '')}/v1/messages`

    const body: Record<string, any> = {
      model,
      messages: apiMessages,
      max_tokens: maxTokens || 4096,
      stream: true,
    }
    if (systemPrompt) {
      body.system = systemPrompt
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': provider.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(body),
      signal,
    })

    if (!response.ok) {
      const errorBody = await response.text()
      throw Object.assign(new Error(`Claude API error: ${response.status}`), {
        status: response.status,
        statusText: response.statusText,
        body: errorBody,
      })
    }

    const reader = response.body!.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    try {
      while (true) {
        const { value, done } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const data = line.slice(6).trim()
          if (!data) continue
          try {
            const parsed = JSON.parse(data)
            if (parsed.type === 'content_block_delta' && parsed.delta?.type === 'text_delta') {
              yield parsed.delta.text
            }
          } catch {
            // skip
          }
        }
      }
    } finally {
      reader.releaseLock()
    }
  }
}
