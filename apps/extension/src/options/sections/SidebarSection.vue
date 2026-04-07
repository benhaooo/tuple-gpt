<script setup lang="ts">
import { useSettingsStore } from '@shared/stores/settingsStore'
import { storeToRefs } from 'pinia'
import { Input } from '@shared/components/ui/input'
import { Label } from '@shared/components/ui/label'

const settingsStore = useSettingsStore()
const { settings } = storeToRefs(settingsStore)
</script>

<template>
  <div class="space-y-8">
    <!-- Whisper API 设置 -->
    <div>
      <h2 class="mb-4 text-xl font-semibold text-foreground">Whisper API 设置</h2>
      <p class="mb-4 text-muted-foreground">
        配置 Whisper API 用于Bilibili音频转录功能。
      </p>

      <!-- Whisper API Key -->
      <div class="mb-4">
        <Label class="mb-2">Whisper API Key</Label>
        <Input type="password" v-model="settings.whisperApiKey" placeholder="sk-..." />
      </div>

      <!-- API 端点 -->
      <div>
        <Label class="mb-2">API 端点</Label>
        <Input type="url" v-model="settings.whisperApiEndpoint"
          placeholder="https://api.openai.com/v1/audio/transcriptions" />
        <p class="mt-1 text-xs text-muted-foreground">
          默认使用 OpenAI 官方端点，也可以使用兼容的第三方服务
        </p>
      </div>
    </div>
  </div>
</template>
