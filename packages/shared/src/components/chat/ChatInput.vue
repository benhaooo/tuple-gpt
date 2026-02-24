<template>
  <div class="px-3 py-2 border-t border-border">
    <div class="flex items-end gap-2">
      <textarea
        ref="inputRef"
        v-model="inputText"
        :disabled="disabled"
        :placeholder="disabled ? '请先配置AI服务商' : '输入消息... (Shift+Enter 换行)'"
        rows="1"
        class="flex-1 resize-none bg-muted rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring max-h-32"
        @keydown.enter.exact.prevent="handleSend"
        @input="autoResize"
      ></textarea>

      <button
        v-if="isStreaming"
        @click="$emit('stop')"
        class="p-2 rounded-lg bg-destructive text-destructive-foreground hover:bg-destructive/90 flex-shrink-0"
        title="停止生成"
      >
        <StopIcon class="h-4 w-4" />
      </button>
      <button
        v-else
        @click="handleSend"
        :disabled="disabled || !inputText.trim()"
        class="p-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
        title="发送"
      >
        <PaperAirplaneIcon class="h-4 w-4" />
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick } from 'vue'
import { PaperAirplaneIcon, StopIcon } from '@heroicons/vue/24/solid'

defineProps<{
  isStreaming: boolean
  disabled?: boolean
}>()

const emit = defineEmits<{
  (e: 'send', content: string): void
  (e: 'stop'): void
}>()

const inputText = ref('')
const inputRef = ref<HTMLTextAreaElement>()

function handleSend() {
  const text = inputText.value.trim()
  if (!text) return
  emit('send', text)
  inputText.value = ''
  nextTick(() => autoResize())
}

function autoResize() {
  const el = inputRef.value
  if (!el) return
  el.style.height = 'auto'
  el.style.height = Math.min(el.scrollHeight, 128) + 'px'
}
</script>
