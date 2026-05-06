<template>
  <div class="h-full flex bg-background text-foreground">
    <!-- Desktop sidebar -->
    <div
      class="hidden w-16 flex-shrink-0 overflow-hidden border-r border-border transition-[width] duration-250 ease-out md:flex"
      :class="desktopSidebarOpen ? 'w-56' : 'w-16'"
    >
      <ConversationSidebar
        :conversations="conversations"
        :active-id="activeConversationId"
        :collapsed="!desktopSidebarOpen"
        @select="chat.setActiveConversation"
        @delete="chat.deleteConversation"
        @new="chat.newConversation"
        class="w-full flex-shrink-0 border-r-0"
      />
    </div>

    <!-- Mobile sidebar sheet -->
    <Sheet :open="mobileSidebarOpen" @update:open="handleMobileOpenChange">
      <SheetContent side="left" :show-close-button="false" class="w-[85vw] max-w-xs p-0 md:hidden">
        <ConversationSidebar
          :conversations="conversations"
          :active-id="activeConversationId"
          @select="handleMobileSelect"
          @delete="handleMobileDelete"
          @new="handleMobileNew"
          class="h-full border-r-0"
        />
      </SheetContent>
    </Sheet>

    <!-- Main chat area -->
    <div class="flex-1 flex flex-col min-w-0 min-h-0">
      <!-- Header -->
      <header class="grid grid-cols-[1fr_auto_1fr] items-center px-3 py-2">
        <div class="flex min-w-0 items-center gap-2">
          <Button variant="ghost" size="icon-sm" class="flex-shrink-0" @click="toggleSidebar">
            <template v-if="isDesktop">
              <PanelLeftClose v-if="desktopSidebarOpen" class="h-5 w-5 text-muted-foreground" />
              <PanelLeftOpen v-else class="h-5 w-5 text-muted-foreground" />
            </template>
            <Bars3Icon v-else class="h-5 w-5 text-muted-foreground" />
          </Button>
          <h2 class="text-sm font-medium truncate">
            {{ activeConversation?.title || 'Tuple Chat' }}
          </h2>
        </div>

        <div class="justify-self-center">
          <ModelSelector />
        </div>

        <div class="flex justify-end">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger as-child>
                <Button variant="ghost" size="icon-sm" @click="chat.newConversation()">
                  <PlusIcon class="h-5 w-5 text-muted-foreground" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>新对话</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </header>

      <!-- Chat view -->
      <ChatView />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useMediaQuery } from '@vueuse/core'
import { Bars3Icon, PlusIcon } from '@heroicons/vue/24/outline'
import { PanelLeftClose, PanelLeftOpen } from 'lucide-vue-next'
import { useChat } from '../../composables/useChat'
import ConversationSidebar from './ConversationSidebar.vue'
import ChatView from './ChatView.vue'
import ModelSelector from './ModelSelector.vue'
import { Button } from '../ui/button'
import { Sheet, SheetContent } from '../ui/sheet'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip'

const chat = useChat()
const { conversations, activeConversationId, activeConversation } = chat
const isDesktop = useMediaQuery('(min-width: 768px)')
const sidebarOpen = ref(false)
const desktopSidebarOpen = computed(() => isDesktop.value && sidebarOpen.value)
const mobileSidebarOpen = computed(() => !isDesktop.value && sidebarOpen.value)

function toggleSidebar() {
  sidebarOpen.value = !sidebarOpen.value
}

function closeSidebar() {
  sidebarOpen.value = false
}

function handleMobileOpenChange(open: boolean) {
  if (!isDesktop.value) sidebarOpen.value = open
}

async function handleMobileSelect(id: string) {
  await chat.setActiveConversation(id)
  closeSidebar()
}

async function handleMobileDelete(id: string) {
  await chat.deleteConversation(id)
}

async function handleMobileNew() {
  await chat.newConversation()
  closeSidebar()
}
</script>
