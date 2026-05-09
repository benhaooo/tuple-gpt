import { computed } from 'vue'
import { useMcpStore } from '../stores/mcp'

export function useToolRegistry() {
  const mcpStore = useMcpStore()

  const activeTools = computed(() => mcpStore.allTools)
  const executor = computed(() => mcpStore.toolExecutor)
  const hasTools = computed(() => activeTools.value.length > 0)

  return { activeTools, executor, hasTools }
}
