<template>
  <div :class="['group flex min-w-0', isUser ? 'justify-end' : 'justify-start']">
    <div class="min-w-0" :class="isUser ? 'max-w-[85%]' : 'w-full'">
      <div :class="bubbleClass">
        <div
          v-if="assistantMeta && !isUser"
          class="mb-2 flex max-w-full min-w-0 items-start gap-2.5 text-muted-foreground"
        >
          <ModelAvatar class="mt-0.5 opacity-90" :model-id="assistantMeta.model" :size="22" />
          <div class="min-w-0 flex-1">
            <div
              class="break-words text-[12px] font-semibold leading-4 text-foreground/85"
              :title="`${assistantMeta.model}｜${assistantMeta.providerName}`"
            >
              <span>{{ assistantMeta.model }}</span>
              <span class="text-muted-foreground/45" aria-hidden="true">｜</span>
              <span class="font-medium text-muted-foreground/78">
                {{ assistantMeta.providerName }}
              </span>
            </div>
            <div class="mt-0.5 truncate text-[10px] leading-3 text-muted-foreground/55">
              {{ formattedTimestamp }}
            </div>
          </div>
        </div>

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

          <div v-if="isEditing" class="space-y-2">
            <Textarea
              v-model="draftContent"
              rows="3"
              class="min-h-[84px] resize-none border-0 bg-transparent px-0 py-0 text-sm leading-6 shadow-none focus-visible:ring-0"
              :disabled="actionsDisabled"
              @keydown.esc.stop="cancelEditing"
            />

            <div class="flex items-center justify-end gap-1.5 border-t border-border/50 pt-2">
              <Button
                size="sm"
                variant="ghost"
                class="h-7 rounded-md px-2 text-[11px] text-muted-foreground"
                :disabled="actionsDisabled"
                @click="cancelEditing"
              >
                取消
              </Button>
              <Button
                size="sm"
                variant="outline"
                class="h-7 rounded-md border-border/60 px-2.5 text-[11px] shadow-none"
                :disabled="!canSubmitEdit || actionsDisabled"
                @click="handleSaveEdit"
              >
                保存
              </Button>
              <Button
                size="sm"
                class="h-7 rounded-md px-2.5 text-[11px] shadow-none"
                :disabled="!canSubmitEdit || actionsDisabled"
                @click="handleResendEdit"
              >
                重新发送
              </Button>
            </div>
          </div>

          <div v-else-if="message.content" class="whitespace-pre-wrap break-words">
            {{ message.content }}
          </div>

          <!-- Non-image attachments -->
          <div
            v-if="nonImageAttachments.length"
            :class="['flex flex-wrap gap-1', isEditing ? 'mt-2' : 'mt-1.5']"
          >
            <span
              v-for="att in nonImageAttachments"
              :key="att.id"
              class="inline-flex items-center gap-1 rounded-md bg-background/70 px-1.5 py-0.5 text-xs text-muted-foreground"
              :title="att.url || att.title"
            >
              <DocumentIcon v-if="att.category === 'pdf'" class="h-3 w-3 shrink-0 opacity-70" />
              <DocumentTextIcon
                v-else-if="att.category === 'text'"
                class="h-3 w-3 shrink-0 opacity-70"
              />
              <LinkIcon v-else class="h-3 w-3 shrink-0 opacity-70" />
              <span class="max-w-32 truncate">{{ att.title }}</span>
            </span>
          </div>
        </div>

        <!-- Assistant message: rendered markdown -->
        <MarkdownRenderer v-else-if="message.content" :content="message.content" />

        <!-- Streaming placeholder -->
        <div v-else-if="message.status === 'streaming'" class="flex gap-1 items-center py-1">
          <span
            class="w-1.5 h-1.5 bg-current rounded-full animate-bounce opacity-60"
            style="animation-delay: 0ms"
          ></span>
          <span
            class="w-1.5 h-1.5 bg-current rounded-full animate-bounce opacity-60"
            style="animation-delay: 150ms"
          ></span>
          <span
            class="w-1.5 h-1.5 bg-current rounded-full animate-bounce opacity-60"
            style="animation-delay: 300ms"
          ></span>
        </div>

        <!-- Error state -->
        <div v-if="message.status === 'error'" class="mt-2 pt-2 border-t border-destructive/20">
          <p class="text-xs text-destructive">{{ message.error || '请求失败' }}</p>
          <Button
            v-if="canRegenerate"
            @click="$emit('regenerate', message.id)"
            variant="link"
            class="mt-1 h-auto p-0 text-xs text-destructive hover:text-destructive/80"
            :disabled="actionsDisabled"
          >
            重试
          </Button>
        </div>
      </div>

      <!-- Action buttons -->
      <div
        v-if="message.status !== 'streaming' && !isEditing"
        :class="[
          'mt-1 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100',
          isUser ? 'justify-end' : 'justify-start',
        ]"
      >
        <button
          @click="copyContent"
          type="button"
          class="inline-flex items-center justify-center rounded-md p-1 text-muted-foreground/80 hover:bg-muted hover:text-foreground"
          title="复制消息"
        >
          <CheckIcon v-if="copied" class="h-3.5 w-3.5 text-green-500" />
          <ClipboardDocumentIcon v-else class="h-3.5 w-3.5" />
        </button>

        <button
          v-if="isUser"
          @click="startEditing"
          type="button"
          :disabled="actionsDisabled"
          class="inline-flex items-center justify-center rounded-md p-1 text-muted-foreground/80 hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
          title="编辑消息"
        >
          <PencilSquareIcon class="h-3.5 w-3.5" />
        </button>

        <button
          v-else-if="canRegenerate"
          @click="$emit('regenerate', message.id)"
          type="button"
          :disabled="actionsDisabled"
          class="inline-flex items-center justify-center rounded-md p-1 text-muted-foreground/80 hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
          title="重新生成"
        >
          <ArrowPathIcon class="h-3.5 w-3.5" />
        </button>

        <button
          @click="$emit('delete', message.id)"
          type="button"
          :disabled="actionsDisabled"
          class="inline-flex items-center justify-center rounded-md p-1 text-muted-foreground/80 hover:bg-destructive/10 hover:text-destructive disabled:cursor-not-allowed disabled:opacity-40"
          title="删除消息"
        >
          <TrashIcon class="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import {
  LinkIcon,
  DocumentIcon,
  DocumentTextIcon,
  TrashIcon,
  ClipboardDocumentIcon,
  CheckIcon,
  ArrowPathIcon,
  PencilSquareIcon,
} from '@heroicons/vue/24/outline'
import { MarkdownRenderer } from '@tuple-gpt/ai-ui'
import type { ChatMessage } from '@tuple-gpt/chat-core'
import { Button } from '../ui/button'
import { Textarea } from '../ui/textarea'
import ModelAvatar from './ModelAvatar.vue'

interface AssistantMessageMeta {
  model: string
  providerName: string
}

const props = withDefaults(
  defineProps<{
    message: ChatMessage
    assistantMeta?: AssistantMessageMeta
    canRegenerate?: boolean
    actionsDisabled?: boolean
  }>(),
  {
    canRegenerate: false,
    actionsDisabled: false,
  },
)

const emit = defineEmits<{
  (e: 'regenerate', messageId: string): void
  (e: 'delete', messageId: string): void
  (e: 'edit-save', payload: { messageId: string; content: string }): void
  (e: 'edit-resend', payload: { messageId: string; content: string }): void
}>()

const copied = ref(false)
const isEditing = ref(false)
const draftContent = ref('')
const isUser = computed(() => props.message.role === 'user')
const hasAttachments = computed(() => (props.message.attachments?.length ?? 0) > 0)
const canSubmitEdit = computed(() => draftContent.value.trim().length > 0 || hasAttachments.value)
const formattedTimestamp = computed(() => formatMessageTimestamp(props.message.timestamp))
const bubbleClass = computed(() => [
  'min-w-0 text-sm text-foreground transition-[background-color,border-color,box-shadow]',
  isUser.value
    ? isEditing.value
      ? 'rounded-xl border border-border/60 bg-muted/65 px-2.5 py-2.5 shadow-xs'
      : 'rounded-lg bg-muted/80 px-3 py-2'
    : 'rounded-lg px-3 py-2',
])

const imageAttachments = computed(
  () => props.message.attachments?.filter(a => a.category === 'image' && a.base64Data) ?? [],
)

const nonImageAttachments = computed(
  () => props.message.attachments?.filter(a => a.category !== 'image') ?? [],
)

watch(
  () => [props.message.id, props.message.content] as const,
  () => {
    if (!isEditing.value) {
      draftContent.value = props.message.content
    }
  },
  { immediate: true },
)

function copyContent() {
  navigator.clipboard.writeText(props.message.content)
  copied.value = true
  setTimeout(() => {
    copied.value = false
  }, 2000)
}

function startEditing() {
  draftContent.value = props.message.content
  isEditing.value = true
}

function cancelEditing() {
  draftContent.value = props.message.content
  isEditing.value = false
}

function handleSaveEdit() {
  if (!canSubmitEdit.value || props.actionsDisabled) return

  isEditing.value = false
  const content = draftContent.value.trim()
  emit('edit-save', { messageId: props.message.id, content })
}

function handleResendEdit() {
  if (!canSubmitEdit.value || props.actionsDisabled) return

  isEditing.value = false
  const content = draftContent.value.trim()
  emit('edit-resend', { messageId: props.message.id, content })
}

function formatMessageTimestamp(timestamp: string) {
  const date = new Date(timestamp)
  if (Number.isNaN(date.getTime())) return timestamp

  const year = date.getFullYear()
  const month = padDatePart(date.getMonth() + 1)
  const day = padDatePart(date.getDate())
  const hours = padDatePart(date.getHours())
  const minutes = padDatePart(date.getMinutes())

  return `${year}-${month}-${day} ${hours}:${minutes}`
}

function padDatePart(value: number) {
  return value.toString().padStart(2, '0')
}
</script>
