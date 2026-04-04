import type { PipelineStep } from '../pipeline'
import { Role } from '../../types'

/**
 * Injects a system prompt as the first message.
 * If a system message already exists at index 0, it replaces it.
 */
export function systemPrompt(prompt: string): PipelineStep {
  return (input) => {
    const messages = [...input.messages]
    if (messages.length > 0 && messages[0].role === Role.System) {
      messages[0] = { role: Role.System, content: prompt }
    } else {
      messages.unshift({ role: Role.System, content: prompt })
    }
    return { ...input, messages }
  }
}
