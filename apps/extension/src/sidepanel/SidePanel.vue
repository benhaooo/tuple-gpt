<template>
  <div class="h-screen flex flex-col bg-background text-foreground">
    <ChatLayout />
  </div>
</template>

<script setup lang="ts">
import { useTheme } from '@tuple-gpt/chat-vue'
import { useProviderStore } from '@tuple-gpt/chat-vue'
import { useMcpStore } from '@tuple-gpt/chat-vue'
import { providePlatform } from '@tuple-gpt/chat-vue'
import { createExtensionPlatform } from '../platform/extensionPlatform'
import ChatLayout from '@tuple-gpt/chat-vue/components/ChatLayout.vue'

providePlatform(createExtensionPlatform())
useTheme()
const providerStore = useProviderStore()
providerStore.seedPresets()

// 初始化 MCP store，watch 会在 storage hydration 后自动连接
useMcpStore()
</script>
