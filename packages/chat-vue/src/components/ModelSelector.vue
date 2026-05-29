<template>
  <Popover v-model:open="open">
    <PopoverTrigger as-child>
      <Button variant="ghost" size="sm" :class="resolvedTriggerClass">
        <span class="flex min-w-0 items-center gap-2">
          <ModelAvatar :model-id="activeModelId" :size="16" />
          <span class="truncate">{{ displayLabel }}</span>
        </span>
        <ChevronDownIcon class="h-3.5 w-3.5 shrink-0" />
      </Button>
    </PopoverTrigger>

    <PopoverContent align="center" class="w-64 p-0">
      <Command :model-value="selectedModelKey">
        <CommandInput placeholder="搜索模型..." />
        <CommandList>
          <CommandEmpty>{{ emptyText }}</CommandEmpty>
          <CommandGroup
            v-for="group in groupedModels"
            :key="group.providerId"
            :heading="group.providerName"
          >
            <CommandItem
              v-for="item in group.models"
              :key="modelKey({ providerId: item.providerId, model: item.model })"
              :value="modelKey({ providerId: item.providerId, model: item.model })"
              @select="selectModel(item.providerId, item.model)"
              class="text-xs"
            >
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
import { ChevronDownIcon } from '@heroicons/vue/24/outline'
import type { ModelSelection } from '@tuple-gpt/chat-core'
import { useProviderStore } from '#stores/provider'
import ModelAvatar from './ModelAvatar.vue'
import {
  Button,
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@tuple-gpt/ui-vue'

const props = withDefaults(
  defineProps<{
    modelValue: ModelSelection | null
    placeholder?: string
    emptyText?: string
    triggerClass?: string
  }>(),
  {
    placeholder: '选择模型',
    emptyText: '暂无可用模型，请先配置服务商',
    triggerClass: '',
  },
)

const emit = defineEmits<{
  (e: 'update:modelValue', value: ModelSelection): void
}>()

const providerStore = useProviderStore()
const open = ref(false)

const DEFAULT_TRIGGER_CLASS =
  'h-9 w-full justify-between gap-2 rounded-md border border-input bg-background px-3 text-sm font-normal shadow-sm hover:bg-accent hover:text-accent-foreground data-[state=open]:bg-accent data-[state=open]:text-accent-foreground'

const resolvedTriggerClass = computed(() => props.triggerClass || DEFAULT_TRIGGER_CLASS)

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

const displayLabel = computed(() => props.modelValue?.model ?? props.placeholder)

const activeModelId = computed(() => props.modelValue?.model ?? '')

const selectedModelKey = computed(() => (props.modelValue ? modelKey(props.modelValue) : undefined))

function modelKey(selection: ModelSelection): string {
  return JSON.stringify(selection)
}

function selectModel(providerId: string, model: string) {
  emit('update:modelValue', { providerId, model })
  open.value = false
}
</script>
