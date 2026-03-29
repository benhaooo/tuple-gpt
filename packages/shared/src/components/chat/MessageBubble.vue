<template>
  <div :class="['flex min-w-0', message.role === 'user' ? 'justify-end' : 'justify-start']">
    <div :class="[
      'rounded-lg px-3 py-2 text-sm min-w-0',
      message.role === 'user'
        ? 'max-w-[85%] bg-primary text-primary-foreground'
        : 'bg-muted text-foreground',
    ]">
      <!-- User message -->
      <div v-if="message.role === 'user'">
        <!-- Image attachments -->
        <div v-if="imageAttachments.length" class="mb-1.5 flex flex-wrap gap-1.5">
          <img
            v-for="att in imageAttachments"
            :key="att.id"
            :src="`data:${att.mimeType};base64,${att.base64Data}`"
            :alt="att.title"
            class="max-h-40 max-w-[200px] rounded-md object-cover"
          />
        </div>

        <div v-if="message.content" class="whitespace-pre-wrap break-words">{{ message.content }}</div>

        <!-- Non-image attachments -->
        <div v-if="nonImageAttachments.length" class="mt-1.5 flex flex-wrap gap-1">
          <span
            v-for="att in nonImageAttachments"
            :key="att.id"
            class="inline-flex items-center gap-1 rounded-md bg-primary-foreground/15 px-1.5 py-0.5 text-xs"
            :title="att.url || att.title"
          >
            <DocumentIcon v-if="att.category === 'pdf'" class="h-3 w-3 shrink-0 opacity-70" />
            <DocumentTextIcon v-else-if="att.category === 'text'" class="h-3 w-3 shrink-0 opacity-70" />
            <LinkIcon v-else class="h-3 w-3 shrink-0 opacity-70" />
            <span class="max-w-32 truncate">{{ att.title }}</span>
          </span>
        </div>
      </div>

      <!-- Assistant message: rendered markdown -->
      <div
        v-else-if="message.content"
        class="prose prose-sm max-w-none break-words [&_pre]:overflow-x-auto [&_pre]:rounded [&_pre]:bg-background/50 [&_pre]:p-2 [&_pre]:text-xs [&_code]:text-xs [&_p]:my-1 [&_ul]:my-1 [&_ol]:my-1"
        v-html="parseMarkdown(message.content)"
      ></div>

      <!-- Streaming placeholder -->
      <div v-else-if="message.status === 'streaming'" class="flex gap-1 items-center py-1">
        <span class="w-1.5 h-1.5 bg-current rounded-full animate-bounce opacity-60" style="animation-delay: 0ms"></span>
        <span class="w-1.5 h-1.5 bg-current rounded-full animate-bounce opacity-60" style="animation-delay: 150ms"></span>
        <span class="w-1.5 h-1.5 bg-current rounded-full animate-bounce opacity-60" style="animation-delay: 300ms"></span>
      </div>

      <!-- Error state -->
      <div v-if="message.status === 'error'" class="mt-2 pt-2 border-t border-destructive/20">
        <p class="text-xs text-destructive">{{ message.error || '请求失败' }}</p>
        <Button
          @click="$emit('retry')"
          variant="link"
          class="mt-1 h-auto p-0 text-xs text-destructive hover:text-destructive/80"
        >
          重试
        </Button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { LinkIcon, DocumentIcon, DocumentTextIcon } from '@heroicons/vue/24/outline'
import type { ChatMessage } from '../../types'
import { Button } from '../ui/button'

const props = defineProps<{
  message: ChatMessage
  parseMarkdown: (content: string) => string
}>()

defineEmits<{
  (e: 'retry'): void
}>()

const imageAttachments = computed(() =>
  props.message.attachments?.filter(a => a.category === 'image' && a.base64Data) ?? [],
)

const nonImageAttachments = computed(() =>
  props.message.attachments?.filter(a => a.category !== 'image') ?? [],
)
</script>
