<script setup lang="ts">
import { ref, computed } from 'vue'
import { 
  ClipboardDocumentIcon, 
  ArrowPathRoundedSquareIcon, 
  CheckIcon 
} from '@heroicons/vue/24/outline'

const props = defineProps<{
  title: string;
  content: string;
  isGenerating: boolean;
  colorTheme: 'primary' | 'secondary' | 'accent' | 'default';
  icon?: any;
}>()

const emit = defineEmits<{
  (e: 'generate'): void;
  (e: 'copy'): void;
}>()

// 复制状态
const isCopied = ref(false)

// Map color themes to the new 'soft' background and text color classes
const themeClasses = computed(() => {
  switch (props.colorTheme) {
    case 'primary':
      return {
        bg: 'bg-primary-soft',
        text: 'text-primary-soft-foreground',
        prose: 'prose-primary'
      }
    case 'secondary':
      return {
        bg: 'bg-secondary-soft',
        text: 'text-secondary-soft-foreground',
        prose: 'prose-secondary'
      }
    case 'accent':
      return {
        bg: 'bg-accent-soft',
        text: 'text-accent-soft-foreground',
        prose: 'prose-accent'
      }
    default:
      return {
        bg: 'bg-background',
        text: 'text-foreground',
        prose: ''
      }
  }
})

// 处理复制操作
const handleCopy = () => {
  emit('copy')
  isCopied.value = true
  setTimeout(() => {
    isCopied.value = false
  }, 2000)
}

// 处理生成操作
const handleGenerate = () => {
  emit('generate')
}
</script>

<template>
  <div :class="[themeClasses.bg, 'p-4 rounded-lg mb-4']">
    <div class="flex justify-between items-center mb-2">
      <h3 :class="[themeClasses.text, 'font-semibold']">{{ title }}</h3>
      <div class="flex items-center gap-1" :class="themeClasses.text" v-if="content">
        <button 
          @click="handleCopy" 
          class="p-1 text-xs opacity-70 hover:opacity-100"
          title="复制内容"
        >
          <CheckIcon v-if="isCopied" class="h-4 w-4 text-green-500" />
          <ClipboardDocumentIcon v-else class="h-4 w-4" />
        </button>
        <button 
          @click="handleGenerate" 
          :disabled="isGenerating"
          class="p-1 text-xs opacity-70 hover:opacity-100"
          :class="{'opacity-50 cursor-not-allowed': isGenerating}"
          title="重新生成"
        >
          <ArrowPathRoundedSquareIcon class="h-4 w-4" :class="{'animate-spin': isGenerating}" />
        </button>
      </div>
    </div>
    
    <!-- 内容开始生成 -->
    <div v-if="content || isGenerating"> 
      <div 
        v-if="content" 
        class="prose prose-sm dark:prose-invert max-w-none" 
        :class="[themeClasses.text, themeClasses.prose]" 
        v-html="content"
      ></div>
      <div v-else :class="['prose prose-sm dark:prose-invert max-w-none min-h-[50px] animate-pulse', themeClasses.text]">
        生成中...
      </div>
    </div>
    
    <!-- 未生成状态 -->
    <div v-else class="flex justify-center items-center py-2">
      <button 
        @click="handleGenerate"
        class="bg-primary text-primary-foreground px-2 py-1.5 text-xs font-semibold rounded-md flex items-center hover:bg-primary/90"
      >
        <component v-if="icon" :is="icon" class="h-4 w-4 mr-1.5" />
        <span>生成{{ title }}</span>
      </button>
    </div>
  </div>
</template> 

<style scoped>
/* 自定义 prose 样式变体，确保链接颜色与主题一致 */
.prose.prose-primary a {
  color: hsl(var(--primary));
}
.prose.prose-primary a:hover {
  color: hsl(var(--primary) / 0.8);
}

.prose.prose-secondary a {
  color: hsl(var(--secondary));
}
.prose.prose-secondary a:hover {
  color: hsl(var(--secondary) / 0.8);
}

.prose.prose-accent a {
  color: hsl(var(--accent));
}
.prose.prose-accent a:hover {
  color: hsl(var(--accent) / 0.8);
}

/* 暗色模式下的链接颜色调整 */
.dark .prose.prose-primary a {
  color: hsl(var(--primary-foreground));
}
.dark .prose.prose-secondary a {
  color: hsl(var(--secondary-foreground));
}
.dark .prose.prose-accent a {
  color: hsl(var(--accent-foreground));
}

/* 确保时间链接样式一致 */
.prose .time-link {
  text-decoration: underline;
  text-decoration-style: dotted;
  text-underline-offset: 2px;
}
</style> 