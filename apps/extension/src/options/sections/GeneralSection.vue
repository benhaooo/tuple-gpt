<script setup lang="ts">
import { computed } from 'vue'
import { useSettingsStore, useProviderStore } from '@tuple-gpt/chat-vue'
import { storeToRefs } from 'pinia'
import { ThemeName } from '@tuple-gpt/chat-vue'
import { SunIcon, MoonIcon, ComputerDesktopIcon } from '@heroicons/vue/24/solid'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@tuple-gpt/ui-vue'
import type { Component } from 'vue'
import type { ModelSelection } from '@tuple-gpt/chat-core'

const settingsStore = useSettingsStore()
const providerStore = useProviderStore()
const { settings } = storeToRefs(settingsStore)

const themeIcons: Record<(typeof ThemeName)[keyof typeof ThemeName], Component> = {
  light: SunIcon,
  dark: MoonIcon,
  system: ComputerDesktopIcon,
}

const groupedModels = computed(() => {
  const groups: Array<{
    providerId: string
    providerName: string
    models: string[]
  }> = []
  for (const item of providerStore.allModels) {
    let group = groups.find(g => g.providerId === item.providerId)
    if (!group) {
      group = { providerId: item.providerId, providerName: item.providerName, models: [] }
      groups.push(group)
    }
    group.models.push(item.model)
  }
  return groups
})

function modelKey(selection: ModelSelection): string {
  return JSON.stringify(selection)
}

function parseModelKey(key: string): ModelSelection | null {
  try {
    const parsed = JSON.parse(key) as ModelSelection
    if (typeof parsed?.providerId === 'string' && typeof parsed?.model === 'string') {
      return parsed
    }
  } catch {
    // ignore parse failure — fall through to null
  }
  return null
}

const summaryModelKey = computed<string | undefined>(() => {
  const sel = settings.value.summaryModel
  return sel ? modelKey(sel) : undefined
})

function setSummaryModel(key: string) {
  const selection = parseModelKey(key)
  if (!selection) return
  settingsStore.updateSettings({ summaryModel: selection })
}
</script>

<template>
  <div class="space-y-8">
    <!-- 主题设置 -->
    <div>
      <h2 class="mb-4 text-xl font-semibold text-foreground">主题设置</h2>
      <p class="mb-4 text-muted-foreground">
        选择一个主题。设为"系统"将自动匹配您操作系统的外观设置。
      </p>
      <div class="grid grid-cols-3 gap-4">
        <label
          v-for="theme in ThemeName"
          :key="theme"
          :class="[
            'cursor-pointer rounded-lg border-2 p-4 text-center transition-all duration-200',
            settings.theme === theme
              ? 'border-primary bg-primary/10'
              : 'border-border hover:border-primary/50',
          ]"
        >
          <input
            type="radio"
            name="theme"
            :value="theme"
            class="sr-only"
            :checked="settings.theme === theme"
            @change="
              settingsStore.updateSettings({
                theme: ($event.target as HTMLInputElement).value as any,
              })
            "
          />
          <component
            :is="themeIcons[theme]"
            class="w-8 h-8 mx-auto mb-2"
            :class="settings.theme === theme ? 'text-primary' : 'text-muted-foreground'"
          />
          <span class="font-medium capitalize text-foreground">{{ theme }}</span>
        </label>
      </div>
    </div>

    <!-- 功能开关 -->
    <div>
      <h2 class="mb-4 text-xl font-semibold text-foreground">功能开关</h2>
      <div class="space-y-4">
        <div
          class="flex items-center justify-between rounded-lg border border-border bg-muted/40 p-4"
        >
          <div>
            <h3 class="font-medium text-foreground">显示字幕</h3>
            <p class="text-sm text-muted-foreground">在视频播放器旁显示可交互的字幕。</p>
          </div>
          <button
            @click="settingsStore.updateSettings({ enableSubtitles: !settings.enableSubtitles })"
            :class="[
              'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
              settings.enableSubtitles ? 'bg-primary' : 'bg-muted',
            ]"
          >
            <span
              :class="[
                'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-background shadow ring-0 transition duration-200 ease-in-out',
                settings.enableSubtitles ? 'translate-x-5' : 'translate-x-0',
              ]"
            ></span>
          </button>
        </div>
        <div
          class="flex items-center justify-between rounded-lg border border-border bg-muted/40 p-4"
        >
          <div>
            <h3 class="font-medium text-foreground">启用一键总结</h3>
            <p class="text-sm text-muted-foreground">允许使用"总结"按钮来快速获取视频摘要。</p>
          </div>
          <button
            @click="settingsStore.updateSettings({ enableSummary: !settings.enableSummary })"
            :class="[
              'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
              settings.enableSummary ? 'bg-primary' : 'bg-muted',
            ]"
          >
            <span
              :class="[
                'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-background shadow ring-0 transition duration-200 ease-in-out',
                settings.enableSummary ? 'translate-x-5' : 'translate-x-0',
              ]"
            ></span>
          </button>
        </div>
      </div>
    </div>
    <!-- 一键总结模型 -->
    <div>
      <h2 class="mb-4 text-xl font-semibold text-foreground">一键总结模型</h2>
      <p class="mb-4 text-muted-foreground">
        选择"总结"按钮调用的模型。仅显示已配置 API Key 的服务商。
      </p>
      <Select
        :model-value="summaryModelKey"
        @update:model-value="value => typeof value === 'string' && setSummaryModel(value)"
      >
        <SelectTrigger class="w-full">
          <SelectValue placeholder="选择模型" />
        </SelectTrigger>
        <SelectContent>
          <template v-if="groupedModels.length === 0">
            <div class="px-2 py-3 text-sm text-muted-foreground">
              暂无可用模型，请先在"服务商"中配置 API Key。
            </div>
          </template>
          <SelectGroup v-for="group in groupedModels" :key="group.providerId">
            <SelectLabel>{{ group.providerName }}</SelectLabel>
            <SelectItem
              v-for="model in group.models"
              :key="modelKey({ providerId: group.providerId, model })"
              :value="modelKey({ providerId: group.providerId, model })"
            >
              {{ model }}
            </SelectItem>
          </SelectGroup>
        </SelectContent>
      </Select>
    </div>
  </div>
</template>
