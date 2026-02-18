<script setup lang="ts">
import { ref, computed } from 'vue'
import ContentSection from './ContentSection.vue'
import { useAIContent } from '@/content/useAIContent'
// 导入提示词
import { SUMMARY_PROMPT, OVERVIEW_PROMPT, KEYPOINTS_PROMPT, QUESTIONS_PROMPT } from '@/constants/prompt'
// 导入Heroicons图标
import { 
  DocumentChartBarIcon,
  ClockIcon,
  BookmarkIcon,
  QuestionMarkCircleIcon,
  EllipsisVerticalIcon,
  ClipboardDocumentIcon,
  ArrowPathRoundedSquareIcon,
  ArrowPathIcon
} from '@heroicons/vue/24/outline'

const props = defineProps<{
  subtitlesContent: string;
  videoTitle?: string;
}>()

// 当前显示的部分
const activeSection = ref('all') // 'all', 'summary', 'overview', 'keypoints', 'questions'
const showDropdownMenu = ref(false) // 控制下拉菜单显示

// 选择要生成的内容部分
const contentSelections = ref({
  summary: true,
  overview: true,
  keypoints: true,
  questions: true
})

// 初始化各个内容区域
const summaryContent = useAIContent()
const overviewContent = useAIContent({ processLinks: true })
const keypointsContent = useAIContent()
const questionsContent = useAIContent()

// 跳转到视频时间的事件处理
const handleTimeLink = (event: MouseEvent) => {
  const target = event.target as HTMLElement

  // 检查是否点击了时间链接
  if (target.classList.contains('time-link')) {
    event.preventDefault()
    const timeStr = target.getAttribute('data-time')
    if (timeStr) {
      // 直接调用 store 方法处理时间字符串
      // videoStore.jumpToTimeString(timeStr)
    }
  }
}


// 生成特定部分的内容
const generateContent = async (type: 'summary' | 'overview' | 'keypoints' | 'questions') => {
  if (!props.subtitlesContent || props.subtitlesContent.trim() === '') {
    return
  }
  
  // 根据类型准备提示词并发送请求
  if (type === 'summary') {
    const summaryPrompt = SUMMARY_PROMPT.replace('{content}', props.subtitlesContent)
    await summaryContent.generateContent(summaryPrompt)
  } 
  else if (type === 'overview') {
    const overviewPrompt = OVERVIEW_PROMPT.replace('{content}', props.subtitlesContent)
    await overviewContent.generateContent(overviewPrompt)
  } 
  else if (type === 'keypoints') {
    const keypointsPrompt = KEYPOINTS_PROMPT.replace('{content}', props.subtitlesContent)
    await keypointsContent.generateContent(keypointsPrompt)
  } 
  else if (type === 'questions') {
    const questionsPrompt = QUESTIONS_PROMPT.replace('{content}', props.subtitlesContent)
    await questionsContent.generateContent(questionsPrompt)
  }
}

// 生成所有选中内容
const generateAllSelected = async () => {
  if (!props.subtitlesContent || props.subtitlesContent.trim() === '') {
    return
  }
  
  // 根据用户选择发起请求
  const promises = []
  
  if (contentSelections.value.summary) {
    const summaryPrompt = SUMMARY_PROMPT.replace('{content}', props.subtitlesContent)
    promises.push(summaryContent.generateContent(summaryPrompt))
  }
  
  if (contentSelections.value.overview) {
    const overviewPrompt = OVERVIEW_PROMPT.replace('{content}', props.subtitlesContent)
    promises.push(overviewContent.generateContent(overviewPrompt))
  }
  
  if (contentSelections.value.keypoints) {
    const keypointsPrompt = KEYPOINTS_PROMPT.replace('{content}', props.subtitlesContent)
    promises.push(keypointsContent.generateContent(keypointsPrompt))
  }
  
  if (contentSelections.value.questions) {
    const questionsPrompt = QUESTIONS_PROMPT.replace('{content}', props.subtitlesContent)
    promises.push(questionsContent.generateContent(questionsPrompt))
  }
  
  await Promise.allSettled(promises)
}

// 全部内容复制方法
const copyAll = () => {
  const allContent = [
    summaryContent.parsedContent(),
    overviewContent.parsedContent(),
    keypointsContent.parsedContent(),
    questionsContent.parsedContent()
  ].filter(Boolean).join('\n\n---\n\n')
  
  if (allContent) {
    summaryContent.copyToClipboard(allContent)
  }
  
  closeDropdownMenu()
}

// 关闭下拉菜单
const closeDropdownMenu = () => {
  showDropdownMenu.value = false
}

// 计算是否有任何内容已经生成
const hasContent = computed(() => {
  return !!(summaryContent.content.value || 
           overviewContent.content.value || 
           keypointsContent.content.value || 
           questionsContent.content.value)
})

// 计算是否有任何生成过程正在进行
const isGenerating = computed(() => {
  return summaryContent.isGenerating.value || 
         overviewContent.isGenerating.value || 
         keypointsContent.isGenerating.value || 
         questionsContent.isGenerating.value
})

// 计算是否有任何可生成的内容选择
const hasContentSelection = computed(() => {
  return contentSelections.value.summary || 
         contentSelections.value.overview || 
         contentSelections.value.keypoints || 
         contentSelections.value.questions
})

// 定义各个部分的图标映射
const contentIcons = {
  overview: ClockIcon,
  keypoints: BookmarkIcon,
  questions: QuestionMarkCircleIcon,
  summary: DocumentChartBarIcon
}
</script>

<template>
  <div class="h-full flex flex-col">
    <!-- 导航栏 -->
    <div class="flex gap-2 mb-4 border-b border-border flex-shrink-0">
      <button 
        @click="activeSection = 'all'" 
        class="px-3 py-2 text-sm transition-colors duration-200 relative"
        :class="activeSection === 'all' ? 'text-primary font-medium' : 'text-muted-foreground hover:text-foreground'"
      >
        全部
        <div v-if="activeSection === 'all'" class="absolute bottom-0 left-0 w-full h-0.5 bg-primary"></div>
      </button>
      <button 
        @click="activeSection = 'overview'" 
        class="px-3 py-2 text-sm transition-colors duration-200 relative"
        :class="activeSection === 'overview' ? 'text-primary font-medium' : 'text-muted-foreground hover:text-foreground'"
      >
        概览
        <div v-if="activeSection === 'overview'" class="absolute bottom-0 left-0 w-full h-0.5 bg-primary"></div>
      </button>
      <button 
        @click="activeSection = 'keypoints'" 
        class="px-3 py-2 text-sm transition-colors duration-200 relative"
        :class="activeSection === 'keypoints' ? 'text-primary font-medium' : 'text-muted-foreground hover:text-foreground'"
      >
        要点
        <div v-if="activeSection === 'keypoints'" class="absolute bottom-0 left-0 w-full h-0.5 bg-primary"></div>
      </button>
      <button 
        @click="activeSection = 'questions'" 
        class="px-3 py-2 text-sm transition-colors duration-200 relative"
        :class="activeSection === 'questions' ? 'text-primary font-medium' : 'text-muted-foreground hover:text-foreground'"
      >
        问答
        <div v-if="activeSection === 'questions'" class="absolute bottom-0 left-0 w-full h-0.5 bg-primary"></div>
      </button>
      <button 
        @click="activeSection = 'summary'" 
        class="px-3 py-2 text-sm transition-colors duration-200 relative"
        :class="activeSection === 'summary' ? 'text-primary font-medium' : 'text-muted-foreground hover:text-foreground'"
      >
        笔记
        <div v-if="activeSection === 'summary'" class="absolute bottom-0 left-0 w-full h-0.5 bg-primary"></div>
      </button>
    </div>
    
    <!-- 全部内容视图 -->
    <div v-if="activeSection === 'all'" class="max-h-96 overflow-y-auto p-3">
      <!-- 内容生成选项或内容视图 -->
      <template v-if="hasContent">
        <!-- 全部视图的操作按钮 -->
        <div class="flex justify-end items-center mb-3 px-3 relative">
          <button 
            @click="showDropdownMenu = !showDropdownMenu" 
            class="p-2 rounded-full hover:bg-accent transition"
            title="更多操作"
          >
            <EllipsisVerticalIcon class="h-5 w-5 text-muted-foreground" />
          </button>
          
          <!-- 下拉菜单 -->
          <div 
            v-if="showDropdownMenu" 
            class="absolute top-full right-3 mt-1 w-40 bg-popover rounded-md shadow-lg z-50 py-1 border border-border"
          >
            <button 
              @click="copyAll" 
              class="w-full px-4 py-2 text-left text-sm text-popover-foreground hover:bg-accent flex items-center gap-2"
            >
              <ClipboardDocumentIcon class="h-4 w-4" />
              <span>复制全部</span>
            </button>
            <button 
              @click="generateAllSelected(); closeDropdownMenu();" 
              class="w-full px-4 py-2 text-left text-sm text-popover-foreground hover:bg-accent flex items-center gap-2"
            >
              <ArrowPathRoundedSquareIcon class="h-4 w-4" />
              <span>重新生成</span>
            </button>
          </div>
          
          <!-- 点击其他区域关闭下拉菜单 -->
          <div 
            v-if="showDropdownMenu" 
            class="fixed inset-0 z-40"
            @click="closeDropdownMenu"
          ></div>
        </div>
        
        <!-- 内容区域 -->
        <div @click="handleTimeLink">
        <ContentSection
            v-if="contentSelections.overview"
          title="视频概览"
          :content="overviewContent.parsedContent()"
          :is-generating="overviewContent.isGenerating.value"
            color-theme="primary"
          :icon="contentIcons.overview"
          @generate="generateContent('overview')"
          @copy="overviewContent.copyToClipboard(overviewContent.content.value)"
        />
        
        <ContentSection
            v-if="contentSelections.keypoints"
          title="关键要点"
          :content="keypointsContent.parsedContent()"
          :is-generating="keypointsContent.isGenerating.value"
            color-theme="secondary"
          :icon="contentIcons.keypoints"
          @generate="generateContent('keypoints')"
          @copy="keypointsContent.copyToClipboard(keypointsContent.content.value)"
        />
        
        <ContentSection
            v-if="contentSelections.questions"
            title="相关问答"
          :content="questionsContent.parsedContent()"
          :is-generating="questionsContent.isGenerating.value"
            color-theme="accent"
          :icon="contentIcons.questions"
          @generate="generateContent('questions')"
          @copy="questionsContent.copyToClipboard(questionsContent.content.value)"
        />
        
        <ContentSection
            v-if="contentSelections.summary"
            title="我的笔记"
          :content="summaryContent.parsedContent()"
          :is-generating="summaryContent.isGenerating.value"
            color-theme="default"
          :icon="contentIcons.summary"
          @generate="generateContent('summary')"
          @copy="summaryContent.copyToClipboard(summaryContent.content.value)"
        />
        </div>
      </template>
      
      <!-- 内容选择与生成界面 -->
      <div v-else class="px-4 py-6">
        <!-- 生成全部内容选项 -->
        <h3 class="font-medium mb-3">选择要生成的内容：</h3>
        <div class="space-y-2 mb-6">
          <label class="flex items-center">
            <input type="checkbox" v-model="contentSelections.overview" class="h-4 w-4 text-primary bg-background border-border rounded focus:ring-primary">
            <span class="ml-2">视频概览</span>
          </label>
          <label class="flex items-center">
            <input type="checkbox" v-model="contentSelections.keypoints" class="h-4 w-4 text-primary bg-background border-border rounded focus:ring-primary">
            <span class="ml-2">关键要点</span>
          </label>
          <label class="flex items-center">
            <input type="checkbox" v-model="contentSelections.questions" class="h-4 w-4 text-primary bg-background border-border rounded focus:ring-primary">
            <span class="ml-2">问题解答</span>
          </label>
          <label class="flex items-center">
            <input type="checkbox" v-model="contentSelections.summary" class="h-4 w-4 text-primary bg-background border-border rounded focus:ring-primary">
            <span class="ml-2">完整笔记</span>
          </label>
        </div>
        
        <button 
          @click="generateAllSelected" 
          class="w-full py-3 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 flex items-center justify-center gap-2 mb-2"
          :disabled="!hasContentSelection || isGenerating"
          :class="{'opacity-50 cursor-not-allowed': !hasContentSelection || isGenerating}"
        >
          <ArrowPathIcon v-if="isGenerating" class="h-5 w-5 animate-spin" />
          <span>
            {{ isGenerating ? '正在生成...' : '生成所选内容' }}
          </span>
        </button>
      </div>
    </div>

    <!-- 单独内容视图 -->
    <div v-else class="max-h-96 overflow-y-auto p-3" @click="handleTimeLink">
      <ContentSection
        v-if="activeSection === 'overview'"
        title="视频概览"
        :content="overviewContent.parsedContent()"
        :is-generating="overviewContent.isGenerating.value"
        color-theme="primary"
        :icon="contentIcons.overview"
        @generate="generateContent('overview')"
        @copy="overviewContent.copyToClipboard(overviewContent.content.value)"
      />

      <ContentSection
        v-if="activeSection === 'keypoints'"
        title="关键要点"
        :content="keypointsContent.parsedContent()"
        :is-generating="keypointsContent.isGenerating.value"
        color-theme="secondary"
        :icon="contentIcons.keypoints"
        @generate="generateContent('keypoints')"
        @copy="keypointsContent.copyToClipboard(keypointsContent.content.value)"
      />

      <ContentSection
        v-if="activeSection === 'questions'"
        title="相关问答"
        :content="questionsContent.parsedContent()"
        :is-generating="questionsContent.isGenerating.value"
        color-theme="accent"
        :icon="contentIcons.questions"
        @generate="generateContent('questions')"
        @copy="questionsContent.copyToClipboard(questionsContent.content.value)"
      />
      <ContentSection
        v-if="activeSection === 'summary'"
        title="我的笔记"
        :content="summaryContent.parsedContent()"
        :is-generating="summaryContent.isGenerating.value"
        color-theme="default"
        :icon="contentIcons.summary"
        @generate="generateContent('summary')"
        @copy="summaryContent.copyToClipboard(summaryContent.content.value)"
      />
    </div>
  </div>
</template>

<style scoped>
</style>