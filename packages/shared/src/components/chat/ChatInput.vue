<template>
  <div class="px-3 py-3">
    <div class="overflow-hidden rounded-3xl border border-input bg-background/80 p-2 shadow-sm">
      <!-- 附件预览 -->
      <AttachmentPreview
        :tabs="selectedTabs"
        @remove="handleRemoveTab"
      />

      <Textarea
        v-model="inputText"
        :disabled="disabled"
        :placeholder="disabled ? '请先配置AI服务商' : '输入消息... (Shift+Enter 换行)'"
        rows="1"
        class="min-h-24 max-h-56 w-full resize-none overflow-y-auto rounded-2xl border-0 bg-transparent px-3 pt-3 pb-2 text-base shadow-none focus-visible:border-0 focus-visible:ring-0 md:text-sm"
        @keydown.enter.exact="handleEnter"
      />

      <div class="flex items-center justify-between px-1 py-1">
        <AttachmentSelector v-model="selectedTabs" :disabled="disabled" />

        <div class="flex items-center gap-1.5">
          <Button
            v-if="isStreaming"
            @click="$emit('stop')"
            variant="destructive"
            size="icon-sm"
            class="size-8 rounded-full"
            title="停止生成"
          >
            <StopIcon class="h-4 w-4" />
          </Button>
          <Button
            v-else
            @click="handleSend"
            :disabled="disabled || !inputText.trim()"
            size="icon-sm"
            class="size-8 rounded-full"
            title="发送"
          >
            <PaperAirplaneIcon class="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { PaperAirplaneIcon, StopIcon } from '@heroicons/vue/24/solid'
import { Button } from '../ui/button'
import { Textarea } from '../ui/textarea'
import AttachmentSelector from './AttachmentSelector.vue'
import AttachmentPreview from './AttachmentPreview.vue'
import type { BrowserTab } from '../../composables/useBrowserTabs'

defineProps<{
  isStreaming: boolean
  disabled?: boolean
}>()

const emit = defineEmits<{
  (e: 'send', content: string, tabs: BrowserTab[]): void
  (e: 'stop'): void
  (e: 'tabSelected', tab: BrowserTab): void
}>()

const inputText = ref('')
const selectedTabs = ref<BrowserTab[]>([])

function handleEnter(event: KeyboardEvent) {
  // IME candidate confirm also uses Enter; do not treat it as send.
  if (event.isComposing || event.key === 'Process' || (event as KeyboardEvent & { keyCode?: number }).keyCode === 229) {
    return
  }
  event.preventDefault()
  handleSend()
}

function handleSend() {
  const text = inputText.value.trim()
  if (!text) return
  emit('send', text, [...selectedTabs.value])
  inputText.value = ''
  // 发送后清空附件
  selectedTabs.value = []
}

function handleRemoveTab(tabId: number) {
  selectedTabs.value = selectedTabs.value.filter(tab => tab.id !== tabId)
}
</script>
