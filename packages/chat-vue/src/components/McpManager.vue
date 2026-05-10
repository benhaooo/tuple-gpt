<template>
  <div class="flex flex-col gap-4">
    <Card class="min-h-0 flex-1 gap-0 overflow-hidden py-0">
      <div class="flex h-full">
        <!-- 左栏：Server 列表 -->
        <div class="flex w-56 flex-shrink-0 flex-col overflow-hidden border-r border-border">
          <ScrollArea class="min-h-0 flex-1">
            <div class="space-y-1 p-2">
              <div
                v-for="server in mcpStore.servers"
                :key="server.id"
                class="group flex items-center gap-1"
              >
                <Button
                  variant="ghost"
                  class="h-9 min-w-0 flex-1 justify-start gap-2 px-3 text-sm font-normal"
                  :class="
                    mcpStore.selectedServerId === server.id &&
                    'bg-accent text-accent-foreground hover:bg-accent'
                  "
                  @click="mcpStore.selectServer(server.id)"
                >
                  <span
                    class="h-2 w-2 flex-shrink-0 rounded-full"
                    :class="statusColor(server.id)"
                  />
                  <span class="min-w-0 flex-1 truncate">{{ server.name }}</span>
                  <span class="text-xs text-muted-foreground">
                    {{ toolCount(server.id) }}
                  </span>
                </Button>

                <AlertDialog>
                  <AlertDialogTrigger as-child>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      class="size-7 flex-shrink-0 opacity-0 group-hover:opacity-100"
                    >
                      <XMarkIcon class="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>删除 MCP Server？</AlertDialogTitle>
                      <AlertDialogDescription>
                        删除后将断开连接并清除配置，且无法恢复。
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>取消</AlertDialogCancel>
                      <AlertDialogAction @click="mcpStore.removeServer(server.id)">
                        删除
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>

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
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { PlusIcon, XMarkIcon } from '@heroicons/vue/24/outline'
import { useMcpStore } from '#stores/mcp'
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
  AlertDialogTrigger,
} from '@tuple-gpt/ui-vue/components/ui/alert-dialog'
import { Button } from '@tuple-gpt/ui-vue/components/ui/button'
import { Card } from '@tuple-gpt/ui-vue/components/ui/card'
import { ScrollArea } from '@tuple-gpt/ui-vue/components/ui/scroll-area'

const mcpStore = useMcpStore()

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

function handleAdd() {
  const server = mcpStore.addServer({
    name: `Server ${mcpStore.servers.length + 1}`,
    url: '',
  })
  mcpStore.selectServer(server.id)
}
</script>
