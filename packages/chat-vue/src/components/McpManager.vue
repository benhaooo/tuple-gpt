<template>
  <div class="flex flex-col gap-4">
    <Card class="min-h-0 flex-1 gap-0 overflow-hidden py-0">
      <div class="flex h-full">
        <!-- 左栏：Server 列表 -->
        <div class="flex w-56 flex-shrink-0 flex-col overflow-hidden border-r border-border">
          <ScrollArea class="min-h-0 flex-1">
            <div class="space-y-1 p-2">
              <McpServerRow
                v-for="server in mcpStore.servers"
                :key="server.id"
                :server="server"
                :selected="mcpStore.selectedServerId === server.id"
                :renaming="renamingId === server.id"
                :status-color="statusColor(server.id)"
                :tool-count="toolCount(server.id)"
                @select="mcpStore.selectServer(server.id)"
                @rename-start="renamingId = server.id"
                @rename-commit="commitRename(server.id, $event)"
                @rename-cancel="renamingId = null"
                @delete="confirmDeleteId = server.id"
              />

              <div
                v-if="mcpStore.servers.length === 0"
                class="px-2 py-4 text-center text-xs text-muted-foreground"
              >
                暂无 MCP Server
              </div>
            </div>
          </ScrollArea>

          <div class="border-t border-border p-2">
            <Button variant="outline" class="w-full justify-start gap-2" @click="handleAdd">
              <PlusIcon class="h-4 w-4" />
              添加 Server
            </Button>
          </div>
        </div>

        <!-- 右栏：详情编辑 -->
        <div class="min-w-0 flex-1">
          <McpServerDetail v-if="mcpStore.selectedServer" :server="mcpStore.selectedServer" />
          <div v-else class="flex h-full items-center justify-center text-sm text-muted-foreground">
            选择一个 Server 查看详情
          </div>
        </div>
      </div>
    </Card>

    <AlertDialog
      :open="confirmDeleteId !== null"
      @update:open="v => !v && (confirmDeleteId = null)"
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>删除 MCP Server？</AlertDialogTitle>
          <AlertDialogDescription>
            删除后将断开连接并清除配置，且无法恢复。
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel @click="confirmDeleteId = null">取消</AlertDialogCancel>
          <AlertDialogAction @click="handleDeleteConfirmed">删除</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { PlusIcon } from '@heroicons/vue/24/outline'
import { useMcpStore } from '#stores/mcp'
import McpServerRow from './McpServerRow.vue'
import McpServerDetail from './McpServerDetail.vue'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Button,
  Card,
  ScrollArea,
} from '@tuple-gpt/ui-vue'

const mcpStore = useMcpStore()
const renamingId = ref<string | null>(null)
const confirmDeleteId = ref<string | null>(null)

onMounted(() => {
  mcpStore.initRuntimeStates()
})

function statusColor(serverId: string) {
  const state = mcpStore.getServerState(serverId)
  switch (state?.status) {
    case 'connected':
      return 'bg-emerald-500'
    case 'connecting':
      return 'bg-amber-500 animate-pulse'
    case 'error':
      return 'bg-destructive'
    default:
      return 'bg-muted-foreground/30'
  }
}

function toolCount(serverId: string) {
  const state = mcpStore.getServerState(serverId)
  const count = state?.tools.length ?? 0
  return count > 0 ? `${count}` : ''
}

function commitRename(id: string, name: string) {
  const trimmed = name.trim()
  if (trimmed) {
    mcpStore.updateServer(id, { name: trimmed })
  }
  renamingId.value = null
}

function handleDeleteConfirmed() {
  if (confirmDeleteId.value) {
    mcpStore.removeServer(confirmDeleteId.value)
  }
  confirmDeleteId.value = null
}

function handleAdd() {
  const server = mcpStore.addServer({
    name: `Server ${mcpStore.servers.length + 1}`,
    url: '',
  })
  mcpStore.selectServer(server.id)
}
</script>
