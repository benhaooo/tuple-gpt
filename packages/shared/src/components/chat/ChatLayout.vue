<template>
  <div class="h-full flex bg-background text-foreground">
    <!-- Desktop sidebar -->
    <div
      class="hidden overflow-hidden transition-[width,opacity,transform,border-color] duration-250 ease-out md:flex"
      :class="desktopSidebarOpen
        ? 'w-56 translate-x-0 opacity-100 border-r border-border'
        : 'w-0 -translate-x-1 opacity-0 border-r border-transparent pointer-events-none'"
    >
      <ConversationSidebar
        :conversations="conversationStore.conversations"
        :active-id="conversationStore.activeConversationId"
        @select="conversationStore.setActiveConversation"
        @delete="conversationStore.deleteConversation"
        @new="chat.newConversation"
        @close="closeSidebar"
        class="w-56 flex-shrink-0 border-r-0"
      />
    </div>

    <!-- Mobile sidebar sheet -->
    <Sheet :open="mobileSidebarOpen" @update:open="handleMobileOpenChange">
      <SheetContent side="left" :show-close-button="false" class="w-[85vw] max-w-xs p-0 md:hidden">
        <ConversationSidebar
          :conversations="conversationStore.conversations"
          :active-id="conversationStore.activeConversationId"
          @select="handleMobileSelect"
          @delete="handleMobileDelete"
          @new="handleMobileNew"
          @close="closeSidebar"
          class="h-full border-r-0"
        />
      </SheetContent>
    </Sheet>

    <!-- Main chat area -->
    <div class="flex-1 flex flex-col min-w-0">
      <!-- Header -->
      <header class="grid grid-cols-[1fr_auto_1fr] items-center px-3 py-2">
        <div class="flex min-w-0 items-center gap-2">
          <Button variant="ghost" size="icon-sm" class="flex-shrink-0" @click="toggleSidebar">
            <Bars3Icon class="h-5 w-5 text-muted-foreground" />
          </Button>
          <h2 class="text-sm font-medium truncate">
            {{ chat.activeConversation.value?.title || 'Tuple Chat' }}
          </h2>
        </div>

        <div class="justify-self-center">
          <div class="rounded-full border border-border/70 bg-background/90 px-1.5 py-0.5 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-background/70">
            <ModelSelector />
          </div>
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
import { useConversationStore } from '../../stores/conversationStore'
import { useChat } from '../../composables/useChat'
import ConversationSidebar from './ConversationSidebar.vue'
import ChatView from './ChatView.vue'
import ModelSelector from './ModelSelector.vue'
import { Button } from '../ui/button'
import { Sheet, SheetContent } from '../ui/sheet'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip'

const conversationStore = useConversationStore()
const chat = useChat()
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

function handleMobileSelect(id: string) {
  conversationStore.setActiveConversation(id)
  closeSidebar()
}

function handleMobileDelete(id: string) {
  conversationStore.deleteConversation(id)
}

function handleMobileNew() {
  chat.newConversation()
  closeSidebar()
}
</script>
