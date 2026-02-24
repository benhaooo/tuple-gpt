<template>
  <div>
    <div class="mb-4">
      <h2 class="text-xl font-semibold text-text-primary">AI 服务商配置</h2>
      <p class="text-text-secondary text-sm mt-1">
        管理你的 AI 服务商和模型。支持 OpenAI / Claude / Gemini 格式。
      </p>
    </div>

    <div class="flex border border-border rounded-lg overflow-hidden bg-background" style="min-height: 520px;">
      <!-- Left sidebar: provider list -->
      <div class="w-52 flex-shrink-0 border-r border-border flex flex-col">
        <!-- Preset providers -->
        <div class="p-2 flex-1 overflow-y-auto">
          <div class="text-xs text-muted-foreground px-2 py-1 font-medium">默认服务商</div>
          <button
            v-for="p in providerStore.presetProviders"
            :key="p.id"
            @click="providerStore.selectProvider(p.id)"
            class="w-full text-left px-3 py-2 rounded-md text-sm flex items-center gap-2 transition-colors"
            :class="providerStore.selectedProviderId === p.id
              ? 'bg-primary/10 text-primary font-medium'
              : 'text-foreground hover:bg-accent'"
          >
            <span class="h-2 w-2 rounded-full flex-shrink-0"
              :class="p.apiKey ? 'bg-green-500' : 'bg-muted-foreground/30'"
            />
            <span class="truncate">{{ p.name }}</span>
          </button>

          <!-- Custom providers -->
          <template v-if="providerStore.customProviders.length > 0">
            <div class="text-xs text-muted-foreground px-2 py-1 mt-3 font-medium">自定义服务商</div>
            <div
              v-for="p in providerStore.customProviders"
              :key="p.id"
              class="group relative"
            >
              <button
                @click="providerStore.selectProvider(p.id)"
                class="w-full text-left px-3 py-2 rounded-md text-sm flex items-center gap-2 transition-colors"
                :class="providerStore.selectedProviderId === p.id
                  ? 'bg-primary/10 text-primary font-medium'
                  : 'text-foreground hover:bg-accent'"
              >
                <span class="h-2 w-2 rounded-full flex-shrink-0"
                  :class="p.apiKey ? 'bg-green-500' : 'bg-muted-foreground/30'"
                />
                <span class="truncate">{{ p.name }}</span>
              </button>
              <button
                @click.stop="providerStore.removeProvider(p.id)"
                class="absolute right-1 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                title="删除"
              >
                <XMarkIcon class="h-3.5 w-3.5" />
              </button>
            </div>
          </template>
        </div>

        <!-- Add custom button -->
        <div class="p-2 border-t border-border">
          <button
            @click="showAddDialog = true"
            class="w-full px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-accent rounded-md flex items-center gap-2 transition-colors"
          >
            <PlusIcon class="h-4 w-4" />
            添加自定义
          </button>
        </div>
      </div>

      <!-- Right panel: provider detail -->
      <div class="flex-1 min-w-0">
        <ProviderDetailPanel
          v-if="providerStore.selectedProvider"
          :provider="providerStore.selectedProvider"
        />
        <div v-else class="flex items-center justify-center h-full text-muted-foreground text-sm">
          选择一个服务商查看详情
        </div>
      </div>
    </div>

    <AddProviderDialog v-model="showAddDialog" @created="onProviderCreated" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { PlusIcon, XMarkIcon } from '@heroicons/vue/24/outline'
import { useProviderStore } from '../../stores/providerStore'
import ProviderDetailPanel from './ProviderDetailPanel.vue'
import AddProviderDialog from './AddProviderDialog.vue'

const providerStore = useProviderStore()
const showAddDialog = ref(false)

onMounted(() => {
  providerStore.seedPresets()
})

function onProviderCreated(id: string) {
  providerStore.selectProvider(id)
}
</script>
