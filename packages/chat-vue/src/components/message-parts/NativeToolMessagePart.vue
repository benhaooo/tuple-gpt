<template>
  <details
    :open="isNativeToolRunning(nativeTool)"
    :class="[
      'rounded-md border px-2 py-1.5',
      nativeTool.status === 'failed'
        ? 'border-destructive/35 bg-destructive/5'
        : isNativeToolRunning(nativeTool)
          ? 'border-sky-500/35 bg-sky-500/5'
          : 'border-border/60 bg-muted/25',
    ]"
  >
    <summary
      class="flex cursor-pointer list-none items-center gap-1.5 text-xs font-medium text-muted-foreground"
    >
      <MagnifyingGlassIcon v-if="nativeTool.kind === 'web_search'" class="h-3.5 w-3.5 shrink-0" />
      <GlobeAltIcon v-else class="h-3.5 w-3.5 shrink-0" />
      <span class="truncate">{{ formatNativeToolTitle(nativeTool) }}</span>
      <span
        v-if="statusIcon"
        :class="['ml-auto inline-flex items-center gap-1', statusIcon.class]"
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

    <div class="mt-1.5 space-y-1.5 text-[11px] leading-5 text-muted-foreground">
      <div v-if="nativeTool.action" class="rounded bg-background/65 px-2 py-1.5 break-words">
        <a
          v-if="nativeTool.action.url"
          :href="nativeTool.action.url"
          target="_blank"
          rel="noreferrer"
          class="inline-flex max-w-full items-center gap-1 text-foreground/80 hover:text-primary"
          :title="nativeTool.action.url"
        >
          <LinkIcon class="h-3 w-3 shrink-0" />
          <span class="truncate">
            {{ formatNativeToolAction(nativeTool.action) }}
          </span>
        </a>
        <span v-else>{{ formatNativeToolAction(nativeTool.action) }}</span>
      </div>

      <div v-if="nativeTool.sources.length" class="flex flex-wrap gap-1">
        <a
          v-for="source in nativeTool.sources"
          :key="formatCitationKey(source)"
          :href="source.url"
          target="_blank"
          rel="noreferrer"
          class="inline-flex max-w-full items-center gap-1 rounded border border-border/45 bg-background/55 px-1.5 py-0.5 hover:text-foreground"
          :title="source.url"
        >
          <LinkIcon class="h-3 w-3 shrink-0 opacity-70" />
          <span class="truncate">{{ formatCitationLabel(source) }}</span>
        </a>
      </div>
    </div>
  </details>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import {
  ArrowPathIcon,
  CheckCircleIcon,
  GlobeAltIcon,
  LinkIcon,
  MagnifyingGlassIcon,
  XCircleIcon,
} from '@heroicons/vue/24/outline'
import { formatCitationKey, formatCitationLabel } from './citation'
import type { NativeToolAction, NativeToolMessagePartModel, NativeToolStatus } from './types'

const props = defineProps<{
  nativeTool: NativeToolMessagePartModel
}>()

const statusIcon = computed(() => {
  const label = formatNativeToolStatus(props.nativeTool.status)
  if (isNativeToolRunning(props.nativeTool)) {
    return {
      icon: ArrowPathIcon,
      label,
      class: 'text-sky-600',
      iconClass: 'animate-spin',
      role: 'status',
    }
  }
  if (props.nativeTool.status === 'failed') {
    return {
      icon: XCircleIcon,
      label,
      class: 'text-destructive',
      iconClass: '',
    }
  }
  if (props.nativeTool.status === 'completed') {
    return {
      icon: CheckCircleIcon,
      label,
      class: 'text-emerald-600',
      iconClass: '',
    }
  }
  return null
})

function isNativeToolRunning(tool: NativeToolMessagePartModel): boolean {
  return tool.status === 'pending' || tool.status === 'in_progress' || tool.status === 'searching'
}

function formatNativeToolTitle(tool: NativeToolMessagePartModel) {
  const actionLabel = tool.action ? formatNativeToolAction(tool.action) : ''
  const title = tool.kind === 'web_search' ? '联网搜索' : tool.kind
  if (!actionLabel || actionLabel === '搜索') return title
  return `${title} · ${actionLabel}`
}

function formatNativeToolStatus(status: NativeToolStatus) {
  switch (status) {
    case 'pending':
      return '等待中'
    case 'in_progress':
      return '进行中'
    case 'searching':
      return '搜索中'
    case 'completed':
      return '完成'
    case 'failed':
      return '失败'
  }
}

function formatNativeToolAction(action: NativeToolAction) {
  if (action.type === 'search') {
    return action.query || action.queries?.[0] || '搜索'
  }
  if (action.type === 'open_page') {
    return action.url || '打开页面'
  }
  if (action.type === 'find_in_page') {
    return action.pattern || action.url || '页内查找'
  }
  return action.type
}
</script>
