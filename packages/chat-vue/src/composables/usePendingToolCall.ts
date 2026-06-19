import { computed, type ComputedRef } from 'vue'
import type { ChatTurn } from '@tuple-gpt/chat-core'
import type { PendingToolCall } from '../components/InterruptiveToolInteraction.vue'

/**
 * 从 turn 列表中查找第一个待交互的 tool call
 */
export function usePendingToolCall(turns: ComputedRef<ChatTurn[]>) {
  const pendingToolCall = computed<PendingToolCall | null>(() => {
    const turnList = turns.value
    // 从后往前遍历（最新的 turn 优先）
    for (let i = turnList.length - 1; i >= 0; i--) {
      const turn = turnList[i]

      // 遍历 turn 中的所有消息
      for (const message of turn.messages) {
        if (message.role !== 'assistant') continue

        // 检查消息内容中的 tool_call parts
        for (const part of message.content) {
          if (part.type === 'tool_call' && part.status === 'awaiting') {
            // 找到第一个待交互的 tool call
            return {
              turnId: turn.id,
              toolCallId: part.toolCall.id,
              toolName: part.toolCall.name,
              arguments: part.toolCall.arguments,
            }
          }
        }
      }
    }

    return null
  })

  return {
    pendingToolCall,
    hasPendingInteraction: computed(() => pendingToolCall.value !== null),
  }
}
