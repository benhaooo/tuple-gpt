// Types
export * from './types'

// Config
export { PROVIDER_PRESETS, getPresetById } from './config/providerPresets'

// Stores
export { useSettingsStore } from './stores/settingsStore'
export { useProviderStore } from './stores/providerStore'

// Composables
export { useTheme, ThemeName } from './composables/useTheme'
export { useChat } from './composables/useChat'
export { providePlatform, usePlatform } from './composables/usePlatform'
export { useFileAttachments } from './composables/useFileAttachments'

// Adapters
export { fetchModels, validateApiKey } from './adapters/fetch-models'
export type { FetchModelsOptions, FetchModelsResult } from './adapters/fetch-models'

// Utils
export { getErrorMessage } from './utils/error'

// Components
export { default as ChatLayout } from './components/chat/ChatLayout.vue'
export { default as AddProviderDialog } from './components/chat/AddProviderDialog.vue'
export { default as ProviderManager } from './components/chat/ProviderManager.vue'
export { default as ProviderAvatar } from './components/chat/ProviderAvatar.vue'
export { default as ModelAvatar } from './components/chat/ModelAvatar.vue'
