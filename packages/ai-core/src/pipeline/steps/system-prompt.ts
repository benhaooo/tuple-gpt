import type { PipelineStep } from '../pipeline'

/**
 * Injects a system prompt as the first message.
 * If a system message already exists at index 0, it replaces it.
 */
export function systemPrompt(prompt: string): PipelineStep {
  return (input) => {
    const messages = [...input.messages]
    if (messages.length > 0 && messages[0].role === 'system') {
      messages[0] = { role: 'system', content: prompt }
    } else {
      messages.unshift({ role: 'system', content: prompt })
    }
    return { ...input, messages }
  }
}
