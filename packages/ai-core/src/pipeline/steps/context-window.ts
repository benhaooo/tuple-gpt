import type { Message } from '../../types'
import type { PipelineStep } from '../pipeline'

export interface ContextWindowOptions {
  /** Maximum number of messages to retain (including system message) */
  maxMessages?: number
  /** Maximum total character length of all message contents */
  maxChars?: number
}

function messageCharLength(msg: Message): number {
  if (typeof msg.content === 'string') return msg.content.length
  return msg.content.reduce((sum, part) => {
    if (part.type === 'text') return sum + part.text.length
    if (part.type === 'tool_call') return sum + part.toolCall.arguments.length
    if (part.type === 'tool_result') return sum + part.result.length
    return sum
  }, 0)
}

/**
 * Truncates the message history to fit within the specified context window.
 * Always preserves the system message (if present) and the most recent messages.
 */
export function contextWindow(options: ContextWindowOptions): PipelineStep {
  return (input) => {
    let messages = input.messages

    // Separate system message if present
    const hasSystem = messages.length > 0 && messages[0].role === 'system'
    const systemMsg = hasSystem ? messages[0] : null
    let rest = hasSystem ? messages.slice(1) : messages

    // Truncate by maxMessages (keep most recent)
    if (options.maxMessages !== undefined) {
      const limit = systemMsg
        ? options.maxMessages - 1
        : options.maxMessages
      if (rest.length > limit) {
        rest = rest.slice(rest.length - limit)
      }
    }

    // Truncate by maxChars (keep most recent)
    if (options.maxChars !== undefined) {
      const systemChars = systemMsg ? messageCharLength(systemMsg) : 0
      let budget = options.maxChars - systemChars
      const kept: Message[] = []
      for (let i = rest.length - 1; i >= 0; i--) {
        const len = messageCharLength(rest[i])
        if (budget - len < 0 && kept.length > 0) break
        budget -= len
        kept.unshift(rest[i])
      }
      rest = kept
    }

    messages = systemMsg ? [systemMsg, ...rest] : rest
    return { ...input, messages }
  }
}
