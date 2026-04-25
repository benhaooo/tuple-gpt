<template>
  <Dialog :open="open" @update:open="$emit('update:open', $event)">
    <DialogContent
      class="!grid !grid-rows-[auto_auto_1fr_auto] max-h-[80vh] max-w-lg gap-0 overflow-hidden p-0"
      :show-close-button="false"
    >
      <DialogHeader class="px-4 pt-4 pb-3">
        <DialogTitle>选择模型</DialogTitle>
      </DialogHeader>

      <!-- Search -->
      <div class="border-b px-4 pb-3">
        <Input v-model="search" placeholder="搜索模型..." />
      </div>

      <!-- Model list -->
      <ScrollArea class="overflow-hidden">
        <div
          v-if="fetching"
          class="flex items-center justify-center py-12 text-sm text-muted-foreground"
        >
          获取中...
        </div>
        <div v-else-if="fetchError" class="px-4 py-12 text-center text-sm text-destructive">
          {{ fetchError }}
        </div>
        <div
          v-else-if="filteredModels.length === 0 && search"
          class="px-4 py-12 text-center text-sm text-muted-foreground"
        >
          无匹配结果
        </div>
        <div v-else class="p-1">
          <div
            v-for="model in filteredModels"
            :key="model"
            class="flex items-center justify-between rounded-md px-3 py-2 text-sm hover:bg-accent"
          >
            <div class="flex min-w-0 items-center gap-2">
              <ModelAvatar :model-id="model" :size="16" />
              <span class="truncate text-foreground">{{ model }}</span>
            </div>
            <Button
              v-if="selectedModels.has(model)"
              variant="ghost"
              size="icon-sm"
              class="size-7 flex-shrink-0"
              @click="toggleModel(model)"
            >
              <MinusIcon class="h-4 w-4 text-destructive" />
            </Button>
            <Button
              v-else
              variant="ghost"
              size="icon-sm"
              class="size-7 flex-shrink-0"
              @click="toggleModel(model)"
            >
              <PlusIcon class="h-4 w-4 text-emerald-500" />
            </Button>
          </div>
        </div>
      </ScrollArea>

      <!-- Footer -->
      <div class="flex items-center justify-between border-t px-4 py-3">
        <span class="text-xs text-muted-foreground">
          已选 {{ selectedModels.size }} / {{ remoteModels.length }} 个模型
        </span>
        <div class="flex gap-2">
          <Button variant="outline" size="sm" @click="$emit('update:open', false)">取消</Button>
          <Button size="sm" @click="handleConfirm">确定</Button>
        </div>
      </div>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { PlusIcon, MinusIcon } from '@heroicons/vue/24/outline'
import { fetchModels } from '../../adapters/fetch-models'
import type { Provider } from '../../types'
import ModelAvatar from './ModelAvatar.vue'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { ScrollArea } from '../ui/scroll-area'

const props = defineProps<{
  open: boolean
  provider: Provider
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  confirm: [models: string[]]
}>()

const search = ref('')
const fetching = ref(false)
const fetchError = ref('')
const remoteModels = ref<string[]>([])
const selectedModels = ref<Set<string>>(new Set())

const filteredModels = computed(() => {
  const q = search.value.trim().toLowerCase()
  if (!q) return remoteModels.value
  return remoteModels.value.filter(m => m.toLowerCase().includes(q))
})

function toggleModel(model: string) {
  const next = new Set(selectedModels.value)
  if (next.has(model)) {
    next.delete(model)
  } else {
    next.add(model)
  }
  selectedModels.value = next
}

function handleConfirm() {
  emit('confirm', [...selectedModels.value])
  emit('update:open', false)
}

watch(
  () => props.open,
  async open => {
    if (!open) return
    search.value = ''
    fetchError.value = ''
    remoteModels.value = []
    selectedModels.value = new Set(props.provider.models)
    fetching.value = true
    try {
      const result = await fetchModels({
        baseUrl: props.provider.baseUrl,
        apiKey: props.provider.apiKey,
      })
      if (result.success) {
        remoteModels.value = result.models
      } else {
        fetchError.value = result.error || '获取失败'
      }
    } finally {
      fetching.value = false
    }
  },
)
</script>
