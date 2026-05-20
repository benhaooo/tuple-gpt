import { computed } from 'vue'
import { useMcpStore } from '#stores/mcp'
import {
  builtinDefinitions,
  createToolRunner,
  registerBuiltinTools,
  type DefaultToolRunner,
} from '@tuple-gpt/chat-core'

export function useToolRegistry() {
  const mcpStore = useMcpStore()

  const activeTools = computed(() => [...builtinDefinitions, ...mcpStore.allTools])
  const hasTools = computed(() => activeTools.value.length > 0)

  /**
   * Build a fresh runner each time so MCP handlers reflect the current
   * connection state. The cost is negligible — registration is just two
   * map inserts per tool.
   */
  const runner = computed<DefaultToolRunner>(() => {
    const r = registerBuiltinTools(createToolRunner())
    for (const [name, handler] of Object.entries(mcpStore.toolExecutor)) {
      r.registerHandler(name, handler)
    }
    return r
  })

  function getInteractiveComponent(toolName: string): string | undefined {
    return runner.value.getInteractiveComponent(toolName)
  }

  return { activeTools, runner, hasTools, getInteractiveComponent }
}
