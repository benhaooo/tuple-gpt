<template>
  <TooltipProvider>
    <div class="h-full flex flex-col overflow-hidden bg-gradient-to-b from-background to-muted/20">
      <div
        class="border-b border-border/50 backdrop-blur-sm"
        :class="collapsed ? 'px-2 py-3' : 'px-4 py-4'"
      >
        <div v-if="collapsed" class="flex flex-col items-center gap-2">
          <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <ChatBubbleLeftRightIcon class="h-4 w-4 text-primary" />
          </div>

          <Tooltip>
            <TooltipTrigger as-child>
              <Button
                variant="ghost"
                size="icon-sm"
                class="rounded-lg hover:bg-muted/60"
                aria-label="新建对话"
                @click="$emit('new')"
              >
                <PlusIcon class="h-4 w-4 text-muted-foreground" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">新建对话</TooltipContent>
          </Tooltip>
        </div>

        <template v-else>
          <div class="mb-3 flex items-center gap-2">
            <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <ChatBubbleLeftRightIcon class="h-4 w-4 text-primary" />
            </div>
            <span class="text-sm font-semibold">Tuple-AI</span>
          </div>

          <Button
            size="sm"
            class="w-full shadow-sm transition-shadow hover:shadow"
            @click="$emit('new')"
          >
            <PlusIcon class="mr-1.5 h-4 w-4" />
            新建对话
          </Button>
        </template>
      </div>

      <ScrollArea class="flex-1 min-h-0 w-full">
        <div v-if="conversations.length > 0" class="p-2 space-y-1">
          <template v-if="collapsed">
            <div v-for="conv in conversations" :key="conv.id" class="flex justify-center">
              <Tooltip>
                <TooltipTrigger as-child>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    :aria-label="conv.title"
                    class="h-8 w-8 rounded-lg border border-transparent px-0 text-xs font-semibold"
                    :class="
                      conv.id === activeId
                        ? 'border-border/70 bg-accent text-accent-foreground shadow-sm'
                        : 'text-muted-foreground hover:bg-muted/60'
                    "
                    @click="$emit('select', conv.id)"
                  >
                    <span v-if="getConversationMarker(conv.title)" class="leading-none">
                      {{ getConversationMarker(conv.title) }}
                    </span>
                    <ChatBubbleLeftRightIcon v-else class="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">{{ conv.title }}</TooltipContent>
              </Tooltip>
            </div>
          </template>

          <template v-else>
            <div v-for="conv in conversations" :key="conv.id" class="group relative">
              <Button
                variant="ghost"
                class="h-auto w-full justify-start rounded-lg px-3 py-2 text-left"
                :class="conv.id === activeId ? 'bg-accent' : ''"
                @click="$emit('select', conv.id)"
              >
                <div class="w-full min-w-0">
                  <div class="truncate text-xs font-normal">{{ conv.title }}</div>
                </div>
              </Button>

              <Button
                variant="ghost"
                size="icon-sm"
                class="absolute top-2 right-2 size-6 opacity-0 group-hover:opacity-100"
                @click.stop="$emit('delete', conv.id)"
              >
                <TrashIcon class="h-3.5 w-3.5 text-muted-foreground" />
              </Button>
            </div>
          </template>
        </div>

        <div
          v-else
          :class="collapsed ? 'flex items-start justify-center p-2' : 'px-4 pt-10 text-center'"
        >
          <Tooltip v-if="collapsed">
            <TooltipTrigger as-child>
              <div
                class="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground/50"
                aria-label="暂无对话"
              >
                <ChatBubbleLeftRightIcon class="h-4 w-4" />
              </div>
            </TooltipTrigger>
            <TooltipContent side="right">暂无对话</TooltipContent>
          </Tooltip>

          <template v-else>
            <ChatBubbleLeftRightIcon class="mx-auto h-8 w-8 text-muted-foreground/50" />
            <p class="mt-2 text-sm text-muted-foreground">暂无对话</p>
          </template>
        </div>
      </ScrollArea>

      <div
        class="border-t border-border/50 py-3"
        :class="collapsed ? 'flex justify-center px-2' : 'flex items-center justify-between px-3'"
      >
        <template v-if="collapsed">
          <Tooltip v-if="platform.openSettings">
            <TooltipTrigger as-child>
              <Button
                variant="ghost"
                size="icon-sm"
                class="rounded-lg hover:bg-muted/50"
                aria-label="打开设置"
                @click="handleOpenSettings"
              >
                <Cog6ToothIcon class="h-4 w-4 text-muted-foreground" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">打开设置</TooltipContent>
          </Tooltip>
          <div v-else class="size-8" aria-hidden="true"></div>
        </template>

        <template v-else>
          <div class="size-8" aria-hidden="true"></div>
          <Button
            v-if="platform.openSettings"
            variant="ghost"
            size="icon-sm"
            class="rounded-lg hover:bg-muted/50"
            title="打开设置"
            @click="handleOpenSettings"
          >
            <Cog6ToothIcon class="h-4 w-4 text-muted-foreground" />
          </Button>
          <div v-else class="size-8" aria-hidden="true"></div>
        </template>
      </div>
    </div>
  </TooltipProvider>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import {
  ChatBubbleLeftRightIcon,
  TrashIcon,
  PlusIcon,
  Cog6ToothIcon,
} from '@heroicons/vue/24/outline'
import type { Conversation } from '@tuple-gpt/chat-core'
import { usePlatform } from '../../composables/usePlatform'
import { Button } from '../ui/button'
import { ScrollArea } from '../ui/scroll-area'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip'

const props = withDefaults(
  defineProps<{
    conversations: Conversation[]
    activeId: string | null
    collapsed?: boolean
  }>(),
  {
    collapsed: false,
  },
)

defineEmits<{
  (e: 'select', id: string): void
  (e: 'delete', id: string): void
  (e: 'new'): void
}>()

const platform = usePlatform()
const conversations = computed(() => props.conversations)
const activeId = computed(() => props.activeId)
const collapsed = computed(() => props.collapsed)

function getConversationMarker(title: string) {
  const trimmedTitle = title.trim()
  return trimmedTitle ? trimmedTitle.charAt(0).toUpperCase() : ''
}

async function handleOpenSettings() {
  await platform.openSettings?.()
}
</script>
