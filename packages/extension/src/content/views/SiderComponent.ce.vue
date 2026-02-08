<script setup lang="ts">
import { ref, onMounted, onUnmounted, useShadowRoot } from 'vue'
import { VideoType } from '@/utils/subtitlesApi'
import { useVideoStore } from '@/hooks/useVideoStore'
import SubtitleViewer from './cpnt/subtitle/SubtitleViewer.vue'
import SummaryViewer from './cpnt/summary/SummaryViewer.vue'
import {
  Bars3Icon,
  DocumentTextIcon,
  Cog6ToothIcon,
  ChatBubbleLeftIcon,
  DocumentChartBarIcon,
} from '@heroicons/vue/24/outline'
import { useTheme } from '@shared/composables/useTheme'

// Tab类型定义
const TabTypes = {
  SUBTITLES: 'subtitles',
  SUMMARY: 'summary',
} as const

type TabType = typeof TabTypes[keyof typeof TabTypes]

// 接收平台类型作为组件属性
const props = defineProps<{
  platformType: VideoType
}>()

const videoStore = useVideoStore(props.platformType)
const { videoTitle, availableSubtitles, selectedSubtitle, selectedLanguage, subtitlesContent, isLoading, error, activeSubtitleIndex, initializeSubtitles } = videoStore

// 视图状态
const activeTab = ref<TabType>(TabTypes.SUBTITLES)
const showLanguageDropdown = ref(false)


// UI交互处理函数（仅UI状态更新，无实际功能）
const selectTab = (tab: TabType) => {
  activeTab.value = tab
}

// 打开设置页面
const openSettings = () => {
  chrome.runtime.sendMessage({ action: 'openOptionsPage' })
}


// 语言选择处理函数
const selectLanguage = async (language: any) => {
  selectedLanguage.value = language.lan
  showLanguageDropdown.value = false
}

// 切换下拉框显示状态
const toggleLanguageDropdown = () => {
  showLanguageDropdown.value = !showLanguageDropdown.value
}

// 关闭下拉框
const closeLanguageDropdown = () => {
  showLanguageDropdown.value = false
}

// 刷新字幕函数
const loadSubtitles = async () => {
  await videoStore.initializeSubtitles()
}

onMounted(() => {
  const shadowRoot = useShadowRoot();
  if (shadowRoot) {
    useTheme(() => shadowRoot.host as HTMLElement);
  }

  // 添加全局点击事件监听器来关闭下拉框
  document.addEventListener('click', closeLanguageDropdown)
})

// 组件卸载时清理事件监听器
onUnmounted(() => {
  document.removeEventListener('click', closeLanguageDropdown)
})

// 总��视频功能
const summarizeVideo = () => {
  activeTab.value = TabTypes.SUMMARY
}

// 刷新组件方法
const refresh = () => {
  initializeSubtitles()
}

// 暴露方法给外部调用
defineExpose({
  refresh
})


</script>

<template>
  <div
    class="w-full h-full bg-surface text-foreground rounded-lg shadow-lg font-sans text-sm overflow-hidden flex flex-col">
    <!-- 头部ne -->
    <header class="flex justify-between items-center p-3 border-b border-border flex-shrink-0">
      <div class="flex items-center gap-2">
        <h1 class="text-lg font-bold text-foreground">Tuple</h1>
      </div>
      <div class="flex items-center gap-3 text-foreground">
        <!-- Sliding Tab Switch -->
        <div class="relative flex items-center p-1 bg-muted rounded-lg">
          <!-- Slider -->
          <div
            class="absolute top-1 left-1 h-6 w-7 transform bg-background rounded-md shadow-sm transition-transform duration-200 ease-in-out"
            :style="{ transform: activeTab === TabTypes.SUMMARY ? 'translateX(100%)' : 'translateX(0)' }"></div>

          <!-- Subtitles Button -->
          <button @click="selectTab(TabTypes.SUBTITLES)" class="relative z-10 p-1 w-7 h-6 flex justify-center items-center"
            :class="activeTab === TabTypes.SUBTITLES ? 'text-primary' : 'text-muted-foreground'">
            <Bars3Icon class="h-5 w-5" />
          </button>

          <!-- Summary/CC Button -->
          <button @click="selectTab(TabTypes.SUMMARY)" class="relative z-10 p-1 w-7 h-6 flex justify-center items-center"
            :class="activeTab === TabTypes.SUMMARY ? 'text-primary' : 'text-muted-foreground'">
            <DocumentTextIcon class="h-5 w-5" />
          </button>
        </div>

        <!-- Language Selection Dropdown -->
        <div class="relative">
          <button @click.stop="toggleLanguageDropdown""
            class=" flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground px-2 py-1
            rounded-md hover:bg-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
            <span>{{ selectedSubtitle?.lan_doc }}</span>
          </button>

          <!-- 下拉框 -->
          <div v-if="showLanguageDropdown && availableSubtitles.length"
            class="absolute top-full right-0 mt-1 w-32 bg-background border border-border rounded-md shadow-lg z-50"
            @click.stop>
            <div class="py-1 max-h-48 overflow-y-auto">
              <button v-for="language in availableSubtitles" :key="language.lan" @click="selectLanguage(language)"
                class="w-full text-left px-3 py-2 text-xs hover:bg-accent hover:text-accent-foreground transition-colors"
                :class="{
                  'bg-accent text-accent-foreground': selectedLanguage === language.lan
                }">
                {{ language.lan_doc }}
              </button>
            </div>
          </div>
        </div>
        <button class="p-1 rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
          @click="openSettings">
          <Cog6ToothIcon class="h-5 w-5" />
        </button>
      </div>
    </header>

    <!-- 主体内容 -->
    <main class="flex-grow overflow-y-auto min-h-0">
      <div v-show="activeTab === TabTypes.SUBTITLES" class="p-3">
        <SubtitleViewer :platform-type="props.platformType" :is-loading="isLoading" :error="error"
          :subtitles-content="subtitlesContent" :selected-subtitle="selectedSubtitle"
          :active-subtitle-index="activeSubtitleIndex" v-model:auto-scroll="videoStore.autoScroll.value"
          @jump-to-time="videoStore.jumpToTime" @load-subtitles="loadSubtitles" />
      </div>
      <!-- 总结视图 -->
      <div v-show="activeTab === TabTypes.SUMMARY" class="p-3">
        <div class="flex justify-between items-center mb-2">
          <h2 class="text-base font-medium text-foreground">{{ videoTitle || '视频总结' }}</h2>
        </div>
        <SummaryViewer :subtitles-content="subtitlesContent" :video-title="videoTitle" />
      </div>
    </main>

    <!-- Chat Footer -->
    <footer class="p-3 border-t border-border flex-shrink-0">
      <div class="flex items-center gap-2">
        <div class="flex-grow h-9 bg-muted rounded-lg flex items-center px-3 cursor-pointer group hover:bg-accent">
          <span class="text-sm text-muted-foreground group-hover:text-accent-foreground">与视频聊天</span>
        </div>
        <button class="p-1.5 rounded-lg bg-muted hover:bg-accent group">
          <ChatBubbleLeftIcon class="h-5 w-5 text-muted-foreground group-hover:text-accent-foreground" />
        </button>
        <button @click="summarizeVideo"
          class="px-3 py-1.5 bg-primary text-primary-foreground font-semibold rounded-lg hover:bg-primary/90 flex items-center justify-center text-sm">
          <DocumentChartBarIcon class="h-5 w-5 mr-1" />
          <span>总结</span>
        </button>
      </div>
    </footer>
  </div>
</template>

<style scoped>
/* 美化滚动条 */
:deep(main::-webkit-scrollbar),
:deep(*::-webkit-scrollbar) {
  width: 8px;
  height: 8px;
}

:deep(main::-webkit-scrollbar-track),
:deep(*::-webkit-scrollbar-track) {
  background: hsl(var(--muted) / 0.5);
  border-radius: 4px;
}

:deep(main::-webkit-scrollbar-thumb),
:deep(*::-webkit-scrollbar-thumb) {
  background: hsl(var(--primary) / 0.5);
  border-radius: 4px;
  border: 2px solid transparent;
  background-clip: content-box;
}

:deep(main::-webkit-scrollbar-thumb:hover),
:deep(*::-webkit-scrollbar-thumb:hover) {
  background: hsl(var(--primary));
  background-clip: content-box;
}
</style>
