<script setup lang="ts">
import { ref } from 'vue'
import { useSettingsStore } from '@shared/stores/settingsStore'
import { storeToRefs } from 'pinia'
import { useTheme, ThemeName } from '@shared/composables/useTheme'
import { SunIcon, MoonIcon, ComputerDesktopIcon } from '@heroicons/vue/24/solid'
import type { Component } from 'vue';
import ProviderManager from '@shared/components/chat/ProviderManager.vue'

const settingsStore = useSettingsStore()
const { settings } = storeToRefs(settingsStore)

useTheme()

const themeIcons: Record<(typeof ThemeName)[keyof typeof ThemeName], Component> = {
  light: SunIcon,
  dark: MoonIcon,
  system: ComputerDesktopIcon,
}

// 主题选项
const themeOptions = [
  { label: '浅色', value: 'light' },
  { label: '深色', value: 'dark' },
  { label: '跟随系统', value: 'system' },
]


// 保存消息状态
const saveMessage = ref('')
const isError = ref(false)
const showSaveMessage = (message: string, error = false) => {
  saveMessage.value = message
  isError.value = error
  setTimeout(() => {
    saveMessage.value = ''
  }, 3000)
}

const handleSave = () => {
  showSaveMessage('设置已保存')
}
</script>

<template>
  <div class="min-h-screen bg-background p-6 text-foreground transition-colors duration-300">
    <div class="mx-auto rounded-xl border border-border bg-card p-8 text-card-foreground shadow-lg">
      <h1 class="mb-6 border-b border-border pb-4 text-3xl font-bold text-foreground">
        Tuple-GPT 设置
      </h1>

      <div class="space-y-8">
        <div>
          <h2 class="mb-4 text-xl font-semibold text-foreground">主题设置</h2>
          <p class="mb-4 text-muted-foreground">
            选择一个主题。设为"系统"将自动匹配您操作系统的外观设置。
          </p>
          <div class="grid grid-cols-3 gap-4">
            <label v-for="theme in ThemeName" :key="theme" :class="[
              'cursor-pointer rounded-lg border-2 p-4 text-center transition-all duration-200',
              settings.theme === theme
                ? 'border-primary bg-primary/10'
                : 'border-border hover:border-primary/50',
            ]">
              <input type="radio" name="theme" :value="theme" class="sr-only" :checked="settings.theme === theme"
                @change="settingsStore.updateSettings({ theme: ($event.target as HTMLInputElement).value as any })" />
              <component :is="themeIcons[theme]" class="w-8 h-8 mx-auto mb-2"
                :class="settings.theme === theme ? 'text-primary' : 'text-muted-foreground'" />
              <span class="font-medium capitalize text-foreground">{{ theme }}</span>
            </label>
          </div>
        </div>


        <!-- AI 服务商配置 -->
        <ProviderManager />

        <!-- Whisper API 设置 -->
        <div>
          <h2 class="mb-4 text-xl font-semibold text-foreground">Whisper API 设置</h2>
          <p class="mb-4 text-muted-foreground">
            配置 Whisper API 用于Bilibili音频转录功能。
          </p>

          <!-- Whisper API Key -->
          <div class="mb-4">
            <label class="mb-2 block text-sm font-medium text-foreground">
              Whisper API Key
            </label>
            <input type="password" v-model="settings.whisperApiKey" placeholder="sk-..."
              class="w-full rounded-lg border border-input bg-background px-4 py-2 text-foreground placeholder:text-muted-foreground outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50" />
          </div>

          <!-- API 端点 -->
          <div>
            <label class="mb-2 block text-sm font-medium text-foreground">
              API 端点
            </label>
            <input type="url" v-model="settings.whisperApiEndpoint"
              placeholder="https://api.openai.com/v1/audio/transcriptions"
              class="w-full rounded-lg border border-input bg-background px-4 py-2 text-foreground placeholder:text-muted-foreground outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50" />
            <p class="mt-1 text-xs text-muted-foreground">
              默认使用 OpenAI 官方端点，也可以使用兼容的第三方服务
            </p>
          </div>
        </div>

        <div>
          <h2 class="mb-4 text-xl font-semibold text-foreground">功能开关</h2>
          <div class="space-y-4">
            <div class="flex items-center justify-between rounded-lg border border-border bg-muted/40 p-4">
              <div>
                <h3 class="font-medium text-foreground">显示字幕</h3>
                <p class="text-sm text-muted-foreground">在视频播放器旁显示可交互的字幕。</p>
              </div>
              <button @click="settingsStore.updateSettings({ enableSubtitles: !settings.enableSubtitles })" :class="[
                'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
                settings.enableSubtitles ? 'bg-primary' : 'bg-muted',
              ]">
                <span :class="[
                  'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-background shadow ring-0 transition duration-200 ease-in-out',
                  settings.enableSubtitles ? 'translate-x-5' : 'translate-x-0',
                ]"></span>
              </button>
            </div>
            <div class="flex items-center justify-between rounded-lg border border-border bg-muted/40 p-4">
              <div>
                <h3 class="font-medium text-foreground">启用一键总结</h3>
                <p class="text-sm text-muted-foreground">允许使用"总结"按钮来快速获取视频摘要。</p>
              </div>
              <button @click="settingsStore.updateSettings({ enableSummary: !settings.enableSummary })" :class="[
                'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
                settings.enableSummary ? 'bg-primary' : 'bg-muted',
              ]">
                <span :class="[
                  'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-background shadow ring-0 transition duration-200 ease-in-out',
                  settings.enableSummary ? 'translate-x-5' : 'translate-x-0',
                ]"></span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- 保存按钮 -->
      <div class="flex justify-between items-center mt-8">
        <div>
          <span v-if="saveMessage" :class="{
            'text-primary': !isError,
            'text-destructive': isError
          }" class="text-sm transition-opacity">
            {{ saveMessage }}
          </span>
        </div>
        <button @click="handleSave"
          class="rounded-lg bg-primary px-4 py-2 font-semibold text-primary-foreground transition-colors hover:bg-primary/90">
          保存设置
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped></style>
