<template>
  <details
    v-if="toolCall.status !== 'awaiting'"
    :class="[
      'rounded-md border px-2 py-1.5',
      isToolCallError(toolCall)
        ? 'border-destructive/35 bg-destructive/5'
        : isToolCallRunning(toolCall)
          ? 'border-primary/40 bg-primary/5'
          : 'border-border/60 bg-muted/30',
    ]"
  >
    <summary
      class="flex cursor-pointer list-none items-center gap-1.5 text-xs font-medium text-muted-foreground"
    >
      <WrenchScrewdriverIcon class="h-3.5 w-3.5 shrink-0" />
      <span class="truncate">{{ toolCall.name }}</span>
      <span
        v-if="isToolCallRunning(toolCall)"
        class="ml-auto inline-flex items-center gap-1 text-primary"
      >
        <ArrowPathIcon class="h-3 w-3 animate-spin" />
      </span>
      <span
        v-else-if="isToolCallError(toolCall)"
        class="ml-auto inline-flex items-center gap-1 text-destructive"
      >
        <XCircleIcon class="h-3 w-3" />
      </span>
      <span
        v-else-if="toolCall.status === 'resolved' && toolCall.result !== undefined"
        class="ml-auto inline-flex items-center gap-1 text-emerald-600"
      >
        <CheckCircleIcon class="h-3 w-3" />
      </span>
    </summary>
    <div class="mt-1.5 space-y-1.5">
      <pre
        class="max-h-48 overflow-auto whitespace-pre-wrap break-words rounded bg-background/70 p-2 text-[11px] leading-5 text-muted-foreground"
        >{{ formatToolArguments(toolCall.arguments) }}</pre
      >
      <div
        v-if="toolCall.result !== undefined"
        :class="[
          'rounded border px-2 py-1.5',
          isToolCallError(toolCall)
            ? 'border-destructive/35 bg-destructive/5'
            : 'border-border/40 bg-background/50',
        ]"
      >
        <pre
          class="max-h-56 overflow-auto whitespace-pre-wrap break-words text-[11px] leading-5 text-muted-foreground"
          >{{ toolCall.result }}</pre
        >
      </div>
    </div>
  </details>
</template>

<script setup lang="ts">
import {
  ArrowPathIcon,
  CheckCircleIcon,
  WrenchScrewdriverIcon,
  XCircleIcon,
} from '@heroicons/vue/24/outline'
import type { ToolCallMessagePartModel } from './types'

defineProps<{
  toolCall: ToolCallMessagePartModel
}>()

function isToolCallRunning(toolCall: ToolCallMessagePartModel): boolean {
  return toolCall.status === 'pending' || toolCall.status === 'awaiting'
}

function isToolCallError(toolCall: ToolCallMessagePartModel): boolean {
  return toolCall.status === 'cancelled' || toolCall.isError === true
}

function formatToolArguments(value: string) {
  if (!value) return '{}'
  try {
    return JSON.stringify(JSON.parse(value), null, 2)
  } catch {
    return value
  }
}
</script>
