<template>
  <Dialog :open="modelValue" @update:open="$emit('update:modelValue', $event)">
    <DialogContent class="max-w-md" :show-close-button="false" @pointer-down-outside.prevent>
      <DialogHeader>
        <DialogTitle>添加自定义服务商</DialogTitle>
        <DialogDescription class="sr-only"
          >填写服务商名称并选择 API 格式以创建新的服务商</DialogDescription
        >
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
              <SelectItem :value="ProviderType.OpenAI"> OpenAI </SelectItem>
              <SelectItem :value="ProviderType.Anthropic"> Claude </SelectItem>
              <SelectItem :value="ProviderType.Gemini"> Gemini </SelectItem>
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
import { useProviderStore } from '#stores/provider'
import { ProviderType } from '@tuple-gpt/ai-core'
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@tuple-gpt/ui-vue'

const props = defineProps<{ modelValue: boolean }>()
const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  created: [id: string]
}>()

const providerStore = useProviderStore()
const name = ref('')
const format = ref<ProviderType>(ProviderType.OpenAI)

watch(
  () => props.modelValue,
  v => {
    if (v) {
      name.value = ''
      format.value = ProviderType.OpenAI
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
