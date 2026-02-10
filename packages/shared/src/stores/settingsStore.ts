import { defineStore } from 'pinia'
import { reactive } from 'vue'
import { ThemeName } from '@shared/composables/useTheme'

export interface UserSettings {
  theme: ThemeName
}

export const useSettingsStore = defineStore('settings', () => {

  const settings = reactive<UserSettings>({
    theme: ThemeName.system,
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