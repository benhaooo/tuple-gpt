import { defineStore } from 'pinia'
import { reactive } from 'vue'
import type { ModelSelection } from '@tuple-gpt/chat-core'
import { ThemeName } from '#composables/useTheme'

export interface UserSettings {
  theme: ThemeName
  whisperApiKey: string
  whisperApiEndpoint: string
  enableSubtitles: boolean
  enableSummary: boolean
  summaryModel: ModelSelection | null
}

export const useSettingsStore = defineStore(
  'settings',
  () => {
    const settings = reactive<UserSettings>({
      theme: ThemeName.system,
      whisperApiKey: '',
      whisperApiEndpoint: 'https://api.openai.com/v1/audio/transcriptions',
      enableSubtitles: true,
      enableSummary: true,
      summaryModel: null,
    })

    async function updateSettings(newSettings: Partial<UserSettings>) {
      Object.assign(settings, newSettings)
    }

    return {
      settings,
      updateSettings,
    }
  },
  { chromePersist: true },
)
