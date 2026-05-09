<template>
  <div class="space-y-2">
    <!-- User message (first message in turn) -->
    <div v-if="userMessage" class="group flex min-w-0 justify-end">
      <div class="min-w-0 max-w-[85%]">
        <div class="rounded-lg bg-muted/80 px-3 py-2 text-sm text-foreground">
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

          <div v-else-if="userTextContent" class="whitespace-pre-wrap break-words">
            {{ userTextContent }}
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

        <!-- User actions -->
        <div
          v-if="!isEditing"
          class="mt-1 flex justify-end opacity-0 transition-opacity group-hover:opacity-100"
        >
          <div class="inline-flex items-center gap-1">
            <button
              @click="copyUserContent"
              type="button"
              class="inline-flex items-center justify-center rounded-md p-1 text-muted-foreground/80 hover:bg-muted hover:text-foreground"
              title="复制消息"
            >
              <CheckIcon v-if="userCopied" class="h-3.5 w-3.5 text-green-500" />
              <ClipboardDocumentIcon v-else class="h-3.5 w-3.5" />
            </button>
            <button
              @click="startEditing"
              type="button"
              :disabled="actionsDisabled"
              class="inline-flex items-center justify-center rounded-md p-1 text-muted-foreground/80 hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
              title="编辑消息"
            >
              <PencilSquareIcon class="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Assistant response group -->
    <div v-if="assistantSteps.length" class="group flex min-w-0 justify-start">
      <div class="min-w-0 w-full">
        <div class="rounded-lg px-3 py-2 text-sm text-foreground">
          <!-- Model meta (once for the turn) -->
          <div
            v-if="assistantMeta"
            class="mb-2 flex max-w-full min-w-0 items-center gap-2 text-muted-foreground"
          >
            <ModelAvatar class="opacity-90" :model-id="assistantMeta.model" :size="20" />
            <div class="min-w-0 flex-1">
              <div
                class="break-words text-[12px] font-semibold leading-5 text-foreground/85"
                :title="`${assistantMeta.model}｜${assistantMeta.providerName}`"
              >
                <span>{{ assistantMeta.model }}</span>
                <span class="text-muted-foreground/45" aria-hidden="true">｜</span>
                <span class="font-medium text-muted-foreground/78">
                  {{ assistantMeta.providerName }}
                </span>
              </div>
            </div>
          </div>

          <!-- Steps: each assistant message + its tool results -->
          <div class="space-y-3">
            <div v-for="(step, idx) in assistantSteps" :key="idx">
              <!-- Text content -->
              <MarkdownRenderer v-if="step.text" :content="step.text" />

              <!-- Tool calls with inline results -->
              <div v-if="step.toolCalls.length" class="mt-2 space-y-1.5">
                <details
                  v-for="tc in step.toolCalls"
                  :key="tc.id"
                  :class="[
                    'rounded-md border px-2 py-1.5',
                    tc.status === 'error'
                      ? 'border-destructive/35 bg-destructive/5'
                      : tc.status === 'running'
                        ? 'border-amber-500/40 bg-amber-500/5'
                        : 'border-border/60 bg-muted/30',
                  ]"
                >
                  <summary
                    class="flex cursor-pointer list-none items-center gap-1.5 text-xs font-medium text-muted-foreground"
                  >
                    <WrenchScrewdriverIcon class="h-3.5 w-3.5 shrink-0" />
                    <span class="truncate">{{ tc.name }}</span>
                    <span
                      v-if="tc.status === 'running'"
                      class="ml-auto inline-flex items-center gap-1 text-amber-600"
                    >
                      <ArrowPathIcon class="h-3 w-3 animate-spin" />
                    </span>
                    <span
                      v-else-if="tc.status === 'error'"
                      class="ml-auto inline-flex items-center gap-1 text-destructive"
                    >
                      <XCircleIcon class="h-3 w-3" />
                    </span>
                    <span
                      v-else-if="tc.status === 'done' && tc.result !== undefined"
                      class="ml-auto inline-flex items-center gap-1 text-emerald-600"
                    >
                      <CheckCircleIcon class="h-3 w-3" />
                    </span>
                  </summary>
                  <div class="mt-1.5 space-y-1.5">
                    <pre
                      class="max-h-48 overflow-auto whitespace-pre-wrap break-words rounded bg-background/70 p-2 text-[11px] leading-5 text-muted-foreground"
                      >{{ formatToolArguments(tc.arguments) }}</pre
                    >
                    <div
                      v-if="tc.result !== undefined"
                      :class="[
                        'rounded border px-2 py-1.5',
                        tc.status === 'error'
                          ? 'border-destructive/35 bg-destructive/5'
                          : 'border-border/40 bg-background/50',
                      ]"
                    >
                      <pre
                        class="max-h-56 overflow-auto whitespace-pre-wrap break-words text-[11px] leading-5 text-muted-foreground"
                        >{{ tc.result }}</pre
                      >
                    </div>
                  </div>
                </details>
              </div>

              <!-- Streaming placeholder -->
              <div
                v-if="step.isStreaming && !step.text && !step.toolCalls.length"
                class="flex gap-1 items-center py-1"
              >
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
            </div>
          </div>

          <!-- Error state -->
          <div v-if="turnError" class="mt-2 pt-2 border-t border-destructive/20">
            <p class="text-xs text-destructive">{{ turnError }}</p>
            <Button
              v-if="hasUserMessage"
              @click="$emit('regenerate', turn.id)"
              variant="link"
              class="mt-1 h-auto p-0 text-xs text-destructive hover:text-destructive/80"
              :disabled="actionsDisabled"
            >
              重试
            </Button>
          </div>
        </div>

        <!-- Turn-level actions -->
        <div
          v-if="!isStreaming && assistantSteps.length"
          class="mt-1 flex justify-start opacity-0 transition-opacity group-hover:opacity-100"
        >
          <div class="inline-flex items-center gap-1">
            <button
              @click="copyAssistantContent"
              type="button"
              class="inline-flex items-center justify-center rounded-md p-1 text-muted-foreground/80 hover:bg-muted hover:text-foreground"
              title="复制消息"
            >
              <CheckIcon v-if="assistantCopied" class="h-3.5 w-3.5 text-green-500" />
              <ClipboardDocumentIcon v-else class="h-3.5 w-3.5" />
            </button>

            <button
              v-if="hasUserMessage"
              @click="$emit('regenerate', turn.id)"
              type="button"
              :disabled="actionsDisabled"
              class="inline-flex items-center justify-center rounded-md p-1 text-muted-foreground/80 hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
              title="重新生成"
            >
              <ArrowPathIcon class="h-3.5 w-3.5" />
            </button>

            <button
              @click="$emit('delete', turn.id)"
              type="button"
              :disabled="actionsDisabled"
              class="inline-flex items-center justify-center rounded-md p-1 text-muted-foreground/80 hover:bg-destructive/10 hover:text-destructive disabled:cursor-not-allowed disabled:opacity-40"
              title="删除本轮"
            >
              <TrashIcon class="h-3.5 w-3.5" />
            </button>

            <span
              class="ml-1 shrink-0 border-l border-border/60 pl-2 text-[10px] leading-none text-muted-foreground/55"
            >
              {{ formattedTimestamp }}
            </span>
          </div>
        </div>
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
  WrenchScrewdriverIcon,
  XCircleIcon,
  CheckCircleIcon,
} from '@heroicons/vue/24/outline'
import { MarkdownRenderer } from '@tuple-gpt/ai-ui'
import { getContentText } from '@tuple-gpt/chat-core'
import type { ChatTurn, ChatMessage } from '@tuple-gpt/chat-core'
import { Button } from '../ui/button'
import { Textarea } from '../ui/textarea'
import ModelAvatar from './ModelAvatar.vue'

interface AssistantMeta {
  model: string
  providerName: string
}

type ToolCallStatus = 'running' | 'done' | 'error'

interface ToolCallWithResult {
  id: string
  name: string
  arguments: string
  status: ToolCallStatus
  result?: string
}

interface AssistantStep {
  text: string
  toolCalls: ToolCallWithResult[]
  isStreaming: boolean
}

const props = withDefaults(
  defineProps<{
    turn: ChatTurn
    assistantMeta?: AssistantMeta
    actionsDisabled?: boolean
  }>(),
  {
    actionsDisabled: false,
  },
)

defineEmits<{
  (e: 'regenerate', turnId: string): void
  (e: 'delete', turnId: string): void
  (e: 'edit-save', payload: { turnId: string; content: string }): void
  (e: 'edit-resend', payload: { turnId: string; content: string }): void
}>()

const userCopied = ref(false)
const assistantCopied = ref(false)
const isEditing = ref(false)
const draftContent = ref('')

const userMessage = computed(() => props.turn.messages.find(m => m.role === 'user'))
const hasUserMessage = computed(() => !!userMessage.value)
const isStreaming = computed(() => props.turn.messages.some(m => m.status === 'streaming'))

const userTextContent = computed(() => {
  if (!userMessage.value) return ''
  return getContentText(userMessage.value.content)
})

const canSubmitEdit = computed(() => {
  return draftContent.value.trim().length > 0 || (userMessage.value?.attachments?.length ?? 0) > 0
})

const imageAttachments = computed(
  () => userMessage.value?.attachments?.filter(a => a.category === 'image' && a.base64Data) ?? [],
)

const nonImageAttachments = computed(
  () => userMessage.value?.attachments?.filter(a => a.category !== 'image') ?? [],
)

const turnError = computed(() => {
  const lastMsg = props.turn.messages[props.turn.messages.length - 1]
  if (lastMsg?.status === 'error') return lastMsg.error || '请求失败'
  if (props.turn.status === 'error') return props.turn.error || '请求失败'
  return ''
})

// Build assistant steps: pair each assistant message with its following tool results
const assistantSteps = computed<AssistantStep[]>(() => {
  const messages = props.turn.messages
  const steps: AssistantStep[] = []

  // Collect all tool results from tool messages into a map by toolCallId
  const toolResultMap = new Map<string, { result: string; isError?: boolean }>()
  for (const msg of messages) {
    if (msg.role === 'tool') {
      for (const part of msg.content) {
        if (part.type === 'tool_result') {
          toolResultMap.set(part.toolCallId, { result: part.result, isError: part.isError })
        }
      }
    }
  }

  for (const msg of messages) {
    if (msg.role !== 'assistant') continue

    const text = getContentText(msg.content)
    const toolCalls: ToolCallWithResult[] = []

    for (const part of msg.content) {
      if (part.type === 'tool_call') {
        const result = toolResultMap.get(part.toolCall.id)
        let status: ToolCallStatus = 'running'
        if (result) {
          status = result.isError ? 'error' : 'done'
        } else if (props.turn.status !== 'running') {
          status = 'done'
        }
        toolCalls.push({
          id: part.toolCall.id,
          name: part.toolCall.name,
          arguments: part.toolCall.arguments,
          status,
          result: result?.result,
        })
      }
    }

    steps.push({
      text,
      toolCalls,
      isStreaming: msg.status === 'streaming',
    })
  }

  return steps
})

const formattedTimestamp = computed(() => {
  const lastAssistant = [...props.turn.messages].reverse().find(m => m.role === 'assistant')
  if (!lastAssistant) return ''
  return formatMessageTimestamp(lastAssistant.createdAt)
})

watch(
  () => userTextContent.value,
  val => {
    if (!isEditing.value) draftContent.value = val
  },
  { immediate: true },
)

function startEditing() {
  draftContent.value = userTextContent.value
  isEditing.value = true
}

function cancelEditing() {
  draftContent.value = userTextContent.value
  isEditing.value = false
}

function handleSaveEdit() {
  if (!canSubmitEdit.value || props.actionsDisabled) return
  isEditing.value = false
}

function handleResendEdit() {
  if (!canSubmitEdit.value || props.actionsDisabled) return
  isEditing.value = false
}

function copyUserContent() {
  navigator.clipboard.writeText(userTextContent.value)
  userCopied.value = true
  setTimeout(() => {
    userCopied.value = false
  }, 2000)
}

function copyAssistantContent() {
  const text = assistantSteps.value
    .map(s => s.text)
    .filter(Boolean)
    .join('\n\n')
  navigator.clipboard.writeText(text)
  assistantCopied.value = true
  setTimeout(() => {
    assistantCopied.value = false
  }, 2000)
}

function formatToolArguments(value: string) {
  if (!value) return '{}'
  try {
    return JSON.stringify(JSON.parse(value), null, 2)
  } catch {
    return value
  }
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
