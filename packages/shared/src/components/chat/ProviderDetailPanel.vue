<template>
  <div class="p-5 overflow-y-auto h-full">
    <!-- Header -->
    <div class="flex items-center gap-2 mb-5">
      <h3 class="text-lg font-semibold text-foreground">{{ provider.name }}</h3>
      <span class="px-2 py-0.5 text-xs rounded-full bg-muted text-muted-foreground">
        {{ formatLabels[provider.format] }}
      </span>
    </div>

    <!-- API Key -->
    <div class="mb-5">
      <label class="block text-sm font-medium text-foreground mb-1.5">API Key</label>
      <div class="flex gap-2">
        <div class="relative flex-1">
          <Input
            v-model="localApiKey"
            :type="showKey ? 'text' : 'password'"
            placeholder="输入 API Key"
            class="pr-10"
            @change="saveApiKey"
          />
          <button
            @click="showKey = !showKey"
            class="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <EyeIcon v-if="!showKey" class="h-4 w-4" />
            <EyeSlashIcon v-else class="h-4 w-4" />
          </button>
        </div>
        <Button :disabled="!localApiKey || verifying" @click="handleVerify">
          {{ verifying ? '验证中...' : '验证' }}
        </Button>
      </div>
      <p v-if="verifyResult" class="text-xs mt-1.5" :class="verifyResult.valid ? 'text-green-600' : 'text-red-500'">
        {{ verifyResult.valid ? '✓ 验证通过' : `✗ ${verifyResult.error}` }}
      </p>
    </div>

    <!-- API Host -->
    <div class="mb-5">
      <label class="block text-sm font-medium text-foreground mb-1.5">API Host</label>
      <Input
        v-model="localBaseUrl"
        placeholder="https://api.openai.com"
        @change="saveBaseUrl"
      />
      <p class="text-xs text-muted-foreground mt-1.5">
        预览: <span class="text-foreground/70">{{ previewUrl }}</span>
      </p>
    </div>

    <!-- Models -->
    <div>
      <div class="flex items-center justify-between mb-2">
        <label class="text-sm font-medium text-foreground">模型列表</label>
        <div class="flex items-center gap-1">
          <Button size="sm" variant="outline" @click="addingModel = true">
            <PlusIcon2 class="h-3.5 w-3.5" />
            新增
          </Button>
          <Button
            v-if="provider.presetId"
            size="sm"
            variant="outline"
            @click="handleReset"
          >
            重置
          </Button>
          <Button
            size="sm"
            variant="outline"
            :disabled="!provider.apiKey || fetching"
            @click="handleFetch"
          >
            {{ fetching ? '获取中...' : '获取' }}
          </Button>
        </div>
      </div>

      <!-- Add model input -->
      <div v-if="addingModel" class="flex gap-2 mb-2">
        <Input
          v-model="newModelId"
          placeholder="输入模型 ID"
          class="h-8 flex-1"
          @keyup.enter="confirmAddModel"
          ref="addModelInput"
        />
        <Button size="sm" @click="confirmAddModel" :disabled="!newModelId.trim()">
          确定
        </Button>
        <Button size="sm" variant="outline" @click="addingModel = false; newModelId = ''">
          取消
        </Button>
      </div>

      <!-- Fetch error -->
      <p v-if="fetchError" class="text-xs text-red-500 mb-2">{{ fetchError }}</p>

      <!-- Model list -->
      <div v-if="provider.models.length > 0" class="space-y-1">
        <div
          v-for="model in provider.models"
          :key="model"
          class="group flex items-center justify-between px-3 py-1.5 rounded-md hover:bg-accent text-sm"
        >
          <span class="text-foreground truncate">{{ model }}</span>
          <button
            @click="removeModel(model)"
            class="p-0.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <XMarkIcon class="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      <p v-else class="text-xs text-muted-foreground py-3 text-center">
        暂无模型，点击"获取"自动拉取或手动"新增"
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import { EyeIcon, EyeSlashIcon, XMarkIcon, PlusIcon as PlusIcon2 } from '@heroicons/vue/24/outline'
import { useProviderStore } from '../../stores/providerStore'
import type { Provider, ApiFormat } from '../../types'
import { Input } from '../ui/input'
import { Button } from '../ui/button'

const props = defineProps<{ provider: Provider }>()
const providerStore = useProviderStore()

const formatLabels: Record<ApiFormat, string> = {
  openai: 'OpenAI 兼容',
  claude: 'Claude',
  gemini: 'Gemini',
}

// Local editable state
const localApiKey = ref(props.provider.apiKey)
const localBaseUrl = ref(props.provider.baseUrl)
const showKey = ref(false)
const verifying = ref(false)
const verifyResult = ref<{ valid: boolean; error?: string } | null>(null)
const fetching = ref(false)
const fetchError = ref('')
const addingModel = ref(false)
const newModelId = ref('')
const addModelInput = ref<{ focus: () => void } | null>(null)

// Sync local state when provider changes
watch(() => props.provider.id, () => {
  localApiKey.value = props.provider.apiKey
  localBaseUrl.value = props.provider.baseUrl
  showKey.value = false
  verifyResult.value = null
  fetchError.value = ''
  addingModel.value = false
  newModelId.value = ''
})

// URL preview
const previewUrl = computed(() => {
  const base = localBaseUrl.value.replace(/\/+$/, '')
  switch (props.provider.format) {
    case 'openai': return `${base}/v1/chat/completions`
    case 'claude': return `${base}/v1/messages`
    case 'gemini': return `${base}/v1beta/models/{model}:generateContent`
    default: return base
  }
})

function saveApiKey() {
  providerStore.updateProvider(props.provider.id, { apiKey: localApiKey.value })
  verifyResult.value = null
}

function saveBaseUrl() {
  providerStore.updateProvider(props.provider.id, { baseUrl: localBaseUrl.value })
}

async function handleVerify() {
  saveApiKey()
  verifying.value = true
  verifyResult.value = null
  try {
    verifyResult.value = await providerStore.checkApiKey(props.provider.id)
  } finally {
    verifying.value = false
  }
}

async function handleFetch() {
  fetching.value = true
  fetchError.value = ''
  try {
    const result = await providerStore.fetchModelsForProvider(props.provider.id)
    if (!result.success) {
      fetchError.value = result.error || '获取失败'
    }
  } finally {
    fetching.value = false
  }
}

function handleReset() {
  providerStore.resetModels(props.provider.id)
}

function confirmAddModel() {
  const id = newModelId.value.trim()
  if (!id || props.provider.models.includes(id)) return
  providerStore.updateProvider(props.provider.id, {
    models: [...props.provider.models, id],
  })
  newModelId.value = ''
}

function removeModel(model: string) {
  providerStore.updateProvider(props.provider.id, {
    models: props.provider.models.filter(m => m !== model),
  })
}

watch(addingModel, (v) => {
  if (v) nextTick(() => addModelInput.value?.focus())
})
</script>
