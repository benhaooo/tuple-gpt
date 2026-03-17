import { defineStore } from 'pinia'
import { reactive } from 'vue'
import { ThemeName } from '@shared/composables/useTheme'

export interface UserSettings {
  theme: ThemeName
  whisperApiKey: string
  whisperApiEndpoint: string
  enableSubtitles: boolean
  enableSummary: boolean
}

export const useSettingsStore = defineStore('settings', () => {

  const settings = reactive<UserSettings>({
    theme: ThemeName.system,
    whisperApiKey: '',
    whisperApiEndpoint: 'https://api.openai.com/v1/audio/transcriptions',
    enableSubtitles: true,
    enableSummary: true,
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
