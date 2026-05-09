<template>
  <div class="h-screen flex flex-col bg-background text-foreground">
    <ChatLayout />
  </div>
</template>

<script setup lang="ts">
import { useTheme } from '@shared/composables/useTheme'
import { useProviderStore } from '@shared/stores/providerStore'
import { useMcpStore } from '@shared/stores/mcpStore'
import { providePlatform } from '@shared/composables/usePlatform'
import { createExtensionPlatform } from '../platform/extensionPlatform'
import ChatLayout from '@shared/components/chat/ChatLayout.vue'

providePlatform(createExtensionPlatform())
useTheme()
const providerStore = useProviderStore()
providerStore.seedPresets()

// 初始化 MCP store，watch 会在 storage hydration 后自动连接
useMcpStore()
</script>
