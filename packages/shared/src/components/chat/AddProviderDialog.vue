<template>
  <Dialog
    :open="modelValue"
    @update:open="$emit('update:modelValue', $event)"
  >
    <DialogContent
      class="max-w-md"
      :show-close-button="false"
      @pointer-down-outside.prevent
    >
      <div class="p-6 space-y-4">
        <h3 class="text-lg font-semibold text-foreground">添加自定义服务商</h3>
        <div>
          <label class="block text-sm font-medium mb-1">服务商名称</label>
          <Input v-model="name" placeholder="例如: My Provider" />
        </div>
        <div>
          <label class="block text-sm font-medium mb-1">API 格式</label>
          <Select v-model="format">
            <SelectTrigger class="w-full">
              <SelectValue placeholder="选择 API 格式" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="openai">
                OpenAI 兼容
              </SelectItem>
              <SelectItem value="claude">
                Claude
              </SelectItem>
              <SelectItem value="gemini">
                Gemini
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div class="flex justify-end gap-2 pt-2">
          <Button variant="outline" @click="$emit('update:modelValue', false)">取消</Button>
          <Button :disabled="!name.trim()" @click="handleCreate">创建</Button>
        </div>
      </div>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useProviderStore } from '../../stores/providerStore'
import type { ApiFormat } from '../../types'
import { Dialog, DialogContent } from '../ui/dialog'
import { Input } from '../ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select'
import { Button } from '../ui/button'

const props = defineProps<{ modelValue: boolean }>()
const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'created': [id: string]
}>()

const providerStore = useProviderStore()
const name = ref('')
const format = ref<ApiFormat>('openai')

watch(() => props.modelValue, (v) => {
  if (v) {
    name.value = ''
    format.value = 'openai'
  }
})

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
