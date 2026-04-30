<template>
  <Dialog :open="modelValue" @update:open="$emit('update:modelValue', $event)">
    <DialogContent class="max-w-md" :show-close-button="false" @pointer-down-outside.prevent>
      <DialogHeader>
        <DialogTitle>添加自定义服务商</DialogTitle>
      </DialogHeader>
      <div class="space-y-4">
        <div>
          <Label class="mb-1.5">服务商名称</Label>
          <Input v-model="name" placeholder="例如: My Provider" />
        </div>
        <div>
          <Label class="mb-1.5">API 格式</Label>
          <Select v-model="format">
            <SelectTrigger class="w-full">
              <SelectValue placeholder="选择 API 格式" />
            </SelectTrigger>
            <SelectContent alignItemWithTrigger="{true}">
              <SelectItem value="openai"> OpenAI 兼容 </SelectItem>
              <SelectItem value="claude"> Claude </SelectItem>
              <SelectItem value="gemini"> Gemini </SelectItem>
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <Button variant="outline" @click="$emit('update:modelValue', false)">取消</Button>
          <Button :disabled="!name.trim()" @click="handleCreate">创建</Button>
        </DialogFooter>
      </div>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useProviderStore } from '../../stores/providerStore'
import type { ApiFormat } from '@tuple-gpt/chat-core'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog'
import { Input } from '../ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { Button } from '../ui/button'
import { Label } from '../ui/label'

const props = defineProps<{ modelValue: boolean }>()
const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  created: [id: string]
}>()

const providerStore = useProviderStore()
const name = ref('')
const format = ref<ApiFormat>('openai')

watch(
  () => props.modelValue,
  v => {
    if (v) {
      name.value = ''
      format.value = 'openai'
    }
  },
)

function handleCreate() {
  const provider = providerStore.addProvider({
    name: name.value.trim(),
    baseUrl: '',
    apiKey: '',
    format: format.value,
    models: [],
  })
  emit('update:modelValue', false)
  emit('created', provider.id)
}
</script>
