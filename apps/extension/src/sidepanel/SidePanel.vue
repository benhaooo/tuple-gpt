<template>
  <div class="h-screen flex flex-col bg-background text-foreground">
    <ChatLayout />
  </div>
</template>

<script setup lang="ts">
import { useTheme } from '@shared/composables/useTheme'
import { useProviderStore } from '@shared/stores/providerStore'
import ChatLayout from '@shared/components/chat/ChatLayout.vue'

useTheme()
const providerStore = useProviderStore()
providerStore.seedPresets()
</script>
