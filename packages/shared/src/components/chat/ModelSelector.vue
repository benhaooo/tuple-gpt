<template>
  <Popover v-model:open="open">
    <PopoverTrigger as-child>
      <Button
        variant="ghost"
        size="sm"
        class="h-8 max-w-56 justify-between gap-2 px-2 text-xs font-medium text-muted-foreground"
      >
        <span class="flex min-w-0 items-center gap-2">
          <ModelAvatar :model-id="activeModelId" :size="16" />
          <span class="truncate">{{ displayLabel }}</span>
        </span>
        <ChevronDownIcon class="h-3.5 w-3.5 shrink-0" />
      </Button>
    </PopoverTrigger>

    <PopoverContent align="center" class="w-64 p-0">
      <Command>
        <CommandInput placeholder="搜索模型..." />
        <CommandList>
          <CommandEmpty>暂无可用模型，请先配置服务商</CommandEmpty>
          <CommandGroup
            v-for="group in groupedModels"
            :key="group.providerId"
            :heading="group.providerName"
          >
            <CommandItem
              v-for="item in group.models"
              :key="modelKey(item.providerId, item.model)"
              :value="`${group.providerName} ${item.model} ${item.providerId}`"
              @select="selectModel(item.providerId, item.model)"
              class="text-xs"
            >
              <CheckIcon
                class="h-3.5 w-3.5"
                :class="isActive(item.providerId, item.model) ? 'opacity-100' : 'opacity-0'"
              />
              <ModelAvatar :model-id="item.model" :size="16" />
              <span class="truncate">{{ item.model }}</span>
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </Command>
    </PopoverContent>
  </Popover>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { CheckIcon, ChevronDownIcon } from '@heroicons/vue/24/outline'
import { useProviderStore } from '../../stores/providerStore'
import ModelAvatar from './ModelAvatar.vue'
import { Button } from '../ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '../ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover'

const providerStore = useProviderStore()
const open = ref(false)

const groupedModels = computed(() => {
  const groups: Array<{
    providerId: string
    providerName: string
    models: Array<{ providerId: string; model: string }>
  }> = []

  for (const item of providerStore.allModels) {
    let group = groups.find(g => g.providerId === item.providerId)
    if (!group) {
      group = { providerId: item.providerId, providerName: item.providerName, models: [] }
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

const activeModelId = computed(() => providerStore.activeModel?.model ?? '')

function modelKey(providerId: string, model: string) {
  return `${providerId}-${model}`
}

function isActive(providerId: string, model: string): boolean {
  const sel = providerStore.activeModel
  return sel?.providerId === providerId && sel?.model === model
}

function selectModel(providerId: string, model: string) {
  providerStore.setActiveModel({ providerId, model })
  open.value = false
}
</script>
