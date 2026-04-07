<script setup lang="ts">
import { ref } from 'vue'
import { useTheme } from '@shared/composables/useTheme'
import { UserIcon, Cog6ToothIcon, ChatBubbleLeftRightIcon, CpuChipIcon } from '@heroicons/vue/24/outline'
import { Button } from '@shared/components/ui/button'
import { ScrollArea } from '@shared/components/ui/scroll-area'
import GeneralSection from './sections/GeneralSection.vue'
import SidebarSection from './sections/SidebarSection.vue'
import UserSection from './sections/UserSection.vue'
import ProviderSection from './sections/ProviderSection.vue'
import type { Component } from 'vue'

useTheme()

const activeMenu = ref('general')

const menuItems: { key: string; label: string; icon: Component }[] = [
  { key: 'user', label: '用户', icon: UserIcon },
  { key: 'general', label: '通用', icon: Cog6ToothIcon },
  { key: 'provider', label: '服务商', icon: CpuChipIcon },
  { key: 'sidebar', label: '侧边栏', icon: ChatBubbleLeftRightIcon },
]
</script>

<template>
  <div class="flex h-screen flex-col bg-background p-6 text-foreground transition-colors duration-300">
    <div class="mx-auto flex min-h-0 w-full max-w-4xl flex-1 overflow-hidden rounded-xl border border-border bg-card text-card-foreground shadow-lg">
      <!-- 左侧菜单 -->
      <div class="w-48 flex-shrink-0 border-r border-border p-2">
        <div class="space-y-1">
          <Button
            v-for="item in menuItems"
            :key="item.key"
            variant="ghost"
            class="h-9 w-full justify-start gap-2 px-3 text-sm font-normal"
            :class="activeMenu === item.key && 'bg-accent text-accent-foreground hover:bg-accent'"
            @click="activeMenu = item.key"
          >
            <component :is="item.icon" class="h-4 w-4" />
            {{ item.label }}
          </Button>
        </div>
      </div>

      <!-- 右侧内容 -->
      <div class="min-w-0 flex-1 overflow-hidden">
        <ProviderSection v-if="activeMenu === 'provider'" class="h-full p-6" />
        <ScrollArea v-else class="h-full">
          <div class="p-6">
            <UserSection v-if="activeMenu === 'user'" />
            <GeneralSection v-else-if="activeMenu === 'general'" />
            <SidebarSection v-else-if="activeMenu === 'sidebar'" />
          </div>
        </ScrollArea>
      </div>
    </div>
  </div>
</template>
