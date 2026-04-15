<template>
  <div
    :class="['group flex min-w-0', isUser ? 'justify-end' : 'justify-start']"
  >
    <div class="min-w-0" :class="isUser ? 'max-w-[85%]' : ''">
      <div :class="[
        'rounded-lg px-3 py-2 text-sm min-w-0',
        isUser
          ? 'bg-primary text-primary-foreground'
          : 'text-foreground',
      ]">
        <!-- User message -->
        <div v-if="isUser">
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
        <MarkdownRenderer
          v-else-if="message.content"
          :content="message.content"
        />

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

      <!-- Action buttons -->
      <div
        v-if="message.status !== 'streaming'"
        :class="[
          'mt-0.5 ml-2 flex gap-0.5 opacity-0 transition-opacity group-hover:opacity-100',
          isUser ? 'justify-end' : 'justify-start',
        ]"
      >
        <button
          @click="copyContent"
          class="inline-flex items-center justify-center rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <CheckIcon v-if="copied" class="h-3.5 w-3.5 text-green-500" />
          <ClipboardDocumentIcon v-else class="h-3.5 w-3.5" />
        </button>

        <button
          @click="$emit('delete', message.id)"
          class="inline-flex items-center justify-center rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
        >
          <TrashIcon class="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { LinkIcon, DocumentIcon, DocumentTextIcon, TrashIcon, ClipboardDocumentIcon, CheckIcon } from '@heroicons/vue/24/outline'
import { MarkdownRenderer } from '@tuple-gpt/ai-ui'
import type { ChatMessage } from '../../types'
import { Button } from '../ui/button'

const props = defineProps<{
  message: ChatMessage
}>()

defineEmits<{
  (e: 'retry'): void
  (e: 'delete', messageId: string): void
}>()

const copied = ref(false)
const isUser = computed(() => props.message.role === 'user')

const imageAttachments = computed(() =>
  props.message.attachments?.filter(a => a.category === 'image' && a.base64Data) ?? [],
)

const nonImageAttachments = computed(() =>
  props.message.attachments?.filter(a => a.category !== 'image') ?? [],
)

function copyContent() {
  navigator.clipboard.writeText(props.message.content)
  copied.value = true
  setTimeout(() => { copied.value = false }, 2000)
}
</script>
