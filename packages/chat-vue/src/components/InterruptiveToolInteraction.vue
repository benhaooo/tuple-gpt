<template>
  <div class="px-3 py-3 overflow-hidden">
    <!-- 动态渲染具体的交互组件 -->
    <component
      :is="interactiveComponent"
      v-if="interactiveComponent && pendingToolCall"
      :tool-call-id="pendingToolCall.toolCallId"
      :arguments="pendingToolCall.arguments"
      :result="undefined"
      @submit="handleSubmit"
    />

    <!-- 降级显示：如果没有找到对应的组件 -->
    <div
      v-else
      class="overflow-hidden rounded-3xl border-2 border-amber-500/60 bg-amber-500/5 p-4 text-sm text-muted-foreground"
    >
      <p>未知的交互类型: {{ pendingToolCall?.toolName }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, type Component } from 'vue'
import { useChat } from '../composables/useChat'
import { useToolRegistry } from '../composables/useToolRegistry'
import ToolAskUser from './tools/ToolAskUser.vue'

// 注册所有交互式工具组件
const interactiveToolComponents: Record<string, Component> = {
  ToolAskUser,
}

export interface PendingToolCall {
  turnId: string
  toolCallId: string
  toolName: string
  arguments: string
}

const props = defineProps<{
  pendingToolCall: PendingToolCall | null
}>()

const { resolveToolCall } = useChat()
const { getInteractiveComponent } = useToolRegistry()

// 获取当前待交互工具对应的组件
const interactiveComponent = computed(() => {
  if (!props.pendingToolCall) return undefined
  const componentName = getInteractiveComponent(props.pendingToolCall.toolName)
  if (!componentName) return undefined
  return interactiveToolComponents[componentName]
})

function handleSubmit(payload: { toolCallId: string; result: string }) {
  if (!props.pendingToolCall) return
  void resolveToolCall(props.pendingToolCall.turnId, {
    toolCallId: payload.toolCallId,
    type: 'result',
    content: payload.result,
  })
}
</script>

<style scoped>
/* 移除了多余的动画，动画在 ToolAskUser 组件中 */
</style>
