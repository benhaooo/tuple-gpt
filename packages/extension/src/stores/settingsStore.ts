import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

export interface UserSettings {
  enableSubtitles: boolean
  enableSummary: boolean
  apiKey: string
  language: string
  theme: 'light' | 'dark' | 'system'
  // Whisper API 相关设置
  whisperApiKey: string
  whisperApiEndpoint: string
}

export const useSettingsStore = defineStore('settings', () => {
  // 1. STATE
  const settings = ref<UserSettings>({
    enableSubtitles: true,
    enableSummary: true,
    apiKey: '',
    language: 'zh-CN',
    theme: 'light',
    // Whisper API 默认设置
    whisperApiKey: '',
    whisperApiEndpoint: 'https://api.openai.com/v1/audio/transcriptions',
  })

  // Flag to prevent update loops
  let isUpdatingFromStorage = false

  // 2. ACTIONS
  /**
   * Loads settings from chrome.storage.sync and initializes the store.
   */
  async function loadSettings() {
    try {
      const result = await chrome.storage.sync.get('userSettings')
      if (result.userSettings) {
        isUpdatingFromStorage = true
        settings.value = { ...settings.value, ...result.userSettings }
        isUpdatingFromStorage = false
      }
    } catch (error) {
      console.error('[SettingsStore] Error loading settings:', error)
    }
  }

  /**
   * Updates a specific setting or multiple settings.
   * @param newSettings - A partial object of settings to update.
   */
  async function updateSettings(newSettings: Partial<UserSettings>) {
    // Optimistically update local state
    settings.value = { ...settings.value, ...newSettings }
    
    // The watcher below will handle persisting to chrome.storage
  }

  // 3. PERSISTENCE and SYNC
  // Watch for local changes and persist them to chrome.storage.sync
  watch(settings, (newSettings) => {
    if (isUpdatingFromStorage) {
      return
    }
    try {
      chrome.storage.sync.set({ userSettings: newSettings })
    } catch (error) {
      console.error('[SettingsStore] Error saving settings:', error)
    }
  }, { deep: true })

  // Listen for changes from other extension contexts
  chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'sync' && changes.userSettings) {
      const newSettings = changes.userSettings.newValue
      if (JSON.stringify(settings.value) !== JSON.stringify(newSettings)) {
        isUpdatingFromStorage = true
        settings.value = newSettings
        isUpdatingFromStorage = false
      }
    }
  })

  // Initial load
  loadSettings()

  return {
    settings,
    loadSettings,
    updateSettings,
  }
}) 