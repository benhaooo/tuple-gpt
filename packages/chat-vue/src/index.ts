// Types
export * from './types'

// Stores
export { useSettingsStore, type UserSettings } from './stores/settings'
export { useProviderStore } from './stores/provider'
export { useMcpStore } from './stores/mcp'

// Composables
export { useTheme, ThemeName } from './composables/useTheme'
export { useChat } from './composables/useChat'
export { providePlatform, usePlatform } from './composables/usePlatform'
export { useFileAttachments } from './composables/useFileAttachments'
export { useToolRegistry } from './composables/useToolRegistry'

// Config
export { resolveProviderIcon, resolveModelIcon } from './config/ai-icons'

// Components
export { default as ChatLayout } from './components/ChatLayout.vue'
export { default as ChatView } from './components/ChatView.vue'
export { default as ChatInput } from './components/ChatInput.vue'
export { default as TurnList } from './components/TurnList.vue'
export { default as TurnBubble } from './components/TurnBubble.vue'
export { default as ConversationSidebar } from './components/ConversationSidebar.vue'
export { default as AddProviderDialog } from './components/AddProviderDialog.vue'
export { default as ProviderManager } from './components/ProviderManager.vue'
export { default as ProviderAvatar } from './components/ProviderAvatar.vue'
export { default as ProviderDetailPanel } from './components/ProviderDetailPanel.vue'
export { default as ModelSelector } from './components/ModelSelector.vue'
export { default as ModelAvatar } from './components/ModelAvatar.vue'
export { default as McpManager } from './components/McpManager.vue'
export { default as McpServerDetail } from './components/McpServerDetail.vue'
export { default as FetchModelsDialog } from './components/FetchModelsDialog.vue'
export { default as FileAttachmentPreview } from './components/FileAttachmentPreview.vue'
export { default as FilePickerButton } from './components/FilePickerButton.vue'
export { default as AttachmentPreviewItem } from './components/AttachmentPreviewItem.vue'
