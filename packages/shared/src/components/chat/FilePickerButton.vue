<template>
  <button
    type="button"
    @click="openFilePicker"
    :disabled="disabled"
    class="inline-flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors disabled:opacity-50 disabled:pointer-events-none"
    title="添加文件"
  >
    <PaperClipIcon class="h-4 w-4" />
  </button>
  <input
    ref="fileInputRef"
    type="file"
    multiple
    :accept="acceptTypes"
    class="hidden"
    @change="handleFileChange"
  />
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { PaperClipIcon } from '@heroicons/vue/24/outline'
import { useFileAttachments } from '../../composables/useFileAttachments'

defineProps<{
  disabled?: boolean
}>()

const { addFiles } = useFileAttachments()
const fileInputRef = ref<HTMLInputElement>()

const acceptTypes = 'image/*,.pdf,.txt,.md,.json,.csv,.js,.ts,.jsx,.tsx,.py,.html,.css,.xml,.yaml,.yml,.toml,.sh,.log,.sql,.java,.go,.rs,.c,.cpp,.h,.rb,.php,.vue,.svelte'

function openFilePicker() {
  fileInputRef.value?.click()
}

function handleFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  if (input.files?.length) {
    addFiles(input.files)
    input.value = '' // reset so the same file can be re-selected
  }
}
</script>
