<template>
  <div class="flex flex-col gap-4">
    <Card class="min-h-0 flex-1 gap-0 overflow-hidden py-0">
      <div class="flex h-full">
        <div class="flex w-56 flex-shrink-0 flex-col overflow-hidden border-r border-border">
          <ScrollArea class="min-h-0 flex-1">
            <div class="space-y-3 p-2">
              <div>
                <p class="px-2 py-1 text-xs font-medium text-muted-foreground">默认服务商</p>
                <div class="space-y-1">
                  <Button
                    v-for="p in providerStore.presetProviders"
                    :key="p.id"
                    variant="ghost"
                    class="h-9 w-full justify-start gap-2 px-3 text-sm font-normal"
                    :class="
                      providerStore.selectedProviderId === p.id &&
                      'bg-accent text-accent-foreground hover:bg-accent'
                    "
                    @click="providerStore.selectProvider(p.id)"
                  >
                    <span
                      class="h-2 w-2 flex-shrink-0 rounded-full"
                      :class="p.apiKey ? 'bg-emerald-500' : 'bg-muted-foreground/30'"
                    />
                    <span class="truncate">{{ p.name }}</span>
                  </Button>
                </div>
              </div>

              <div v-if="providerStore.customProviders.length > 0">
                <p class="px-2 py-1 text-xs font-medium text-muted-foreground">自定义服务商</p>
                <div class="space-y-1">
                  <div
                    v-for="p in providerStore.customProviders"
                    :key="p.id"
                    class="group flex items-center gap-1"
                  >
                    <Button
                      variant="ghost"
                      class="h-9 min-w-0 flex-1 justify-start gap-2 px-3 text-sm font-normal"
                      :class="
                        providerStore.selectedProviderId === p.id &&
                        'bg-accent text-accent-foreground hover:bg-accent'
                      "
                      @click="providerStore.selectProvider(p.id)"
                    >
                      <span
                        class="h-2 w-2 flex-shrink-0 rounded-full"
                        :class="p.apiKey ? 'bg-emerald-500' : 'bg-muted-foreground/30'"
                      />
                      <span class="truncate">{{ p.name }}</span>
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
                          <AlertDialogTitle>删除服务商？</AlertDialogTitle>
                          <AlertDialogDescription>
                            删除后将清空该服务商的配置和模型列表，且无法恢复。
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>取消</AlertDialogCancel>
                          <AlertDialogAction @click="providerStore.removeProvider(p.id)">
                            删除
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </div>
            </div>
          </ScrollArea>

          <div class="border-t border-border p-2">
            <Button
              variant="outline"
              class="w-full justify-start gap-2"
              @click="showAddDialog = true"
            >
              <PlusIcon class="h-4 w-4" />
              添加自定义
            </Button>
          </div>
        </div>

        <div class="min-w-0 flex-1">
          <ProviderDetailPanel
            v-if="providerStore.selectedProvider"
            :provider="providerStore.selectedProvider"
          />
          <div v-else class="flex h-full items-center justify-center text-sm text-muted-foreground">
            选择一个服务商查看详情
          </div>
        </div>
      </div>
    </Card>

    <AddProviderDialog v-model="showAddDialog" @created="onProviderCreated" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { PlusIcon, XMarkIcon } from '@heroicons/vue/24/outline'
import { useProviderStore } from '../../stores/providerStore'
import ProviderDetailPanel from './ProviderDetailPanel.vue'
import AddProviderDialog from './AddProviderDialog.vue'
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
} from '../ui/alert-dialog'
import { Button } from '../ui/button'
import { Card } from '../ui/card'
import { ScrollArea } from '../ui/scroll-area'

const providerStore = useProviderStore()
const showAddDialog = ref(false)

onMounted(() => {
  providerStore.seedPresets()
})

function onProviderCreated(id: string) {
  providerStore.selectProvider(id)
}
</script>
