<template>
  <div class="px-3 py-3">
    <div class="overflow-hidden rounded-3xl border border-input bg-background/80 p-2 shadow-sm">
      <!-- 平台附件预览（如已选 tab 列表） -->
      <component :is="platform.InputPreview" v-if="platform.InputPreview" />

      <Textarea
        v-model="inputText"
        :disabled="disabled"
        :placeholder="disabled ? '请先配置AI服务商' : '输入消息... (Shift+Enter 换行)'"
        rows="1"
        class="min-h-24 max-h-56 w-full resize-none overflow-y-auto rounded-2xl border-0 bg-transparent px-3 pt-3 pb-2 text-base shadow-none focus-visible:border-0 focus-visible:ring-0 md:text-sm"
        @keydown.enter.exact="handleEnter"
      />

      <div class="flex items-center justify-between px-1 py-1">
        <!-- 平台操作按钮（如 tab 选择器） -->
        <component :is="platform.InputActions" v-if="platform.InputActions" :disabled="disabled" />
        <div v-else />

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
import { usePlatform } from '../../composables/usePlatform'

defineProps<{
  isStreaming: boolean
  disabled?: boolean
}>()

const emit = defineEmits<{
  (e: 'send', content: string): void
  (e: 'stop'): void
}>()

const platform = usePlatform()
const inputText = ref('')

function handleEnter(event: KeyboardEvent) {
  if (event.isComposing) return
  event.preventDefault()
  handleSend()
}

function handleSend() {
  const text = inputText.value.trim()
  if (!text) return
  emit('send', text)
  inputText.value = ''
}
</script>
