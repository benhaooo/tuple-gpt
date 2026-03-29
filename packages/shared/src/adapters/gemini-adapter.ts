import type { AIAdapter, AdapterSendOptions } from './types'
import { getBinaryAttachments } from './multimodal'

export class GeminiAdapter implements AIAdapter {
  async *sendMessage(options: AdapterSendOptions): AsyncGenerator<string, void, unknown> {
    const { messages, provider, model, signal, systemPrompt, maxTokens } = options

    const contents: Array<{ role: string; parts: any[] }> = []
    for (const msg of messages) {
      if (msg.role === 'system') continue
      const parts: any[] = []
      if (msg.content) {
        parts.push({ text: msg.content })
      }
      for (const att of getBinaryAttachments(msg.attachments)) {
        parts.push({
          inline_data: { mime_type: att.mimeType, data: att.base64Data },
        })
      }
      if (parts.length === 0) parts.push({ text: '' })
      contents.push({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts,
      })
    }

    const baseUrl = provider.baseUrl.replace(/\/$/, '')
    const url = `${baseUrl}/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${provider.apiKey}`

    const body: Record<string, any> = { contents }
    if (systemPrompt) {
      body.systemInstruction = { parts: [{ text: systemPrompt }] }
    }
    if (maxTokens) {
      body.generationConfig = { maxOutputTokens: maxTokens }
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal,
    })

    if (!response.ok) {
      const errorBody = await response.text()
      throw Object.assign(new Error(`Gemini API error: ${response.status}`), {
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
            const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text
            if (text) yield text
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
