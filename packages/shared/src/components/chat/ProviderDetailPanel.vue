<template>
  <div class="flex h-full flex-col overflow-hidden p-5">
    <!-- 固定区域：标题 + API 配置 -->
    <div class="space-y-5">
      <div class="flex items-center gap-3">
        <ProviderAvatar :provider="provider" :size="28" />
        <h3 class="min-w-0 truncate text-lg font-semibold text-foreground">{{ provider.name }}</h3>
        <Badge variant="secondary">
          {{ formatLabels[provider.format] }}
        </Badge>
      </div>

      <Separator />

      <div class="space-y-2">
        <Label>API Key</Label>
        <div class="flex gap-2">
          <div class="relative flex-1">
            <Input
              v-model="localApiKey"
              :type="showKey ? 'text' : 'password'"
              placeholder="输入 API Key"
              class="pr-10"
              @change="saveApiKey"
            />
            <Button
              variant="ghost"
              size="icon-sm"
              class="absolute top-1/2 right-1 -translate-y-1/2"
              @click="showKey = !showKey"
            >
              <EyeIcon v-if="!showKey" class="h-4 w-4" />
              <EyeSlashIcon v-else class="h-4 w-4" />
            </Button>
          </div>
          <Button :disabled="!localApiKey || verifying" @click="handleVerify">
            {{ verifying ? '验证中...' : '验证' }}
          </Button>
        </div>
        <p
          v-if="verifyResult"
          class="text-xs"
          :class="
            verifyResult.valid ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive'
          "
        >
          {{ verifyResult.valid ? '✓ 验证通过' : `✗ ${verifyResult.error}` }}
        </p>
      </div>

      <div class="space-y-2">
        <Label>API Host</Label>
        <Input v-model="localBaseUrl" placeholder="https://api.openai.com" @change="saveBaseUrl" />
        <p class="text-xs text-muted-foreground">
          预览: <span class="text-foreground/70">{{ previewUrl }}</span>
        </p>
      </div>

      <Separator />

      <div class="flex items-center justify-between gap-2">
        <Label>模型列表</Label>
        <div class="flex items-center gap-1">
          <Button size="sm" variant="outline" @click="addingModel = true">
            <PlusIcon2 class="h-3.5 w-3.5" />
            新增
          </Button>
          <Button v-if="provider.presetId" size="sm" variant="outline" @click="handleReset">
            重置
          </Button>
          <Button size="sm" variant="outline" :disabled="!provider.apiKey" @click="handleFetch">
            获取
          </Button>
        </div>
      </div>

      <div v-if="addingModel" class="flex gap-2">
        <Input
          ref="addModelInput"
          v-model="newModelId"
          placeholder="输入模型 ID"
          class="h-8 flex-1"
          @keyup.enter="confirmAddModel"
        />
        <Button size="sm" :disabled="!newModelId.trim()" @click="confirmAddModel"> 确定 </Button>
        <Button size="sm" variant="outline" @click="cancelAddModel"> 取消 </Button>
      </div>
    </div>

    <!-- 模型列表：占满剩余空间，超出滚动 -->
    <ScrollArea v-if="provider.models.length > 0" class="mt-2 min-h-0 flex-1 rounded-md border">
      <div class="space-y-1 p-1">
        <div
          v-for="model in provider.models"
          :key="model"
          class="group flex items-center justify-between rounded-md px-2 py-1.5 text-sm hover:bg-accent"
        >
          <div class="flex min-w-0 items-center gap-2">
            <ModelAvatar :model-id="model" :size="18" />
            <span class="truncate text-foreground">{{ model }}</span>
          </div>
          <Button
            variant="ghost"
            size="icon-sm"
            class="size-6 opacity-0 group-hover:opacity-100"
            @click="removeModel(model)"
          >
            <XMarkIcon class="h-3.5 w-3.5 text-destructive" />
          </Button>
        </div>
      </div>
    </ScrollArea>

    <p v-else class="py-3 text-center text-xs text-muted-foreground">
      暂无模型，点击"获取"自动拉取或手动"新增"
    </p>
  </div>
  <FetchModelsDialog
    v-model:open="showFetchDialog"
    :provider="provider"
    @confirm="onFetchConfirm"
  />
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import { EyeIcon, EyeSlashIcon, XMarkIcon, PlusIcon as PlusIcon2 } from '@heroicons/vue/24/outline'
import { useProviderStore } from '../../stores/providerStore'
import type { ApiFormat, Provider } from '@tuple-gpt/chat-core'
import ProviderAvatar from './ProviderAvatar.vue'
import ModelAvatar from './ModelAvatar.vue'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { ScrollArea } from '../ui/scroll-area'
import { Separator } from '../ui/separator'
import FetchModelsDialog from './FetchModelsDialog.vue'

const props = defineProps<{ provider: Provider }>()
const providerStore = useProviderStore()

const formatLabels: Record<ApiFormat, string> = {
  openai: 'OpenAI',
  claude: 'Claude',
  gemini: 'Gemini',
}

// Local editable state
const localApiKey = ref(props.provider.apiKey)
const localBaseUrl = ref(props.provider.baseUrl)
const showKey = ref(false)
const verifying = ref(false)
const verifyResult = ref<{ valid: boolean; error?: string } | null>(null)
const showFetchDialog = ref(false)
const addingModel = ref(false)
const newModelId = ref('')
const addModelInput = ref<{ focus: () => void } | null>(null)

// Sync local state when provider changes
watch(
  () => props.provider.id,
  () => {
    localApiKey.value = props.provider.apiKey
    localBaseUrl.value = props.provider.baseUrl
    showKey.value = false
    verifyResult.value = null
    addingModel.value = false
    newModelId.value = ''
  },
)

// URL preview
const previewUrl = computed(() => {
  const base = localBaseUrl.value.replace(/\/+$/, '')
  switch (props.provider.format) {
    case 'openai':
      return `${base}/v1/chat/completions`
    case 'claude':
      return `${base}/v1/messages`
    case 'gemini':
      return `${base}/v1beta/models/{model}:generateContent`
    default:
      return base
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

function handleFetch() {
  showFetchDialog.value = true
}

function onFetchConfirm(models: string[]) {
  providerStore.updateProvider(props.provider.id, { models })
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

function cancelAddModel() {
  addingModel.value = false
  newModelId.value = ''
}

function removeModel(model: string) {
  providerStore.updateProvider(props.provider.id, {
    models: props.provider.models.filter(m => m !== model),
  })
}

watch(addingModel, v => {
  if (v) nextTick(() => addModelInput.value?.focus())
})
</script>
