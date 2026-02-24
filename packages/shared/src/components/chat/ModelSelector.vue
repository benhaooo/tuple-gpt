<template>
  <div class="relative">
    <button
      @click="open = !open"
      class="flex items-center gap-1 px-2 py-1 text-xs font-medium text-muted-foreground hover:text-foreground rounded-md hover:bg-accent transition-colors"
    >
      <span class="truncate max-w-28">{{ displayLabel }}</span>
      <ChevronDownIcon class="h-3 w-3 flex-shrink-0" />
    </button>

    <!-- Dropdown -->
    <div v-if="open" class="absolute top-full right-0 mt-1 w-56 bg-popover border border-border rounded-md shadow-lg z-50">
      <div class="py-1 max-h-64 overflow-y-auto">
        <template v-for="group in groupedModels" :key="group.providerName">
          <!-- Provider group header -->
          <div class="px-3 py-1.5 text-xs font-semibold text-muted-foreground bg-muted/50 sticky top-0">
            {{ group.providerName }}
          </div>
          <!-- Models under this provider -->
          <button
            v-for="item in group.models"
            :key="`${item.providerId}-${item.model}`"
            @click="selectModel(item.providerId, item.model)"
            class="w-full text-left px-3 py-1.5 text-xs hover:bg-accent transition-colors flex items-center gap-2"
            :class="{ 'bg-accent/50': isActive(item.providerId, item.model) }"
          >
            <span class="w-1 h-1 rounded-full flex-shrink-0" :class="isActive(item.providerId, item.model) ? 'bg-primary' : 'bg-transparent'"></span>
            <span class="truncate text-foreground">{{ item.model }}</span>
          </button>
        </template>

        <div v-if="providerStore.allModels.length === 0" class="px-3 py-3 text-xs text-muted-foreground text-center">
          暂无可用模型，请在设置页配置服务商
        </div>
      </div>
    </div>

    <!-- Click-away overlay -->
    <div v-if="open" class="fixed inset-0 z-40" @click="open = false"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { ChevronDownIcon } from '@heroicons/vue/24/outline'
import { useProviderStore } from '../../stores/providerStore'

const providerStore = useProviderStore()
const open = ref(false)

const groupedModels = computed(() => {
  const groups: Array<{ providerName: string; models: Array<{ providerId: string; model: string }> }> = []
  console.log("🚀 ~ providerStore.allModels:", providerStore.allModels)

  for (const item of providerStore.allModels) {
    let group = groups.find(g => g.providerName === item.providerName)
    if (!group) {
      group = { providerName: item.providerName, models: [] }
      groups.push(group)
    }
    group.models.push({ providerId: item.providerId, model: item.model })
  }
  return groups
})

const displayLabel = computed(() => {
  const sel = providerStore.activeModel
  if (!sel) return '选择模型'
  return sel.model
})

function isActive(providerId: string, model: string): boolean {
  const sel = providerStore.activeModel
  return sel?.providerId === providerId && sel?.model === model
}

function selectModel(providerId: string, model: string) {
  providerStore.setActiveModel({ providerId, model })
  open.value = false
}
</script>
