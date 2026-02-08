import { defineStore } from 'pinia'
import { reactive } from 'vue'
import { ThemeName } from '@shared/composables/useTheme'

export interface UserSettings {
  enableSubtitles: boolean
  enableSummary: boolean
  apiKey: string
  language: string
  theme: ThemeName
  // Whisper API 相关设置
  whisperApiKey: string
  whisperApiEndpoint: string
}

export const useSettingsStore = defineStore('settings', () => {

  const settings = reactive<UserSettings>({
    enableSubtitles: true,
    enableSummary: true,
    apiKey: '',
    language: 'zh-CN',
    theme: 'light',
    // Whisper API 默认设置
    whisperApiKey: '',
    whisperApiEndpoint: 'https://api.openai.com/v1/audio/transcriptions',
  })

  async function updateSettings(newSettings: Partial<UserSettings>) {
    Object.assign(settings, newSettings)
  }

  return {
    settings,
    updateSettings,
  }
}, {
  chromePersist: true
}) 