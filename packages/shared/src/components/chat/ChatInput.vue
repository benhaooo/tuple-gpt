<template>
  <div
    ref="dropZoneRef"
    class="relative px-3 py-3"
  >
    <div
      v-if="isDragOver"
      class="absolute inset-3 z-10 flex items-center justify-center rounded-3xl backdrop-blur-md bg-background/60 border-2 border-dashed border-primary/40"
    >
      <span class="text-sm font-medium text-primary/80">拖放文件到此处</span>
    </div>

    <div
      class="overflow-hidden rounded-3xl border bg-background/80 p-2 shadow-sm transition-colors"
      :class="isDragOver ? 'border-primary' : 'border-input'"
    >
      <!-- 文件附件预览 -->
      <FileAttachmentPreview />

      <!-- 平台附件预览（如已选 tab 列表） -->
      <component :is="platform.InputPreview" v-if="platform.InputPreview" />

      <Textarea
        v-model="inputText"
        :disabled="disabled"
        :placeholder="disabled ? '请先配置AI服务商' : '输入消息... (Shift+Enter 换行)'"
        rows="1"
        class="min-h-24 max-h-56 w-full resize-none overflow-y-auto rounded-2xl border-0 bg-transparent px-3 pt-3 pb-2 text-base shadow-none focus-visible:border-0 focus-visible:ring-0 md:text-sm"
        @keydown.enter.exact="handleEnter"
        @paste="handlePaste"
      />

      <div class="flex items-center justify-between px-1 py-1">
        <div class="flex items-center gap-1">
          <!-- 文件选择按钮 -->
          <FilePickerButton :disabled="disabled" />

          <!-- 平台操作按钮（如 tab 选择器） -->
          <component :is="platform.InputActions" v-if="platform.InputActions" :disabled="disabled" />
        </div>

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
            :disabled="disabled || (!inputText.trim() && fileAttachments.length === 0)"
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
import { useDropZone } from '@vueuse/core'
import { PaperAirplaneIcon, StopIcon } from '@heroicons/vue/24/solid'
import { Button } from '../ui/button'
import { Textarea } from '../ui/textarea'
import { usePlatform } from '../../composables/usePlatform'
import { useFileAttachments } from '../../composables/useFileAttachments'
import FileAttachmentPreview from './FileAttachmentPreview.vue'
import FilePickerButton from './FilePickerButton.vue'

defineProps<{
  isStreaming: boolean
  disabled?: boolean
}>()

const emit = defineEmits<{
  (e: 'send', content: string): void
  (e: 'stop'): void
}>()

const platform = usePlatform()
const { attachments: fileAttachments, addFiles } = useFileAttachments()
const inputText = ref('')
const dropZoneRef = ref()
const { isOverDropZone: isDragOver } = useDropZone(dropZoneRef, {
  onDrop(files) {
    if (files?.length) addFiles(files)
  },
})

function handleEnter(event: KeyboardEvent) {
  if (event.isComposing) return
  event.preventDefault()
  handleSend()
}

function handleSend() {
  const text = inputText.value.trim()
  if (!text && fileAttachments.value.length === 0) return
  emit('send', text)
  inputText.value = ''
}

function handlePaste(event: ClipboardEvent) {
  const items = event.clipboardData?.items
  if (!items) return

  const files: File[] = []
  for (const item of items) {
    if (item.kind === 'file') {
      const file = item.getAsFile()
      if (file) files.push(file)
    }
  }
  if (files.length > 0) {
    event.preventDefault()
    addFiles(files)
  }
}
</script>
