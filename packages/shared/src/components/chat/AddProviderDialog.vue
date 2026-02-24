<template>
  <el-dialog
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
    title="添加自定义服务商"
    width="400px"
    :close-on-click-modal="false"
  >
    <div class="space-y-4">
      <div>
        <label class="block text-sm font-medium mb-1">服务商名称</label>
        <el-input v-model="name" placeholder="例如: My Provider" />
      </div>
      <div>
        <label class="block text-sm font-medium mb-1">API 格式</label>
        <el-select v-model="format" class="w-full">
          <el-option label="OpenAI 兼容" value="openai" />
          <el-option label="Claude" value="claude" />
          <el-option label="Gemini" value="gemini" />
        </el-select>
      </div>
    </div>
    <template #footer>
      <el-button @click="$emit('update:modelValue', false)">取消</el-button>
      <el-button type="primary" :disabled="!name.trim()" @click="handleCreate">创建</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useProviderStore } from '../../stores/providerStore'
import type { ApiFormat } from '../../types'

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
