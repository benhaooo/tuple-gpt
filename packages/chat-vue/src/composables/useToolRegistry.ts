import { computed } from 'vue'
import type { Tool } from '@tuple-gpt/ai-core'
import { builtinTools } from '@tuple-gpt/chat-core'
import { useMcpStore } from '#stores/mcp'

/**
 * Vue components used to resolve interactive tool calls. The agent loop
 * surfaces a `reason` per suspended tool; the UI maps (toolName, reason)
 * to a Vue component name. Add new entries as new interactive tools land.
 */
const interactiveComponentByTool: Record<string, string> = {
  ask_user: 'ToolAskUser',
}

export function useToolRegistry() {
  const mcpStore = useMcpStore()

  const activeTools = computed<Tool[]>(() => [...builtinTools, ...mcpStore.allTools])
  const hasTools = computed(() => activeTools.value.length > 0)

  function getInteractiveComponent(toolName: string): string | undefined {
    return interactiveComponentByTool[toolName]
  }

  return { activeTools, hasTools, getInteractiveComponent }
}
