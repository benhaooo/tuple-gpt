<template>
  <ScrollArea class="h-full">
    <div class="space-y-5 p-5">
      <!-- 身份条：状态图标 + 名称 + 连接动作 -->
      <div class="flex items-center gap-3">
        <div
          class="relative grid size-11 flex-shrink-0 place-items-center rounded-xl border transition-colors"
          :class="statusStyle.iconWrap"
        >
          <ServerStackIcon class="h-5 w-5" :class="statusStyle.iconStroke" />
          <span
            class="absolute -right-0.5 -bottom-0.5 size-2.5 rounded-full ring-2 ring-background"
            :class="statusStyle.dot"
          />
        </div>
        <div class="min-w-0 flex-1">
          <h3 class="truncate text-base leading-tight font-semibold text-foreground">
            {{ server.name || '未命名 Server' }}
          </h3>
          <p class="mt-0.5 truncate text-xs text-muted-foreground">
            {{ statusStyle.text }}
          </p>
        </div>
        <div class="flex-shrink-0">
          <button
            type="button"
            role="switch"
            :aria-checked="server.enabled"
            aria-label="启用"
            :disabled="!server.url"
            class="relative inline-flex h-6 w-11 cursor-pointer items-center rounded-full outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50"
            :class="server.enabled ? 'bg-emerald-500' : 'bg-muted'"
            @click="handleToggleEnabled(!server.enabled)"
          >
            <span
              class="pointer-events-none inline-block size-5 transform rounded-full bg-background shadow-sm ring-0 transition-transform duration-200"
              :class="server.enabled ? 'translate-x-[22px]' : 'translate-x-0.5'"
            />
          </button>
        </div>
      </div>

      <!-- 错误提示 -->
      <div
        v-if="state?.error"
        class="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2"
      >
        <ExclamationTriangleIcon class="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-destructive" />
        <p class="text-xs leading-relaxed text-destructive">{{ state.error }}</p>
      </div>

      <Separator />

      <!-- 名称 + URL -->
      <div class="space-y-4">
        <div class="space-y-1.5">
          <Label>名称</Label>
          <Input
            :model-value="server.name"
            placeholder="Server 名称"
            @update:model-value="
              (v: string | number) => mcpStore.updateServer(server.id, { name: String(v) })
            "
          />
        </div>
        <div class="space-y-1.5">
          <Label>URL</Label>
          <Input
            :model-value="server.url"
            placeholder="http://localhost:3000/mcp"
            @update:model-value="
              (v: string | number) => mcpStore.updateServer(server.id, { url: String(v) })
            "
          />
          <p class="text-xs text-muted-foreground">Streamable HTTP 端点地址</p>
        </div>
      </div>

      <Separator />

      <!-- Headers -->
      <div class="space-y-2.5">
        <div class="flex items-center justify-between">
          <Label>自定义 Headers</Label>
          <Button size="sm" variant="outline" @click="addHeader">
            <PlusIcon class="mr-1 h-3.5 w-3.5" />
            添加
          </Button>
        </div>
        <div v-if="headerKeys.length" class="space-y-2">
          <div
            v-for="key in headerKeys"
            :key="key"
            class="grid grid-cols-[1fr_1fr_auto] items-center gap-2"
          >
            <Input
              :model-value="key"
              class="h-8 font-mono text-xs"
              placeholder="Header 名"
              @update:model-value="(v: string | number) => renameHeader(key, String(v))"
            />
            <Input
              :model-value="headers[key]"
              class="h-8 font-mono text-xs"
              placeholder="值"
              @update:model-value="(v: string | number) => updateHeaderValue(key, String(v))"
            />
            <Button
              variant="ghost"
              size="icon-sm"
              class="size-8 flex-shrink-0 text-muted-foreground hover:text-destructive"
              @click="removeHeader(key)"
            >
              <XMarkIcon class="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div
          v-else
          class="rounded-md border border-dashed border-border bg-muted/20 px-3 py-3 text-center text-xs text-muted-foreground"
        >
          暂无自定义 Header
        </div>
      </div>

      <!-- 工具列表 -->
      <template v-if="state?.tools.length">
        <Separator />
        <div class="space-y-2.5">
          <div class="flex items-center justify-between">
            <Label>已发现工具</Label>
            <Badge variant="secondary" class="font-mono">
              {{ state.tools.length }}
            </Badge>
          </div>
          <div class="overflow-hidden rounded-lg border">
            <div
              v-for="(tool, idx) in state.tools"
              :key="tool.name"
              class="group flex cursor-pointer items-start gap-3 px-3 py-2.5 transition-colors hover:bg-accent/40"
              :class="idx > 0 && 'border-t border-border/60'"
              @click="toggleTool(tool.name)"
            >
              <div
                class="grid size-7 flex-shrink-0 place-items-center rounded-md border bg-muted/40"
              >
                <WrenchScrewdriverIcon class="h-3.5 w-3.5 text-muted-foreground" />
              </div>
              <div class="min-w-0 flex-1">
                <p class="font-mono text-xs font-semibold break-all text-foreground">
                  {{ tool.name }}
                </p>
                <p
                  v-if="tool.description"
                  class="mt-1 text-xs leading-relaxed break-words text-muted-foreground"
                  :class="expandedTools.has(tool.name) ? '' : 'line-clamp-2'"
                >
                  {{ tool.description }}
                </p>
              </div>
              <ChevronDownIcon
                v-if="tool.description"
                class="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-muted-foreground/60 transition-transform"
                :class="expandedTools.has(tool.name) && 'rotate-180'"
              />
            </div>
          </div>
        </div>
      </template>
    </div>
  </ScrollArea>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import {
  PlusIcon,
  XMarkIcon,
  ServerStackIcon,
  WrenchScrewdriverIcon,
  ExclamationTriangleIcon,
  ChevronDownIcon,
} from '@heroicons/vue/24/outline'
import { useMcpStore } from '#stores/mcp'
import type { McpServerConfig } from '@tuple-gpt/chat-core'
import { Badge, Button, Input, Label, ScrollArea, Separator } from '@tuple-gpt/ui-vue'

const props = defineProps<{ server: McpServerConfig }>()
const mcpStore = useMcpStore()

const state = computed(() => mcpStore.getServerState(props.server.id))

const expandedTools = ref(new Set<string>())

function toggleTool(name: string) {
  const next = new Set(expandedTools.value)
  if (next.has(name)) next.delete(name)
  else next.add(name)
  expandedTools.value = next
}

const headers = reactive<Record<string, string>>({})
const headerKeys = computed(() => Object.keys(headers))

watch(
  () => props.server.headers,
  h => {
    Object.keys(headers).forEach(k => delete headers[k])
    if (h) Object.assign(headers, h)
  },
  { immediate: true },
)

function syncHeaders() {
  const cleaned = Object.fromEntries(Object.entries(headers).filter(([k]) => k.trim()))
  mcpStore.updateServer(props.server.id, {
    headers: Object.keys(cleaned).length > 0 ? cleaned : undefined,
  })
}

function addHeader() {
  headers[''] = ''
}

function removeHeader(key: string) {
  delete headers[key]
  syncHeaders()
}

function renameHeader(oldKey: string, newKey: string) {
  const value = headers[oldKey]
  delete headers[oldKey]
  headers[newKey] = value
  syncHeaders()
}

function updateHeaderValue(key: string, value: string) {
  headers[key] = value
  syncHeaders()
}

async function handleToggleEnabled(enabled: boolean) {
  mcpStore.updateServer(props.server.id, { enabled })
  if (enabled && props.server.url) {
    await mcpStore.connectServer(props.server.id)
  } else if (!enabled) {
    await mcpStore.disconnectServer(props.server.id)
  }
}

const statusStyle = computed(() => {
  switch (state.value?.status) {
    case 'connected':
      return {
        dot: 'bg-emerald-500',
        iconWrap: 'border-emerald-500/40 bg-emerald-500/10',
        iconStroke: 'text-emerald-500',
        text: '已连接',
      }
    case 'connecting':
      return {
        dot: 'bg-amber-500 animate-pulse',
        iconWrap: 'border-amber-500/40 bg-amber-500/10',
        iconStroke: 'text-amber-500',
        text: '连接中...',
      }
    case 'error':
      return {
        dot: 'bg-destructive',
        iconWrap: 'border-destructive/40 bg-destructive/10',
        iconStroke: 'text-destructive',
        text: '连接失败',
      }
    default:
      return {
        dot: 'bg-muted-foreground/40',
        iconWrap: 'border-border bg-muted/40',
        iconStroke: 'text-muted-foreground',
        text: '未连接',
      }
  }
})
</script>
