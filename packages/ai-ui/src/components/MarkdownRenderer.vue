<template>
  <div ref="containerRef" class="markdown-body" v-html="renderedHtml"></div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onUpdated, onUnmounted } from 'vue'
import { parseMarkdown, setupCodeCopyButtons, cleanupCodeCopyButtons } from '../composables/useMarkdown'
import '../styles/markdown.less'
import '../styles/markdown-patch.less'
import '../styles/highlight-theme.less'

const props = defineProps<{
  content: string
}>()

const containerRef = ref<HTMLElement | null>(null)

const renderedHtml = computed(() => parseMarkdown(props.content))

function bindCopyButtons() {
  if (containerRef.value) {
    setupCodeCopyButtons(containerRef.value)
  }
}

onMounted(bindCopyButtons)
onUpdated(bindCopyButtons)

onUnmounted(() => {
  if (containerRef.value) {
    cleanupCodeCopyButtons(containerRef.value)
  }
})
</script>

<style lang="less">
.markdown-body {
  .code-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 4px 12px;
    font-size: 12px;
    color: #8b949e;
    border-bottom: 1px solid rgba(110, 118, 129, 0.2);
  }

  .code-lang {
    font-family: ui-monospace, SFMono-Regular, SF Mono, Menlo, Consolas, Liberation Mono, monospace;
    text-transform: lowercase;
  }

  .code-copy {
    background: none;
    border: 1px solid rgba(110, 118, 129, 0.3);
    color: #8b949e;
    border-radius: 4px;
    padding: 2px 8px;
    cursor: pointer;
    font-size: 11px;
    line-height: 1.4;
    transition: color 0.15s, border-color 0.15s;

    &:hover {
      color: #c9d1d9;
      border-color: rgba(110, 118, 129, 0.6);
    }
  }
}
</style>
