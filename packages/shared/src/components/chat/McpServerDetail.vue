<template>
  <ScrollArea class="h-full">
    <div class="space-y-6 p-6">
      <!-- 名称 -->
      <div class="space-y-2">
        <label class="text-sm font-medium">名称</label>
        <Input
          :model-value="server.name"
          @update:model-value="
            (v: string | number) => mcpStore.updateServer(server.id, { name: String(v) })
          "
          placeholder="Server 名称"
        />
      </div>

      <!-- URL -->
      <div class="space-y-2">
        <label class="text-sm font-medium">URL</label>
        <Input
          :model-value="server.url"
          @update:model-value="
            (v: string | number) => mcpStore.updateServer(server.id, { url: String(v) })
          "
          placeholder="http://localhost:3000/mcp"
        />
        <p class="text-xs text-muted-foreground">Streamable HTTP 端点地址</p>
      </div>

      <!-- Headers -->
      <div class="space-y-2">
        <label class="text-sm font-medium">自定义 Headers（可选）</label>
        <div class="space-y-2">
          <div v-for="(_, key) in headers" :key="key" class="flex items-center gap-2">
            <Input
              :model-value="key"
              class="flex-1"
              placeholder="Header 名"
              @update:model-value="
                (newKey: string | number) => renameHeader(key as string, String(newKey))
              "
            />
            <Input
              :model-value="headers[key as string]"
              class="flex-1"
              placeholder="值"
              @update:model-value="
                (v: string | number) => updateHeaderValue(key as string, String(v))
              "
            />
            <Button
              variant="ghost"
              size="icon-sm"
              class="size-8 flex-shrink-0"
              @click="removeHeader(key as string)"
            >
              <XMarkIcon class="h-4 w-4 text-muted-foreground" />
            </Button>
          </div>
        </div>
        <Button variant="outline" size="sm" @click="addHeader">
          <PlusIcon class="mr-1 h-3.5 w-3.5" />
          添加 Header
        </Button>
      </div>

      <!-- 启用开关 -->
      <div class="flex items-center justify-between">
        <div>
          <p class="text-sm font-medium">启用</p>
          <p class="text-xs text-muted-foreground">启用后将自动连接</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          :class="server.enabled ? 'border-emerald-500 text-emerald-600' : ''"
          @click="handleToggleEnabled(!server.enabled)"
        >
          {{ server.enabled ? '已启用' : '已禁用' }}
        </Button>
      </div>

      <!-- 连接状态与操作 -->
      <div class="space-y-3 rounded-lg border border-border p-4">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <span class="h-2.5 w-2.5 rounded-full" :class="statusColor" />
            <span class="text-sm">{{ statusText }}</span>
          </div>
          <Button
            v-if="state?.status === 'connected'"
            variant="outline"
            size="sm"
            @click="mcpStore.disconnectServer(server.id)"
          >
            断开
          </Button>
          <Button
            v-else
            size="sm"
            :disabled="!server.url || state?.status === 'connecting'"
            @click="mcpStore.connectServer(server.id)"
          >
            {{ state?.status === 'connecting' ? '连接中...' : '连接' }}
          </Button>
        </div>

        <p v-if="state?.error" class="text-xs text-destructive">
          {{ state.error }}
        </p>
      </div>

      <!-- 工具列表 -->
      <div v-if="state?.tools.length" class="space-y-2">
        <label class="text-sm font-medium">已发现工具 ({{ state.tools.length }})</label>
        <div class="space-y-1 rounded-lg border border-border p-2">
          <div
            v-for="tool in state.tools"
            :key="tool.name"
            class="rounded-md px-3 py-2 hover:bg-muted/50"
          >
            <p class="text-sm font-medium">{{ tool.name }}</p>
            <p v-if="tool.description" class="text-xs text-muted-foreground">
              {{ tool.description }}
            </p>
          </div>
        </div>
      </div>
    </div>
  </ScrollArea>
</template>

<script setup lang="ts">
import { computed, reactive, watch } from 'vue'
import { PlusIcon, XMarkIcon } from '@heroicons/vue/24/outline'
import { useMcpStore } from '../../stores/mcpStore'
import type { McpServerConfig } from '../../types/mcp'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { ScrollArea } from '../ui/scroll-area'

const props = defineProps<{
  server: McpServerConfig
}>()

const mcpStore = useMcpStore()

const state = computed(() => mcpStore.getServerState(props.server.id))

const headers = reactive<Record<string, string>>({})

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

const statusColor = computed(() => {
  switch (state.value?.status) {
    case 'connected':
      return 'bg-emerald-500'
    case 'connecting':
      return 'bg-amber-500 animate-pulse'
    case 'error':
      return 'bg-destructive'
    default:
      return 'bg-muted-foreground/30'
  }
})

const statusText = computed(() => {
  switch (state.value?.status) {
    case 'connected':
      return '已连接'
    case 'connecting':
      return '连接中...'
    case 'error':
      return '连接失败'
    default:
      return '未连接'
  }
})
</script>
