<script setup lang="ts">
import { ref } from 'vue'
import { useSettingsStore } from '@/stores/settingsStore'
import { storeToRefs } from 'pinia'
import { useThemeManager } from '@/composables/useThemeManager'
import { themeNames, type ThemeName } from '@/constants/themes'
import { SunIcon, MoonIcon, ComputerDesktopIcon } from '@heroicons/vue/24/solid'
import type { Component } from 'vue';
import Service from './service/index.vue'

const settingsStore = useSettingsStore()
// 使用 storeToRefs 来保持响应性
const { settings } = storeToRefs(settingsStore)

// Activate theme management for the options page
useThemeManager()

const themeIcons: Record<ThemeName, Component> = {
  light: SunIcon,
  dark: MoonIcon,
  system: ComputerDesktopIcon,
}

// 主题选项
const themeOptions = [
  { label: '浅色', value: 'light' },
  { label: '深色', value: 'dark' },
  { label: '跟随系统', value: 'system' }
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

// 保存设置 (现在通过 action 触发，并显示提示信息)
const handleSave = () => {
  // Pinia store的更新是同步的，并且会自动通过 watcher 持久化
  // 我们只需要显示一个成功消息
  showSaveMessage('设置已保存')
}
</script>

<template>
  <div class="p-6 min-h-screen bg-background text-text-primary transition-colors duration-300">
    <div class=" mx-auto bg-surface p-8 rounded-xl shadow-lg">
      <h1 class="text-3xl font-bold mb-6 text-text-primary border-b border-border pb-4">
        Tuple-GPT 设置
      </h1>

      <div class="space-y-8">
        <div>
          <h2 class="text-xl font-semibold mb-4 text-text-primary">主题设置</h2>
          <p class="text-text-secondary mb-4">
            选择一个主题。设为"系统"将自动匹配您操作系统的外观设置。
          </p>
          <div class="grid grid-cols-3 gap-4">
            <label v-for="theme in themeNames" :key="theme" :class="[
              'cursor-pointer rounded-lg border-2 p-4 text-center transition-all duration-200',
              settings.theme === theme
                ? 'border-primary bg-primary/10'
                : 'border-border hover:border-primary/50',
            ]">
              <input type="radio" name="theme" :value="theme" class="sr-only" :checked="settings.theme === theme"
                @change="settingsStore.updateSettings({ theme: ($event.target as HTMLInputElement).value as any })" />
              <component :is="themeIcons[theme]" class="w-8 h-8 mx-auto mb-2"
                :class="settings.theme === theme ? 'text-primary' : 'text-text-secondary'" />
              <span class="font-medium capitalize text-text-primary">{{ theme }}</span>
            </label>
          </div>
        </div>


        <!-- Whisper API 设置 -->
        <div>
          <h2 class="text-xl font-semibold mb-4 text-text-primary">Whisper API 设置</h2>
          <p class="text-text-secondary mb-4">
            配置 Whisper API 用于Bilibili音频转录功能。
          </p>

          <!-- Whisper API Key -->
          <div class="mb-4">
            <label class="block text-sm font-medium text-text-primary mb-2">
              Whisper API Key
            </label>
            <input type="password" v-model="settings.whisperApiKey" placeholder="sk-..."
              class="w-full px-4 py-2 rounded-lg bg-background border border-border focus:outline-none focus:ring-2 focus:ring-primary" />
          </div>

          <!-- API 端点 -->
          <div>
            <label class="block text-sm font-medium text-text-primary mb-2">
              API 端点
            </label>
            <input type="url" v-model="settings.whisperApiEndpoint"
              placeholder="https://api.openai.com/v1/audio/transcriptions"
              class="w-full px-4 py-2 rounded-lg bg-background border border-border focus:outline-none focus:ring-2 focus:ring-primary" />
            <p class="text-xs text-text-secondary mt-1">
              默认使用 OpenAI 官方端点，也可以使用兼容的第三方服务
            </p>
          </div>
        </div>

        <div>
          <h2 class="text-xl font-semibold mb-4 text-text-primary">功能开关</h2>
          <div class="space-y-4">
            <div class="flex items-center justify-between p-4 bg-background rounded-lg">
              <div>
                <h3 class="font-medium text-text-primary">显示字幕</h3>
                <p class="text-sm text-text-secondary">在视频播放器旁显示可交互的字幕。</p>
              </div>
              <button @click="settingsStore.updateSettings({ enableSubtitles: !settings.enableSubtitles })" :class="[
                'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
                settings.enableSubtitles ? 'bg-primary' : 'bg-border',
              ]">
                <span :class="[
                  'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out',
                  settings.enableSubtitles ? 'translate-x-5' : 'translate-x-0',
                ]"></span>
              </button>
            </div>
            <div class="flex items-center justify-between p-4 bg-background rounded-lg">
              <div>
                <h3 class="font-medium text-text-primary">启用一键总结</h3>
                <p class="text-sm text-text-secondary">允许使用"总结"按钮来快速获取视频摘要。</p>
              </div>
              <button @click="settingsStore.updateSettings({ enableSummary: !settings.enableSummary })" :class="[
                'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
                settings.enableSummary ? 'bg-primary' : 'bg-border',
              ]">
                <span :class="[
                  'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out',
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
            'text-green-600': !isError,
            'text-red-600': isError
          }" class="text-sm transition-opacity">
            {{ saveMessage }}
          </span>
        </div>
        <button @click="handleSave"
          class="px-4 py-2 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700">
          保存设置
        </button>
      </div>

      <Service />
    </div>
  </div>
</template>

<style scoped></style>