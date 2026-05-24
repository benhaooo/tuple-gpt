import type { PipelineStep } from '../pipeline'
import type { Message } from '../../types'
import { Role } from '../../types'

/**
 * Injects a system prompt as the first message.
 * If a system message already exists at index 0, it replaces it.
 */
export function systemPrompt(prompt: string): PipelineStep {
  return input => {
    const messages = [...input.messages]
    const systemMessage: Message = {
      role: Role.System,
      content: [{ type: 'text', text: prompt }],
    }
    if (messages.length > 0 && messages[0].role === Role.System) {
      messages[0] = systemMessage
    } else {
      messages.unshift(systemMessage)
    }
    return { ...input, messages }
  }
}
