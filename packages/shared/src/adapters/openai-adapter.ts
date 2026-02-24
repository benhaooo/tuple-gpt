import type { AIAdapter, AdapterSendOptions } from './types'

export class OpenAIAdapter implements AIAdapter {
  async *sendMessage(options: AdapterSendOptions): AsyncGenerator<string, void, unknown> {
    const { messages, provider, model, signal, systemPrompt, maxTokens } = options

    const apiMessages: Array<{ role: string; content: string }> = []
    if (systemPrompt) {
      apiMessages.push({ role: 'system', content: systemPrompt })
    }
    for (const msg of messages) {
      apiMessages.push({ role: msg.role, content: msg.content })
    }

    const url = `${provider.baseUrl.replace(/\/$/, '')}/v1/chat/completions`

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${provider.apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: apiMessages,
        stream: true,
        ...(maxTokens ? { max_tokens: maxTokens } : {}),
      }),
      signal,
    })

    if (!response.ok) {
      const errorBody = await response.text()
      throw Object.assign(new Error(`OpenAI API error: ${response.status}`), {
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
          if (data === '[DONE]') return
          try {
            const parsed = JSON.parse(data)
            const delta = parsed.choices?.[0]?.delta?.content
            if (delta) yield delta
          } catch {
            // skip malformed JSON lines
          }
        }
      }
    } finally {
      reader.releaseLock()
    }
  }
}
