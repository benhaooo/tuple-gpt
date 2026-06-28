<template>
  <details
    :open="isReasoningRunning(reasoning)"
    :class="[
      'rounded-md border px-2 py-1.5',
      reasoning.status === 'failed'
        ? 'border-destructive/35 bg-destructive/5'
        : isReasoningRunning(reasoning)
          ? 'border-amber-500/35 bg-amber-500/5'
          : 'border-border/60 bg-muted/20',
    ]"
  >
    <summary
      class="flex cursor-pointer list-none items-center gap-1.5 text-xs font-medium text-muted-foreground"
    >
      <LightBulbIcon class="h-3.5 w-3.5 shrink-0" />
      <span>思考摘要</span>
      <span
        v-if="statusIcon"
        :class="['ml-auto inline-flex items-center', statusIcon.class]"
        :title="statusIcon.label"
        :aria-label="statusIcon.label"
        :role="statusIcon.role"
      >
        <component
          :is="statusIcon.icon"
          :class="['h-3 w-3', statusIcon.iconClass]"
          aria-hidden="true"
        />
      </span>
    </summary>
    <div
      v-if="reasoning.summary"
      class="mt-1.5 whitespace-pre-wrap break-words text-[11px] leading-5 text-muted-foreground"
    >
      {{ reasoning.summary }}
    </div>
  </details>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import {
  ArrowPathIcon,
  CheckCircleIcon,
  LightBulbIcon,
  XCircleIcon,
} from '@heroicons/vue/24/outline'
import type { ReasoningMessagePartModel, ReasoningStatus } from './types'

const props = defineProps<{
  reasoning: ReasoningMessagePartModel
}>()

const statusIcon = computed(() => {
  const label = formatReasoningStatus(props.reasoning.status)
  if (isReasoningRunning(props.reasoning)) {
    return {
      icon: ArrowPathIcon,
      label,
      class: 'text-amber-600',
      iconClass: 'animate-spin',
      role: 'status',
    }
  }
  if (props.reasoning.status === 'failed') {
    return {
      icon: XCircleIcon,
      label,
      class: 'text-destructive',
      iconClass: '',
    }
  }
  if (props.reasoning.status === 'completed') {
    return {
      icon: CheckCircleIcon,
      label,
      class: 'text-emerald-600',
      iconClass: '',
    }
  }
  return null
})

function isReasoningRunning(reasoning: ReasoningMessagePartModel): boolean {
  return reasoning.status === 'pending' || reasoning.status === 'in_progress'
}

function formatReasoningStatus(status: ReasoningStatus) {
  switch (status) {
    case 'pending':
      return '等待中'
    case 'in_progress':
      return '思考中'
    case 'completed':
      return '完成'
    case 'failed':
      return '失败'
  }
}
</script>
